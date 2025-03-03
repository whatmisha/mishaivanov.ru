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
        
        // Начинаем создавать SVG
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`;
        svg += `<rect width="100%" height="100%" fill="black"/>`;
        
        const text = state.text;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Проверяем, доступен ли шрифт через opentype.js
        if (state.font && typeof opentype !== 'undefined') {
            // Преобразуем текст в path с помощью opentype.js
            try {
                // Создаем path для текста
                const path = state.font.getPath(text, 0, 0, fontSize);
                
                // Получаем bounding box для центрирования
                const bbox = path.getBoundingBox();
                const textWidth = bbox.x2 - bbox.x1;
                const textHeight = bbox.y2 - bbox.y1;
                
                // Вычисляем смещение для центрирования
                const offsetX = centerX - (bbox.x1 + textWidth / 2);
                const offsetY = centerY - (bbox.y1 + textHeight / 2);
                
                // Получаем SVG path данные
                const pathData = path.toPathData();
                
                // Добавляем path с внешней обводкой
                svg += `<g transform="translate(${offsetX}, ${offsetY})">
                    <!-- Внешняя обводка -->
                    <path d="${pathData}" 
                        fill="none" 
                        stroke="white" 
                        stroke-width="${strokeWidth * 2}" 
                        stroke-linejoin="round" 
                        stroke-linecap="round" />
                    
                    <!-- Внутренняя заливка -->
                    <path d="${pathData}" 
                        fill="white" />
                </g>`;
            } catch (error) {
                console.error('Ошибка при создании path из текста:', error);
                // Используем запасной вариант с обычным текстом
                fallbackTextSVG();
            }
        } else {
            // Если opentype.js недоступен, используем обычный текст с инструкцией
            fallbackTextSVG();
        }
        
        svg += `</svg>`;
        return svg;
        
        // Запасной вариант с обычным текстом
        function fallbackTextSVG() {
            svg += `
            <!-- Текст будет преобразован в path при открытии в векторном редакторе -->
            <g transform="translate(${centerX}, ${centerY})">
                <!-- Внешняя обводка -->
                <text text-anchor="middle" dominant-baseline="middle" 
                    font-family="Yandex Sans" 
                    font-size="${fontSize}" 
                    font-weight="0"
                    fill="none"
                    stroke="white" 
                    stroke-width="${strokeWidth * 2}" 
                    stroke-linejoin="round" 
                    stroke-linecap="round">${text}</text>
                
                <!-- Внутренняя заливка -->
                <text text-anchor="middle" dominant-baseline="middle" 
                    font-family="Yandex Sans" 
                    font-size="${fontSize}" 
                    font-weight="0"
                    fill="white">${text}</text>
                
                <!-- Комментарий для пользователя -->
                <desc>
                    Примечание: Для получения текста в кривых, откройте этот SVG в векторном редакторе 
                    (например, Adobe Illustrator, Figma или Inkscape) и преобразуйте текст в кривые 
                    перед дальнейшим использованием.
                </desc>
            </g>`;
        }
    }
    
    // Скачивание SVG с текстом
    function downloadTextSVG() {
        const svgContent = generateTextSVG();
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'text.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
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