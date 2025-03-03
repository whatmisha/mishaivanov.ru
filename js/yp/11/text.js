document.addEventListener('DOMContentLoaded', function() {
    // ================ НАСТРОЙКИ И ПЕРЕМЕННЫЕ ================
    // Размер холста
    const CANVAS_SIZE = 1080;
    
    // Холст
    const textCanvas = document.getElementById('textCanvas');
    const textCtx = textCanvas.getContext('2d');
    
    // Элементы управления
    const textSizeSlider = document.getElementById('textSizeSlider');
    const textSizeInput = document.getElementById('textSizeInput');
    const textStrokeSlider = document.getElementById('textStrokeSlider');
    const textStrokeInput = document.getElementById('textStrokeInput');
    const textInput = document.getElementById('textInput');
    const textExportSVG = document.getElementById('textExportSVG');
    
    // Состояние
    const state = {
        fontSize: 72,
        strokeWidth: 3.75,
        fontLoaded: false,
        text: "Yandex Practicum"
    };
    
    // ================ ФУНКЦИИ ================
    
    // Синхронизация слайдеров и полей ввода
    function syncInputs(slider, input, callback) {
        slider.addEventListener('input', () => {
            input.value = slider.value;
            if (callback) callback();
        });
        
        input.addEventListener('input', () => {
            let value = parseFloat(input.value);
            const min = parseFloat(input.min) || 0;
            const max = parseFloat(input.max) || 100;
            const step = parseFloat(input.step) || 1;
            
            // Ограничиваем значение минимумом и максимумом
            value = Math.max(min, Math.min(max, value));
            
            // Округляем до ближайшего шага
            value = Math.round(value / step) * step;
            
            input.value = value;
            slider.value = value;
            
            if (callback) callback();
        });
    }
    
    // Загрузка шрифта
    function loadFont() {
        try {
            // Создаем элемент стиля для загрузки шрифта через CSS
            const styleElement = document.createElement('style');
            styleElement.textContent = `
                @font-face {
                    font-family: 'Yandex Sans';
                    src: url('fonts/YandexSans.ttf') format('truetype-variations');
                    font-weight: 0;
                    font-style: normal;
                    font-display: swap;
                    font-variation-settings: 'wght' 0;
                }
                
                canvas {
                    font-variation-settings: 'wght' 0;
                }
            `;
            document.head.appendChild(styleElement);
            
            // Загружаем шрифт с помощью opentype.js для преобразования текста в path
            if (typeof opentype !== 'undefined') {
                opentype.load('fonts/YandexSans.ttf', function(err, font) {
                    if (err) {
                        console.error('Ошибка загрузки шрифта через opentype.js:', err);
                        // Продолжаем без opentype
                        state.fontLoaded = true;
                        renderTextFrame();
                    } else {
                        // Сохраняем шрифт в state для использования при генерации SVG
                        state.font = font;
                        state.fontLoaded = true;
                        renderTextFrame();
                    }
                });
            } else {
                // Если opentype.js не загружен, используем обычный подход
                setTimeout(() => {
                    state.fontLoaded = true;
                    renderTextFrame();
                }, 100);
            }
        } catch (error) {
            console.error('Ошибка загрузки шрифта:', error);
            // Используем запасной вариант
            state.fontLoaded = true;
            renderTextFrame();
        }
    }
    
    // Рендеринг текста
    function renderTextFrame() {
        if (!document.getElementById('text-content').classList.contains('active')) {
            return;
        }
        
        // Получаем размеры контейнера
        const container = document.querySelector('#text-content .container');
        const containerRect = container.getBoundingClientRect();
        
        // Используем размеры канваса
        const width = Math.round(containerRect.width);
        const height = Math.round(containerRect.height);
        
        // Очищаем канвас
        textCanvas.width = width;
        textCanvas.height = height;
        
        // Рисуем черный фон
        textCtx.fillStyle = 'black';
        textCtx.fillRect(0, 0, width, height);
        
        // Если шрифт загружен, рисуем текст
        if (state.fontLoaded) {
            // Используем значения из состояния
            const fontSize = state.fontSize;
            const strokeWidth = state.strokeWidth;
            
            // Настраиваем шрифт с вариативным весом 0 (Ultralight)
            // Правильный синтаксис для Canvas API: "font-weight font-size font-family"
            textCtx.font = `${fontSize}px "Yandex Sans"`;
            textCtx.textAlign = 'center';
            textCtx.textBaseline = 'middle';
            
            // Применяем вариативные настройки шрифта через CSS на канвасе
            // Это не стандартный подход, но может помочь в некоторых браузерах
            const text = state.text;
            const centerX = width / 2;
            const centerY = height / 2;
            
            // Создаем настоящую внешнюю обводку
            
            // Метод 1: Рисуем обводку с большим размером
            // Сохраняем текущее состояние контекста
            textCtx.save();
            
            // Рисуем обводку (белую)
            textCtx.strokeStyle = 'white';
            textCtx.lineWidth = strokeWidth * 2;
            textCtx.lineJoin = 'round';  // Скругленные соединения линий
            textCtx.lineCap = 'round';   // Скругленные концы линий
            textCtx.miterLimit = 2;      // Дополнительное ограничение для скругления
            textCtx.strokeText(text, centerX, centerY);
            
            // Рисуем текст (белый)
            textCtx.fillStyle = 'white';
            textCtx.fillText(text, centerX, centerY);
            
            // Восстанавливаем состояние контекста
            textCtx.restore();
        }
    }
    
    // Генерация SVG с текстом
    function generateTextSVG() {
        // Получаем размеры контейнера
        const container = document.querySelector('#text-content .container');
        const containerRect = container.getBoundingClientRect();
        
        // Используем размеры канваса
        const width = Math.round(containerRect.width);
        const height = Math.round(containerRect.height);
        
        // Используем значения из состояния
        const fontSize = state.fontSize;
        const strokeWidth = state.strokeWidth;
        const text = state.text;
        
        // Создаем временный канвас для рендеринга текста
        const tempCanvas = document.createElement('canvas');
        // Увеличиваем размер канваса для лучшего качества трассировки
        const scale = 4; // Увеличиваем разрешение для лучшего результата
        tempCanvas.width = width * scale;
        tempCanvas.height = height * scale;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Масштабируем контекст
        tempCtx.scale(scale, scale);
        
        // Рисуем черный фон
        tempCtx.fillStyle = 'black';
        tempCtx.fillRect(0, 0, width, height);
        
        // Настраиваем шрифт
        tempCtx.font = `${fontSize}px "Yandex Sans"`;
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        
        // Рисуем белый текст
        tempCtx.fillStyle = 'white';
        tempCtx.fillText(text, width / 2, height / 2);
        
        // Получаем данные изображения как ImageData
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Начинаем создавать SVG
        let svgOutput = '';
        
        // Используем Potrace для трассировки
        return new Promise((resolve) => {
            potrace.trace(imageData, {
                turdSize: 5,         // Игнорировать элементы размером меньше этого значения
                turnPolicy: 'minority', // Алгоритм обхода при трассировке
                alphaMax: 1,         // Угол оптимизации
                optCurve: true,      // Оптимизация в кривые Безье
                optTolerance: 0.2,   // Допуск оптимизации
                threshold: 128,      // Порог между черным и белым
                blackOnWhite: true,  // Обрабатывать черное на белом фоне
                background: 'transparent' // Прозрачный фон
            }, (err, svgString) => {
                if (err) {
                    console.error("Ошибка при трассировке:", err);
                    // Возвращаем старую версию SVG в случае ошибки
                    resolve(generateFallbackTextSVG());
                    return;
                }
                
                // Извлекаем пути из SVG, созданного Potrace
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
                const pathElements = svgDoc.querySelectorAll('path');
                
                // Создаем новый SVG с нашими параметрами
                let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`;
                svg += `<rect width="100%" height="100%" fill="black"/>`;
                svg += `<g>`;
                
                // Добавляем пути с обводкой и заливкой
                pathElements.forEach(pathEl => {
                    const pathData = pathEl.getAttribute('d');
                    
                    if (pathData) {
                        // Добавляем внешнюю обводку, если задана толщина обводки
                        if (strokeWidth > 0) {
                            svg += `<path d="${pathData}" fill="none" stroke="white" stroke-width="${strokeWidth * 2}" stroke-linejoin="round" stroke-linecap="round"/>`;
                        }
                        
                        // Добавляем внутреннюю заливку
                        svg += `<path d="${pathData}" fill="white"/>`;
                    }
                });
                
                svg += `</g>`;
                svg += `</svg>`;
                
                resolve(svg);
            });
        });
    }
    
    // Резервная функция для старого метода трассировки, если Potrace не сработает
    function generateFallbackTextSVG() {
        // Получаем размеры контейнера
        const container = document.querySelector('#text-content .container');
        const containerRect = container.getBoundingClientRect();
        
        // Используем размеры канваса
        const width = Math.round(containerRect.width);
        const height = Math.round(containerRect.height);
        
        // Используем значения из состояния
        const fontSize = state.fontSize;
        const strokeWidth = state.strokeWidth;
        const text = state.text;
        
        // Создаем временный канвас для рендеринга текста
        const tempCanvas = document.createElement('canvas');
        const scale = 2;
        tempCanvas.width = width * scale;
        tempCanvas.height = height * scale;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Масштабируем контекст
        tempCtx.scale(scale, scale);
        
        // Рисуем черный фон
        tempCtx.fillStyle = 'black';
        tempCtx.fillRect(0, 0, width, height);
        
        // Настраиваем шрифт
        tempCtx.font = `${fontSize}px "Yandex Sans"`;
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        
        // Рисуем белый текст
        tempCtx.fillStyle = 'white';
        tempCtx.fillText(text, width / 2, height / 2);
        
        // Получаем данные изображения как URL
        return tempCanvas.toDataURL('image/svg+xml');
    }
    
    // Скачивание SVG с текстом
    function downloadTextSVG() {
        // Показываем индикатор загрузки, если нужно
        const button = textExportSVG;
        const originalText = button.textContent;
        button.textContent = "Обработка...";
        button.disabled = true;
        
        generateTextSVG().then(svgContent => {
            const blob = new Blob([svgContent], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = 'text.svg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            // Возвращаем кнопке исходное состояние
            button.textContent = originalText;
            button.disabled = false;
        }).catch(error => {
            console.error("Ошибка при генерации SVG:", error);
            alert("Произошла ошибка при создании SVG. Пожалуйста, попробуйте еще раз.");
            
            // Возвращаем кнопке исходное состояние
            button.textContent = originalText;
            button.disabled = false;
        });
    }
    
    // Инициализация
    function init() {
        // Загружаем шрифт
        loadFont();
        
        // Устанавливаем начальные значения состояния
        state.fontSize = parseInt(textSizeInput.value);
        state.strokeWidth = parseFloat(textStrokeInput.value);
        state.text = textInput.value;
        
        // Синхронизация контролов
        syncInputs(textSizeSlider, textSizeInput, () => {
            state.fontSize = parseInt(textSizeInput.value);
            renderTextFrame();
        });
        
        syncInputs(textStrokeSlider, textStrokeInput, () => {
            state.strokeWidth = parseFloat(textStrokeInput.value);
            renderTextFrame();
        });
        
        // Обработка изменения текста
        textInput.addEventListener('input', () => {
            state.text = textInput.value;
            renderTextFrame();
        });
        
        // Экспорт SVG
        textExportSVG.addEventListener('click', downloadTextSVG);
        
        // Обработка переключения вкладок для обновления канваса
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                if (tab.getAttribute('data-tab') === 'text') {
                    renderTextFrame();
                }
            });
        });
        
        // Запускаем анимацию
        function animate() {
            renderTextFrame();
            requestAnimationFrame(animate);
        }
        
        requestAnimationFrame(animate);
    }
    
    // Запуск инициализации
    init();
});