/**
 * ANALYTICS.JS — Анализ выгодности объявлений
 * 
 * Что делает этот файл:
 * 1. Считает среднюю цену для каждой марки/модели/года
 * 2. Считает "стоимость за 1000 км" для каждой машины
 * 3. Сравнивает каждое объявление с аналогами
 * 4. Присваивает "индекс выгодности" (deal score) от 0 до 100
 */

const Analytics = {
    
    // Средние цены по группам (рассчитываются автоматически)
    averages: {},
    
    /**
     * Главная функция — анализирует все объявления и добавляет оценки
     * @param {Array} cars — массив объявлений из cars.json
     * @returns {Array} — тот же массив, но с добавленными полями аналитики
     */
    analyze(cars) {
        // Шаг 1: Считаем средние цены по группам
        this.calculateAverages(cars);
        
        // Шаг 2: Для каждой машины считаем показатели
        cars.forEach(car => {
            // Ключ группы: Марка + Модель (без учёта года, чтобы было больше данных)
            const groupKey = `${car.brand}_${car.model}`;
            const avg = this.averages[groupKey];
            
            // --- Отклонение цены от средней (%) ---
            // Если цена 1.5 млн, а средняя 2 млн → отклонение -25% (выгодно!)
            car.priceDeviation = avg 
                ? ((car.price - avg.avgPrice) / avg.avgPrice * 100).toFixed(1)
                : 0;
            
            // --- Стоимость за 1000 км ---
            // Чем меньше — тем выгоднее
            car.pricePerKm = car.mileage > 0 
                ? Math.round(car.price / (car.mileage / 1000))
                : null;
            
            // --- Средняя стоимость за 1000 км в группе ---
            car.avgPricePerKm = avg ? avg.avgPricePerKm : null;
            
            // --- Средняя цена в группе ---
            car.avgPrice = avg ? avg.avgPrice : null;
            
            // --- Индекс выгодности (0-100) ---
            car.dealScore = this.calculateDealScore(car);
            
            // --- Уровень выгодности ---
            if (car.dealScore >= 80) car.dealLevel = 'hot';       // 🔥 Супер-выгодно
            else if (car.dealScore >= 60) car.dealLevel = 'good';  // ✅ Выгодно
            else if (car.dealScore >= 40) car.dealLevel = 'ok';    // 👌 Нормально
            else car.dealLevel = 'normal';                          // ➖ Обычная цена
            
            // --- Является ли выгодной сделкой ---
            car.isDeal = car.dealScore >= 55;
        });
        
        return cars;
    },
    
    /**
     * Считает средние показатели по группам (марка + модель)
     */
    calculateAverages(cars) {
        const groups = {};
        
        // Группируем машины
        cars.forEach(car => {
            const key = `${car.brand}_${car.model}`;
            if (!groups[key]) {
                groups[key] = { prices: [], pricesPerKm: [], years: [] };
            }
            groups[key].prices.push(car.price);
            groups[key].years.push(car.year);
            if (car.mileage > 0) {
                groups[key].pricesPerKm.push(car.price / (car.mileage / 1000));
            }
        });
        
        // Считаем средние
        for (const [key, group] of Object.entries(groups)) {
            const avgPrice = Math.round(
                group.prices.reduce((a, b) => a + b, 0) / group.prices.length
            );
            const avgPricePerKm = group.pricesPerKm.length > 0
                ? Math.round(group.pricesPerKm.reduce((a, b) => a + b, 0) / group.pricesPerKm.length)
                : null;
            
            this.averages[key] = {
                avgPrice,
                avgPricePerKm,
                count: group.prices.length,
                minPrice: Math.min(...group.prices),
                maxPrice: Math.max(...group.prices)
            };
        }
    },
    
    /**
     * Считает индекс выгодности от 0 до 100
     * 
     * Формула учитывает:
     * - Отклонение цены от средней (вес 60%)
     * - Соотношение цена/пробег vs среднее (вес 40%)
     */
    calculateDealScore(car) {
        let score = 50; // Базовый балл — «средняя» сделка
        
        // --- Фактор 1: Цена ниже средней (до +30 баллов) ---
        if (car.priceDeviation && car.priceDeviation < 0) {
            const priceBonus = Math.min(30, Math.abs(car.priceDeviation) * 1.2);
            score += priceBonus;
        } else if (car.priceDeviation > 0) {
            const pricePenalty = Math.min(25, car.priceDeviation * 0.8);
            score -= pricePenalty;
        }
        
        // --- Фактор 2: Цена за км лучше средней (до +15 баллов) ---
        if (car.pricePerKm && car.avgPricePerKm) {
            const kmRatio = car.pricePerKm / car.avgPricePerKm;
            if (kmRatio < 1) {
                const kmBonus = Math.min(15, (1 - kmRatio) * 50);
                score += kmBonus;
            } else {
                const kmPenalty = Math.min(15, (kmRatio - 1) * 30);
                score -= kmPenalty;
            }
        }
        
        // --- Фактор 3: Абсолютная цена за 1000 км (до +10 баллов) ---
        // Хорошим считается < 30 000 ₽ за 1000 км
        if (car.pricePerKm) {
            if (car.pricePerKm < 20000) score += 10;
            else if (car.pricePerKm < 30000) score += 7;
            else if (car.pricePerKm < 40000) score += 3;
            else if (car.pricePerKm > 80000) score -= 5;
        }
        
        // --- Фактор 4: Свежесть (до +5 баллов) ---
        // Новые машины с маленьким пробегом — бонус
        const currentYear = new Date().getFullYear();
        const age = currentYear - car.year;
        if (age <= 1 && car.mileage < 20000) score += 5;
        else if (age <= 2 && car.mileage < 40000) score += 3;
        else if (age >= 5 && car.mileage > 100000) score -= 3;
        
        // Ограничиваем диапазон 0-100
        return Math.max(0, Math.min(100, Math.round(score)));
    },
    
    /**
     * Возвращает статистику для шапки сайта
     */
    getStats(cars) {
        const deals = cars.filter(c => c.isDeal);
        const prices = cars.map(c => c.price);
        const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
        
        // Лучшая сделка — машина с максимальным deal score
        const bestDeal = cars.reduce((best, car) => 
            car.dealScore > (best?.dealScore || 0) ? car : best
        , null);
        
        return {
            total: cars.length,
            deals: deals.length,
            avgPrice,
            bestDeal
        };
    },
    
    /**
     * Форматирует цену красиво: 1 850 000 ₽
     */
    formatPrice(price) {
        return price.toLocaleString('ru-RU') + ' ₽';
    },
    
    /**
     * Форматирует пробег: 45 000 км
     */
    formatMileage(km) {
        return km.toLocaleString('ru-RU') + ' км';
    }
};
