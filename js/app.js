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
                     src="${car.image}" 
                     alt="${car.brand} ${car.model}"
                     loading="lazy"
                     onerror="this.src='https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&h=400&fit=crop'">
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
        : car.dealLevel === 'good' ? 'var(--accent)' 
        : car.dealLevel === 'ok' ? 'var(--deal-good)' 
        : 'var(--text-muted)';
    
    const dealLabel = car.dealLevel === 'hot' ? '🔥 Супер-выгодная цена!'
        : car.dealLevel === 'good' ? '✅ Выгодное предложение'
        : car.dealLevel === 'ok' ? '👌 Неплохая цена'
        : '➖ Стандартная цена';
    
    content.innerHTML = `
        <img class="modal__image" 
             src="${car.image}" 
             alt="${car.brand} ${car.model}"
             onerror="this.src='https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&h=400&fit=crop'">
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
