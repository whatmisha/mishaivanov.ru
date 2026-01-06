/**
 * RangeSliderController - Контроллер для range-слайдеров с двумя ручками
 * Управляет диапазоном значений (min и max) на одном визуальном слайдере
 */
export class RangeSliderController {
    constructor(settings) {
        this.settings = settings;
        this.ranges = new Map();
    }

    /**
     * Инициализация range-слайдера
     * @param {string} containerId - ID контейнера для range-слайдера
     * @param {Object} config - Конфигурация
     * @param {string} config.minSetting - Название настройки для минимального значения
     * @param {string} config.maxSetting - Название настройки для максимального значения
     * @param {number} config.min - Минимальное значение диапазона
     * @param {number} config.max - Максимальное значение диапазона
     * @param {number} config.decimals - Количество знаков после запятой
     * @param {number} config.baseStep - Базовый шаг
     * @param {number} config.shiftStep - Шаг при зажатом Shift
     * @param {Function} config.onUpdate - Коллбэк при изменении значений
     */
    initRangeSlider(containerId, config) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Range slider container not found: ${containerId}`);
            return;
        }

        // Создаем структуру HTML для range-слайдера
        const track = document.createElement('div');
        track.className = 'range-slider-track';
        
        const minThumb = document.createElement('div');
        minThumb.className = 'range-slider-thumb range-slider-thumb-min';
        minThumb.setAttribute('role', 'slider');
        minThumb.setAttribute('tabindex', '0');
        minThumb.setAttribute('aria-valuemin', config.min);
        minThumb.setAttribute('aria-valuemax', config.max);
        
        const maxThumb = document.createElement('div');
        maxThumb.className = 'range-slider-thumb range-slider-thumb-max';
        maxThumb.setAttribute('role', 'slider');
        maxThumb.setAttribute('tabindex', '0');
        maxThumb.setAttribute('aria-valuemin', config.min);
        maxThumb.setAttribute('aria-valuemax', config.max);
        
        const activeRange = document.createElement('div');
        activeRange.className = 'range-slider-active';
        
        track.appendChild(activeRange);
        track.appendChild(minThumb);
        track.appendChild(maxThumb);
        container.appendChild(track);

        // Получаем начальные значения
        let minValue = this.settings.get(config.minSetting);
        let maxValue = this.settings.get(config.maxSetting);
        
        // Валидация и нормализация
        minValue = this.clamp(minValue, config.min, config.max);
        maxValue = this.clamp(maxValue, config.min, config.max);
        if (minValue > maxValue) {
            [minValue, maxValue] = [maxValue, minValue];
        }

        this.ranges.set(containerId, {
            container,
            track,
            minThumb,
            maxThumb,
            activeRange,
            config,
            minValue,
            maxValue,
            isDragging: false,
            dragTarget: null
        });

        // Инициализация позиций
        this.updatePositions(containerId);
        
        // Обновление текстовых полей при инициализации
        const minValueDisplay = document.getElementById(config.minValueId);
        const maxValueDisplay = document.getElementById(config.maxValueId);
        
        if (minValueDisplay) {
            minValueDisplay.value = minValue.toFixed(config.decimals);
        }
        if (maxValueDisplay) {
            maxValueDisplay.value = maxValue.toFixed(config.decimals);
        }

        // Обработчики событий для min thumb
        this.setupThumbEvents(containerId, 'min');
        
        // Обработчики событий для max thumb
        this.setupThumbEvents(containerId, 'max');

        // Обработчики для клавиатуры
        this.setupKeyboardEvents(containerId, 'min');
        this.setupKeyboardEvents(containerId, 'max');
    }

    /**
     * Настройка событий для thumb
     */
    setupThumbEvents(containerId, type) {
        const rangeData = this.ranges.get(containerId);
        if (!rangeData) return;

        const thumb = type === 'min' ? rangeData.minThumb : rangeData.maxThumb;
        const track = rangeData.track;

        let isDragging = false;
        let startX = 0;
        let startMin = 0;
        let startMax = 0;

        const handleMouseDown = (e) => {
            e.preventDefault();
            isDragging = true;
            rangeData.isDragging = true;
            rangeData.dragTarget = type;
            startX = e.clientX;
            startMin = rangeData.minValue;
            startMax = rangeData.maxValue;
            thumb.style.cursor = 'grabbing';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        };

        const handleMouseMove = (e) => {
            if (!isDragging) return;

            const rect = track.getBoundingClientRect();
            const percent = this.clamp((e.clientX - rect.left) / rect.width, 0, 1);
            const newValue = rangeData.config.min + percent * (rangeData.config.max - rangeData.config.min);
            
            if (type === 'min') {
                const clampedValue = this.clamp(newValue, rangeData.config.min, rangeData.maxValue);
                rangeData.minValue = this.roundToStep(clampedValue, rangeData.config.baseStep);
            } else {
                const clampedValue = this.clamp(newValue, rangeData.minValue, rangeData.config.max);
                rangeData.maxValue = this.roundToStep(clampedValue, rangeData.config.baseStep);
            }

            this.updatePositions(containerId);
            this.updateSettings(containerId);
        };

        const handleMouseUp = () => {
            isDragging = false;
            rangeData.isDragging = false;
            rangeData.dragTarget = null;
            thumb.style.cursor = 'grab';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        thumb.addEventListener('mousedown', handleMouseDown);
        thumb.style.cursor = 'grab';
    }

    /**
     * Настройка клавиатурных событий
     */
    setupKeyboardEvents(containerId, type) {
        const rangeData = this.ranges.get(containerId);
        if (!rangeData) return;

        const thumb = type === 'min' ? rangeData.minThumb : rangeData.maxThumb;

        thumb.addEventListener('keydown', (e) => {
            const step = e.shiftKey && rangeData.config.shiftStep > 0 
                ? rangeData.config.shiftStep 
                : rangeData.config.baseStep;
            
            let newValue = type === 'min' ? rangeData.minValue : rangeData.maxValue;

            switch (e.key) {
                case 'ArrowRight':
                case 'ArrowUp':
                    newValue += step;
                    break;
                case 'ArrowLeft':
                case 'ArrowDown':
                    newValue -= step;
                    break;
                case 'Home':
                    newValue = type === 'min' ? rangeData.config.min : rangeData.minValue;
                    break;
                case 'End':
                    newValue = type === 'min' ? rangeData.maxValue : rangeData.config.max;
                    break;
                default:
                    return;
            }

            e.preventDefault();

            // Валидация
            if (type === 'min') {
                newValue = this.clamp(newValue, rangeData.config.min, rangeData.maxValue);
            } else {
                newValue = this.clamp(newValue, rangeData.minValue, rangeData.config.max);
            }

            newValue = this.roundToStep(newValue, step);

            if (type === 'min') {
                rangeData.minValue = newValue;
            } else {
                rangeData.maxValue = newValue;
            }

            this.updatePositions(containerId);
            this.updateSettings(containerId);
        });
    }

    /**
     * Обновление позиций thumb'ов и активной области
     */
    updatePositions(containerId) {
        const rangeData = this.ranges.get(containerId);
        if (!rangeData) return;

        const { config, minValue, maxValue, track, minThumb, maxThumb, activeRange } = rangeData;
        
        const range = config.max - config.min;
        const minPercent = ((minValue - config.min) / range) * 100;
        const maxPercent = ((maxValue - config.min) / range) * 100;

        minThumb.style.left = `${minPercent}%`;
        maxThumb.style.left = `${maxPercent}%`;
        activeRange.style.left = `${minPercent}%`;
        activeRange.style.width = `${maxPercent - minPercent}%`;

        // Обновление aria-атрибутов
        minThumb.setAttribute('aria-valuenow', minValue.toFixed(config.decimals));
        maxThumb.setAttribute('aria-valuenow', maxValue.toFixed(config.decimals));
    }

    /**
     * Обновление настроек и вызов коллбэка
     */
    updateSettings(containerId) {
        const rangeData = this.ranges.get(containerId);
        if (!rangeData) return;

        this.settings.set(rangeData.config.minSetting, rangeData.minValue);
        this.settings.set(rangeData.config.maxSetting, rangeData.maxValue);

        // Обновление отображаемых значений
        const minValueDisplay = document.getElementById(rangeData.config.minValueId);
        const maxValueDisplay = document.getElementById(rangeData.config.maxValueId);
        
        if (minValueDisplay) {
            minValueDisplay.value = rangeData.minValue.toFixed(rangeData.config.decimals);
        }
        if (maxValueDisplay) {
            maxValueDisplay.value = rangeData.maxValue.toFixed(rangeData.config.decimals);
        }

        // Вызов коллбэка
        if (rangeData.config.onUpdate) {
            rangeData.config.onUpdate(rangeData.minValue, rangeData.maxValue);
        }
    }

    /**
     * Установка значений программно
     */
    setValues(containerId, minValue, maxValue, triggerCallback = true) {
        const rangeData = this.ranges.get(containerId);
        if (!rangeData) return;

        // Валидация
        minValue = this.clamp(minValue, rangeData.config.min, rangeData.config.max);
        maxValue = this.clamp(maxValue, rangeData.config.min, rangeData.config.max);
        
        if (minValue > maxValue) {
            [minValue, maxValue] = [maxValue, minValue];
        }

        rangeData.minValue = minValue;
        rangeData.maxValue = maxValue;

        this.updatePositions(containerId);
        
        if (triggerCallback) {
            this.updateSettings(containerId);
        } else {
            // Обновляем только настройки без вызова коллбэка
            this.settings.set(rangeData.config.minSetting, minValue);
            this.settings.set(rangeData.config.maxSetting, maxValue);
            
            const minValueDisplay = document.getElementById(rangeData.config.minValueId);
            const maxValueDisplay = document.getElementById(rangeData.config.maxValueId);
            
            if (minValueDisplay) {
                minValueDisplay.value = minValue.toFixed(rangeData.config.decimals);
            }
            if (maxValueDisplay) {
                maxValueDisplay.value = maxValue.toFixed(rangeData.config.decimals);
            }
        }
    }

    /**
     * Получение значений
     */
    getValues(containerId) {
        const rangeData = this.ranges.get(containerId);
        if (!rangeData) return null;

        return {
            min: rangeData.minValue,
            max: rangeData.maxValue
        };
    }

    /**
     * Вспомогательные функции
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    roundToStep(value, step) {
        if (step <= 0) return value;
        return Math.round(value / step) * step;
    }
}

