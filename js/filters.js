/**
 * FILTERS.JS — Фильтрация и сортировка объявлений
 * 
 * Что делает этот файл:
 * 1. Собирает значения из формы фильтров
 * 2. Фильтрует массив машин по выбранным параметрам
 * 3. Сортирует результаты
 */

const Filters = {
    
    /**
     * Применяет все фильтры к массиву машин
     * @param {Array} cars — все объявления (с аналитикой)
     * @returns {Array} — отфильтрованный и отсортированный массив
     */
    apply(cars) {
        const f = this.getValues();
        
        let result = cars.filter(car => {
            // Фильтр по марке
            if (f.brand && car.brand !== f.brand) return false;
            
            // Фильтр по году
            if (f.yearFrom && car.year < f.yearFrom) return false;
            if (f.yearTo && car.year > f.yearTo) return false;
            
            // Фильтр по цене
            if (f.priceFrom && car.price < f.priceFrom) return false;
            if (f.priceTo && car.price > f.priceTo) return false;
            
            // Фильтр по пробегу
            if (f.mileageTo && car.mileage > f.mileageTo) return false;
            
            // Фильтр по кузову
            if (f.body && car.body !== f.body) return false;
            
            // Фильтр по приводу
            if (f.drive && car.drive !== f.drive) return false;
            
            // Только выгодные
            if (f.dealsOnly && !car.isDeal) return false;
            
            return true;
        });
        
        // Сортировка
        result = this.sort(result, f.sortBy);
        
        return result;
    },
    
    /**
     * Собирает текущие значения фильтров
     */
    getValues() {
        return {
            brand: document.getElementById('filterBrand')?.value || '',
            yearFrom: parseInt(document.getElementById('filterYearFrom')?.value) || null,
            yearTo: parseInt(document.getElementById('filterYearTo')?.value) || null,
            priceFrom: parseInt(document.getElementById('filterPriceFrom')?.value) || null,
            priceTo: parseInt(document.getElementById('filterPriceTo')?.value) || null,
            mileageTo: parseInt(document.getElementById('filterMileageTo')?.value) || null,
            body: document.getElementById('filterBody')?.value || '',
            drive: document.getElementById('filterDrive')?.value || '',
            dealsOnly: document.getElementById('filterDealsOnly')?.checked || false,
            sortBy: document.getElementById('sortBy')?.value || 'deal_score'
        };
    },
    
    /**
     * Сортирует массив по выбранному критерию
     */
    sort(cars, sortBy) {
        const sorters = {
            'deal_score': (a, b) => b.dealScore - a.dealScore,
            'price_asc': (a, b) => a.price - b.price,
            'price_desc': (a, b) => b.price - a.price,
            'mileage_asc': (a, b) => a.mileage - b.mileage,
            'year_desc': (a, b) => b.year - a.year,
            'price_per_km': (a, b) => (a.pricePerKm || 99999) - (b.pricePerKm || 99999)
        };
        
        return [...cars].sort(sorters[sortBy] || sorters['deal_score']);
    },
    
    /**
     * Заполняет выпадающие списки уникальными значениями из данных
     */
    populateSelects(cars) {
        // Уникальные марки
        const brands = [...new Set(cars.map(c => c.brand))].sort();
        const brandSelect = document.getElementById('filterBrand');
        if (brandSelect) {
            brands.forEach(brand => {
                const opt = document.createElement('option');
                opt.value = brand;
                opt.textContent = brand;
                brandSelect.appendChild(opt);
            });
        }
        
        // Уникальные типы кузова
        const bodies = [...new Set(cars.map(c => c.body))].sort();
        const bodySelect = document.getElementById('filterBody');
        if (bodySelect) {
            bodies.forEach(body => {
                const opt = document.createElement('option');
                opt.value = body;
                opt.textContent = body;
                bodySelect.appendChild(opt);
            });
        }
    },
    
    /**
     * Сбрасывает все фильтры
     */
    reset() {
        document.getElementById('filterBrand').value = '';
        document.getElementById('filterYearFrom').value = '';
        document.getElementById('filterYearTo').value = '';
        document.getElementById('filterPriceFrom').value = '';
        document.getElementById('filterPriceTo').value = '';
        document.getElementById('filterMileageTo').value = '';
        document.getElementById('filterBody').value = '';
        document.getElementById('filterDrive').value = '';
        document.getElementById('filterDealsOnly').checked = false;
        document.getElementById('sortBy').value = 'deal_score';
    }
};
