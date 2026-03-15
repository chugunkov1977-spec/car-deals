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
            <div class="car-card__image-wrap">
                <img class="car-card__image" 
                     src="${generateCarSVG(car)}" 
                     alt="${car.brand} ${car.model}"
                     loading="lazy">
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
        <img class="modal__image" 
             src="${generateCarSVG(car)}" 
             alt="${car.brand} ${car.model}">
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

// ===== ГЕНЕРАТОР SVG-КАРТИНОК МАШИН =====

/**
 * Создаёт SVG-картинку с силуэтом машины и названием.
 * Силуэт зависит от типа кузова (седан, кроссовер, хэтчбек и т.д.)
 * Цвет фона уникален для каждой марки.
 */
function generateCarSVG(car) {
    // Уникальный цвет для каждой марки
    const brandColors = {
        'Toyota': ['#1a2744','#243656'], 'Kia': ['#1e3328','#27422f'],
        'Hyundai': ['#1a2040','#222c50'], 'Volkswagen': ['#1a2535','#203040'],
        'Skoda': ['#1a3020','#224020'], 'BMW': ['#2a1a30','#382240'],
        'Mercedes-Benz': ['#1a1a28','#252535'], 'Lada': ['#2a1a1a','#382222'],
        'Chery': ['#2a2018','#383020'], 'Haval': ['#182028','#202838'],
        'Geely': ['#1a2830','#203540'], 'Audi': ['#1a1a24','#282835'],
        'Mazda': ['#2a1520','#381a28'], 'Nissan': ['#1a2030','#222c40'],
        'Renault': ['#2a2a10','#383818'], 'Changan': ['#182535','#203545'],
        'Omoda': ['#201830','#2a2040'], 'Exeed': ['#201a28','#2a2235'],
    };
    const colors = brandColors[car.brand] || ['#1a2030','#253040'];
    
    // Силуэт по типу кузова
    const silhouettes = {
        'Седан': 'M60,130 L80,130 L95,105 L115,90 L200,88 L230,90 L260,105 L280,120 L340,125 L340,135 L320,140 C315,155 295,160 285,160 C275,160 265,150 260,140 L140,140 C135,155 115,160 105,160 C95,160 85,150 80,140 L60,140 Z',
        'Кроссовер': 'M55,135 L75,135 L90,105 L120,82 L200,78 L240,82 L270,100 L295,120 L345,125 L345,140 L325,145 C320,162 298,168 288,168 C278,168 265,155 260,145 L138,145 C133,162 112,168 102,168 C92,168 80,155 75,145 L55,145 Z',
        'Хэтчбек': 'M65,130 L85,130 L100,105 L125,90 L200,88 L235,90 L250,88 L280,100 L300,130 L340,132 L340,140 L315,145 C310,160 292,165 282,165 C272,165 260,152 255,142 L140,142 C135,157 117,162 107,162 C97,162 85,150 80,140 L65,140 Z',
        'Лифтбек': 'M60,130 L80,130 L95,105 L120,90 L200,88 L240,88 L270,95 L295,115 L340,128 L340,138 L318,142 C313,158 295,163 285,163 C275,163 263,150 258,140 L138,140 C133,155 115,160 105,160 C95,160 83,148 78,138 L60,138 Z',
        'Внедорожник': 'M50,138 L70,138 L85,108 L115,78 L200,74 L250,78 L280,98 L300,118 L350,124 L350,142 L328,148 C323,166 302,172 292,172 C282,172 268,158 263,148 L140,148 C135,166 114,172 104,172 C94,172 80,158 75,148 L50,148 Z',
        'Универсал': 'M60,130 L80,130 L95,105 L120,88 L200,85 L260,85 L280,85 L310,100 L340,125 L340,138 L320,142 C315,158 297,163 287,163 C277,163 265,150 260,140 L138,140 C133,155 115,160 105,160 C95,160 83,148 78,138 L60,138 Z',
    };
    const silhouette = silhouettes[car.body] || silhouettes['Седан'];
    
    // Генерируем линии дороги для атмосферы
    const svg = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colors[0]}"/>
      <stop offset="100%" stop-color="${colors[1]}"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.08)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>
  <rect width="400" height="200" fill="url(#bg)"/>
  <rect width="400" height="100" fill="url(#shine)"/>
  <line x1="0" y1="172" x2="400" y2="172" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <line x1="0" y1="180" x2="400" y2="180" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
  <path d="${silhouette}" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" stroke-width="1.2"/>
  <text x="200" y="38" text-anchor="middle" font-family="Georgia,serif" font-size="18" font-weight="600" fill="rgba(255,255,255,0.7)">${car.brand}</text>
  <text x="200" y="58" text-anchor="middle" font-family="sans-serif" font-size="13" fill="rgba(255,255,255,0.35)">${car.model} • ${car.year}</text>
</svg>`)}`;
    
    return svg;
}

