/**
 * APP.JS — Главный файл приложения
 * 
 * Что делает этот файл:
 * 1. Загружает данные из cars.json
 * 2. Запускает анализ (analytics.js)
 * 3. Рисует карточки машин на странице
 * 4. Обрабатывает клики, фильтры, модальные окна
 */

// ===== СОСТОЯНИЕ ПРИЛОЖЕНИЯ =====
let allCars = [];       // Все машины (с аналитикой)
let filteredCars = [];  // После фильтров

// ===== ЗАПУСК =====
document.addEventListener('DOMContentLoaded', init);

async function init() {
    showSkeletons();
    
    try {
        // 1. Загружаем данные
        const response = await fetch('data/cars.json');
        if (!response.ok) throw new Error('Не удалось загрузить данные');
        const rawCars = await response.json();
        
        // 2. Анализируем выгодность
        allCars = Analytics.analyze(rawCars);
        
        // 3. Заполняем фильтры
        Filters.populateSelects(allCars);
        
        // 4. Первый рендер
        applyFiltersAndRender();
        
        // 5. Обновляем статистику
        updateStats();
        
        // 6. Подключаем события
        bindEvents();
        
    } catch (err) {
        console.error('Ошибка загрузки:', err);
        document.getElementById('carsGrid').innerHTML = `
            <div class="no-results">
                <span class="no-results__icon">⚠️</span>
                <p>Ошибка загрузки данных. Проверьте файл data/cars.json</p>
            </div>
        `;
    }
}

// ===== РЕНДЕР КАРТОЧЕК =====

function renderCars(cars) {
    const grid = document.getElementById('carsGrid');
    const noResults = document.getElementById('noResults');
    const resultsCount = document.getElementById('resultsCount');
    
    if (cars.length === 0) {
        grid.innerHTML = '';
        noResults.style.display = 'block';
        resultsCount.textContent = 'Ничего не найдено';
        return;
    }
    
    noResults.style.display = 'none';
    resultsCount.textContent = `Найдено: ${cars.length} ${pluralize(cars.length, 'объявление', 'объявления', 'объявлений')}`;
    
    grid.innerHTML = cars.map(car => createCarCard(car)).join('');
    
    // Добавляем клики на карточки
    grid.querySelectorAll('.car-card').forEach(card => {
        card.addEventListener('click', () => {
            const carId = card.dataset.id;
            const car = allCars.find(c => c.id === carId);
            if (car) openModal(car);
        });
    });
}

function createCarCard(car) {
    const dealClass = car.isDeal ? 'car-card--deal' : '';
    const pricePerKmText = car.pricePerKm 
        ? `${car.pricePerKm.toLocaleString('ru-RU')} ₽/1000км` 
        : '';
    
    // Бейджи
    let badges = '';
    if (car.dealLevel === 'hot') {
        badges += `<span class="badge badge--hot">🔥 Топ</span>`;
    } else if (car.isDeal) {
        badges += `<span class="badge badge--deal">✓ Выгодно</span>`;
    }
    
    const sourceColor = car.source === 'avito' ? 'Avito' : 'Auto.ru';
    badges += `<span class="badge badge--source">${sourceColor}</span>`;
    
    // Индикатор выгодности
    const scoreClass = `deal-score--${car.dealLevel}`;
    
    return `
        <article class="car-card ${dealClass}" data-id="${car.id}">
            <div class="car-card__image-wrap" style="background: linear-gradient(135deg, ${getBrandColors(car.brand)[0]}, ${getBrandColors(car.brand)[1]});">
                <img class="car-card__image" 
                     src="${getCarPhotoUrl(car)}" 
                     alt="${car.brand} ${car.model}"
                     loading="lazy"
                     onerror="this.onerror=null;this.src='${getCarImageFallbackUrl(car)}'">
                <div class="car-card__badges">${badges}</div>
                <div class="car-card__deal-indicator ${scoreClass}">${car.dealScore}</div>
            </div>
            <div class="car-card__body">
                <h3 class="car-card__title">${car.brand} ${car.model}</h3>
                <p class="car-card__subtitle">${car.year} • ${car.engine} • ${car.transmission} • ${car.body}</p>
                <div class="car-card__specs">
                    <div class="car-card__spec">
                        <span class="car-card__spec-label">Пробег</span>
                        <span class="car-card__spec-value">${Analytics.formatMileage(car.mileage)}</span>
                    </div>
                    <div class="car-card__spec">
                        <span class="car-card__spec-label">Мощность</span>
                        <span class="car-card__spec-value">${car.power} л.с.</span>
                    </div>
                    <div class="car-card__spec">
                        <span class="car-card__spec-label">Привод</span>
                        <span class="car-card__spec-value">${formatDrive(car.drive)}</span>
                    </div>
                    <div class="car-card__spec">
                        <span class="car-card__spec-label">₽/1000 км</span>
                        <span class="car-card__spec-value">${car.pricePerKm ? car.pricePerKm.toLocaleString('ru-RU') : '—'}</span>
                    </div>
                </div>
                <div class="car-card__footer">
                    <div>
                        <span class="car-card__price">${Analytics.formatPrice(car.price)}</span>
                        ${car.priceDeviation < 0 
                            ? `<div class="car-card__price-per-km" style="color: var(--accent);">${car.priceDeviation}% от средней</div>`
                            : ''
                        }
                    </div>
                    <span class="car-card__city">${car.city}</span>
                </div>
            </div>
        </article>
    `;
}

// ===== МОДАЛЬНОЕ ОКНО =====

function openModal(car) {
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    
    // Цвет полоски выгодности
    const barColor = car.dealLevel === 'hot' ? 'var(--deal-hot)' 
        : car.dealLevel === 'good' ? 'var(--gold)' 
        : car.dealLevel === 'ok' ? 'var(--deal-ok)' 
        : 'var(--text-muted)';
    
    const dealLabel = car.dealLevel === 'hot' ? '🔥 Супер-выгодная цена!'
        : car.dealLevel === 'good' ? '✅ Выгодное предложение'
        : car.dealLevel === 'ok' ? '👌 Неплохая цена'
        : '➖ Стандартная цена';
    
    content.innerHTML = `
        <div class="modal__image-wrap" style="background: linear-gradient(135deg, ${getBrandColors(car.brand)[0]}, ${getBrandColors(car.brand)[1]}); height: 320px; display:flex; align-items:center; justify-content:center; border-radius: var(--radius-lg) var(--radius-lg) 0 0; overflow:hidden;">
            <img class="modal__image" 
                 src="${getCarPhotoUrl(car)}" 
                 alt="${car.brand} ${car.model}"
                 style="max-height:100%; max-width:100%; object-fit:contain;"
                 onerror="this.onerror=null;this.src='${getCarImageFallbackUrl(car)}'">
        </div>
        <div class="modal__body">
            <h2 class="modal__title">${car.brand} ${car.model} ${car.year}</h2>
            <p class="modal__subtitle">${car.engine} • ${car.power} л.с. • ${car.transmission} • ${formatDrive(car.drive)} • ${car.color}</p>
            
            <div class="modal__price-row">
                <span class="modal__price">${Analytics.formatPrice(car.price)}</span>
                ${car.avgPrice 
                    ? `<span class="modal__avg-price">Средняя: <span>${Analytics.formatPrice(car.avgPrice)}</span></span>` 
                    : ''
                }
            </div>
            
            <div class="modal__deal-bar">
                <div class="deal-bar__header">
                    <span class="deal-bar__label">${dealLabel}</span>
                    <span class="deal-bar__value" style="color: ${barColor}">Индекс: ${car.dealScore}/100</span>
                </div>
                <div class="deal-bar__track">
                    <div class="deal-bar__fill" style="width: ${car.dealScore}%; background: ${barColor};"></div>
                </div>
            </div>
            
            <div class="modal__specs-grid">
                <div class="modal__spec">
                    <div class="modal__spec-value">${Analytics.formatMileage(car.mileage)}</div>
                    <div class="modal__spec-label">Пробег</div>
                </div>
                <div class="modal__spec">
                    <div class="modal__spec-value">${car.power} л.с.</div>
                    <div class="modal__spec-label">Мощность</div>
                </div>
                <div class="modal__spec">
                    <div class="modal__spec-value">${car.pricePerKm ? car.pricePerKm.toLocaleString('ru-RU') + ' ₽' : '—'}</div>
                    <div class="modal__spec-label">За 1000 км</div>
                </div>
                <div class="modal__spec">
                    <div class="modal__spec-value">${car.body}</div>
                    <div class="modal__spec-label">Кузов</div>
                </div>
                <div class="modal__spec">
                    <div class="modal__spec-value">${formatDrive(car.drive)}</div>
                    <div class="modal__spec-label">Привод</div>
                </div>
                <div class="modal__spec">
                    <div class="modal__spec-value">${car.city}</div>
                    <div class="modal__spec-label">Город</div>
                </div>
            </div>
            
            ${car.description ? `<div class="modal__description">${car.description}</div>` : ''}
            
            ${car.priceDeviation < 0 
                ? `<div class="modal__description" style="border-left: 3px solid var(--accent); color: var(--accent);">
                    📊 Цена на <strong>${Math.abs(car.priceDeviation)}%</strong> ниже средней для ${car.brand} ${car.model}
                   </div>` 
                : ''
            }
            
            <div class="modal__actions">
                <a href="${car.source_url}" target="_blank" rel="noopener" class="btn--primary">
                    Открыть на ${car.source === 'avito' ? 'Avito' : 'Auto.ru'} →
                </a>
            </div>
        </div>
    `;
    
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    document.body.style.overflow = '';
}

// ===== СТАТИСТИКА =====

function updateStats() {
    const stats = Analytics.getStats(allCars);
    
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statDeals').textContent = stats.deals;
    document.getElementById('statAvgPrice').textContent = formatShortPrice(stats.avgPrice);
    
    if (stats.bestDeal) {
        document.getElementById('statBestDeal').textContent = 
            `${stats.bestDeal.brand} ${stats.bestDeal.model}`;
    }
}

// ===== СОБЫТИЯ =====

function bindEvents() {
    // Переключение фильтров
    const toggle = document.getElementById('filtersToggle');
    const panel = document.getElementById('filtersPanel');
    toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        panel.classList.toggle('open');
    });
    
    // Все input/select фильтров — при изменении перерисовываем
    const filterInputs = document.querySelectorAll(
        '#filterBrand, #filterYearFrom, #filterYearTo, #filterPriceFrom, #filterPriceTo, #filterMileageTo, #filterBody, #filterDrive, #filterDealsOnly, #sortBy'
    );
    filterInputs.forEach(input => {
        input.addEventListener('change', applyFiltersAndRender);
        if (input.type === 'number') {
            input.addEventListener('input', debounce(applyFiltersAndRender, 400));
        }
    });
    
    // Сброс фильтров
    document.getElementById('resetFilters').addEventListener('click', () => {
        Filters.reset();
        applyFiltersAndRender();
    });
    
    // Модальное окно — закрытие
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function applyFiltersAndRender() {
    filteredCars = Filters.apply(allCars);
    renderCars(filteredCars);
}

// ===== СКЕЛЕТОНЫ (заглушки при загрузке) =====

function showSkeletons() {
    const grid = document.getElementById('carsGrid');
    grid.innerHTML = Array(6).fill('<div class="skeleton"></div>').join('');
}

// ===== УТИЛИТЫ =====

function formatDrive(drive) {
    const map = { 'FWD': 'Передний', 'RWD': 'Задний', 'AWD': 'Полный' };
    return map[drive] || drive;
}

function formatShortPrice(price) {
    if (price >= 1000000) return (price / 1000000).toFixed(1) + ' млн ₽';
    if (price >= 1000) return Math.round(price / 1000) + ' тыс ₽';
    return price + ' ₽';
}

function pluralize(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 19) return many;
    if (mod10 === 1) return one;
    if (mod10 >= 2 && mod10 <= 4) return few;
    return many;
}

function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// ===== ФОТО МАШИН =====

/**
 * Возвращает URL фото машины.
 * Сначала пробуем локальную картинку images/cars/<brand>_<model>.png,
 * затем используем изображение из JSON (`car.image`),
 * иначе генерируем красивый SVG (fallback).
 */
function getCarPhotoUrl(car) {
    const key = `${car.brand}_${car.model}`.replace(/\s+/g, '_');
    return `images/cars/${key}.png`;
}

function getCarImageFallbackUrl(car) {
    return car.image || 'images/cars/Toyota_Camry.png';
}

/**
 * Возвращает пару цветов [dark, light] для фона карточки по марке
 */
function getBrandColors(brand) {
    const brandColors = {
        'Toyota': ['#0d1b2a','#1b2d44'], 'Kia': ['#0d2018','#1a3328'],
        'Hyundai': ['#0d1530','#1a2545'], 'Volkswagen': ['#0d1a28','#1a2838'],
        'Skoda': ['#0d2010','#1a3520'], 'BMW': ['#1a0d25','#2a1a38'],
        'Mercedes-Benz': ['#0d0d1a','#1a1a2a'], 'Lada': ['#1a0d0d','#2a1818'],
        'Chery': ['#1a150d','#2a2518'], 'Haval': ['#0d1520','#1a2230'],
        'Geely': ['#0d1a20','#1a2a35'], 'Audi': ['#0d0d18','#1a1a28'],
        'Mazda': ['#1a0a15','#2a1525'], 'Nissan': ['#0d1525','#1a2238'],
        'Renault': ['#1a1a08','#2a2a15'], 'Changan': ['#0d1a28','#1a2a3a'],
        'Omoda': ['#150d22','#221a32'], 'Exeed': ['#150d1a','#221a28'],
    };
    return brandColors[brand] || ['#0d1525','#1a2538'];
}

// ===== ГЕНЕРАТОР SVG-КАРТИНОК МАШИН (FALLBACK) =====

/**
 * Создаёт стильную SVG-картинку с силуэтом машины.
 * Каждая марка имеет свой цвет, каждый кузов — свой силуэт.
 * Результат выглядит как дизайнерская иллюстрация, не как заглушка.
 */
function generateCarSVG(car) {
    const colors = getBrandColors(car.brand);
    
    // Детализированные силуэты по типу кузова
    const silhouettes = {
        'Седан': {
            body: 'M45,128 C45,128 55,128 65,126 L82,108 C90,98 100,90 115,86 L195,84 C210,84 225,86 235,90 L255,104 L275,118 C280,122 285,124 330,126 L335,130 L335,138 L318,140 C316,148 310,156 300,158 C290,160 280,156 274,148 L270,140 L135,140 L131,148 C125,156 115,160 105,158 C95,156 89,148 87,140 L45,140 Z',
            wheels: [{cx:105,cy:148},{cx:300,cy:148}],
            windows: 'M88,108 L108,88 L188,86 L188,106 Z M194,86 L230,88 L252,106 L194,106 Z',
            details: 'M65,126 L275,122 M110,86 L110,106 M188,86 L188,106'
        },
        'Кроссовер': {
            body: 'M40,128 C40,128 50,126 60,124 L78,100 C88,86 100,78 118,74 L198,72 C215,72 230,76 242,84 L265,102 L288,118 C293,122 298,124 338,126 L342,130 L342,142 L322,144 C320,154 312,162 302,164 C292,166 282,160 276,152 L272,144 L132,144 L128,152 C122,160 112,164 102,162 C92,160 84,154 82,144 L40,142 Z',
            wheels: [{cx:102,cy:154},{cx:302,cy:154}],
            windows: 'M84,102 L106,78 L192,76 L192,100 Z M198,76 L236,80 L262,100 L198,100 Z',
            details: 'M60,124 L288,120 M115,76 L115,100 M192,76 L192,100'
        },
        'Хэтчбек': {
            body: 'M50,128 C50,128 60,126 70,124 L88,106 C96,96 108,88 122,86 L200,84 C215,84 228,84 238,86 L268,96 L295,118 C298,122 332,124 335,126 L335,130 L335,138 L316,140 C314,148 308,156 298,158 C288,160 278,156 272,148 L268,140 L135,140 L131,148 C125,156 115,160 105,158 C95,156 89,148 87,140 L50,140 Z',
            wheels: [{cx:105,cy:148},{cx:298,cy:148}],
            windows: 'M94,106 L116,88 L195,86 L195,104 Z M200,86 L234,86 L265,98 L200,104 Z',
            details: 'M70,124 L295,120 M118,86 L118,104 M195,86 L195,104'
        },
        'Лифтбек': {
            body: 'M48,128 C48,128 58,126 68,124 L85,106 C94,96 106,88 120,86 L198,84 C215,84 232,84 245,88 L270,96 L298,118 C302,122 334,124 336,126 L336,130 L336,138 L318,140 C316,148 310,156 300,158 C290,160 280,156 274,148 L270,140 L135,140 L131,148 C125,156 115,160 105,158 C95,156 89,148 87,140 L48,140 Z',
            wheels: [{cx:105,cy:148},{cx:300,cy:148}],
            windows: 'M91,106 L114,88 L192,86 L192,104 Z M198,86 L240,86 L266,98 L198,104 Z',
            details: 'M68,124 L298,120 M116,86 L116,104 M192,86 L192,104'
        },
        'Внедорожник': {
            body: 'M35,130 C35,130 45,128 55,124 L75,96 C86,82 98,72 118,68 L200,66 C218,66 235,70 248,80 L272,98 L295,116 C300,120 305,122 345,126 L348,130 L348,146 L326,148 C324,158 316,168 306,170 C296,172 286,166 280,158 L276,148 L134,148 L130,158 C124,166 114,170 104,168 C94,166 86,158 84,148 L35,146 Z',
            wheels: [{cx:104,cy:160},{cx:306,cy:160}],
            windows: 'M82,98 L108,74 L194,72 L194,96 Z M200,72 L242,76 L268,96 L200,96 Z',
            details: 'M55,124 L295,120 M114,72 L114,96 M194,72 L194,96'
        },
        'Универсал': {
            body: 'M45,128 C45,128 55,128 65,126 L82,108 C90,98 100,90 115,86 L195,84 C210,84 240,84 260,84 L290,90 L315,110 C320,116 330,122 335,126 L335,130 L335,138 L318,140 C316,148 310,156 300,158 C290,160 280,156 274,148 L270,140 L135,140 L131,148 C125,156 115,160 105,158 C95,156 89,148 87,140 L45,140 Z',
            wheels: [{cx:105,cy:148},{cx:300,cy:148}],
            windows: 'M88,108 L108,88 L188,86 L188,106 Z M194,86 L255,84 L288,92 L194,106 Z',
            details: 'M65,126 L315,114 M110,86 L110,106 M188,86 L188,106'
        }
    };
    
    const s = silhouettes[car.body] || silhouettes['Седан'];
    
    // Генерируем цвета для деталей
    const bodyFill = 'rgba(255,255,255,0.08)';
    const bodyStroke = 'rgba(255,255,255,0.25)';
    const windowFill = 'rgba(120,180,255,0.12)';
    const windowStroke = 'rgba(120,180,255,0.2)';
    const detailStroke = 'rgba(255,255,255,0.06)';
    const wheelFill = 'rgba(0,0,0,0.3)';
    const wheelStroke = 'rgba(255,255,255,0.15)';
    const hubFill = 'rgba(255,255,255,0.08)';
    
    // Декоративные элементы: блик фары, отражение
    const headlight = s.wheels[1] ? `<ellipse cx="${s.wheels[1].cx + 38}" cy="${s.wheels[1].cy - 28}" rx="4" ry="3" fill="rgba(255,220,120,0.5)"/>` : '';
    const taillight = s.wheels[0] ? `<rect x="${s.wheels[0].cx - 55}" y="${s.wheels[0].cy - 24}" width="6" height="4" rx="1" fill="rgba(255,50,50,0.4)"/>` : '';

    const wheelsHtml = s.wheels.map(w => `
        <circle cx="${w.cx}" cy="${w.cy}" r="16" fill="${wheelFill}" stroke="${wheelStroke}" stroke-width="1.5"/>
        <circle cx="${w.cx}" cy="${w.cy}" r="9" fill="${hubFill}" stroke="${wheelStroke}" stroke-width="0.8"/>
        <circle cx="${w.cx}" cy="${w.cy}" r="4" fill="rgba(255,255,255,0.05)"/>
    `).join('');
    
    const svg = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colors[0]}"/>
      <stop offset="100%" stop-color="${colors[1]}"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.04)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.02)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>
  <rect width="400" height="200" fill="url(#bg)"/>
  <rect width="400" height="90" fill="url(#shine)"/>
  <rect y="165" width="400" height="35" fill="url(#ground)"/>
  <line x1="0" y1="168" x2="400" y2="168" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>
  <path d="${s.body}" fill="${bodyFill}" stroke="${bodyStroke}" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="${s.windows}" fill="${windowFill}" stroke="${windowStroke}" stroke-width="0.8"/>
  <path d="${s.details}" fill="none" stroke="${detailStroke}" stroke-width="0.5"/>
  ${wheelsHtml}
  ${headlight}
  ${taillight}
  <text x="200" y="30" text-anchor="middle" font-family="Georgia,serif" font-size="20" font-weight="700" fill="rgba(255,255,255,0.6)" letter-spacing="1">${car.brand}</text>
  <text x="200" y="48" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="300" fill="rgba(255,255,255,0.25)" letter-spacing="2">${car.model} · ${car.year}</text>
</svg>`)}`;
    
    return svg;
}

