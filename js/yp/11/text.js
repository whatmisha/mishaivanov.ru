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
        
        // Получаем данные изображения
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        // Начинаем создавать SVG
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`;
        svg += `<rect width="100%" height="100%" fill="black"/>`;
        
        // Создаем группу для текста
        svg += `<g>`;
        
        // Создаем маску для текста
        const mask = [];
        for (let y = 0; y < tempCanvas.height; y++) {
            mask[y] = [];
            for (let x = 0; x < tempCanvas.width; x++) {
                const index = (y * tempCanvas.width + x) * 4;
                // Если пиксель белый (или почти белый)
                mask[y][x] = data[index] > 200 ? 1 : 0;
            }
        }
        
        // Функция для трассировки контура
        function traceContour(startX, startY) {
            const directions = [
                [1, 0],   // вправо
                [0, 1],   // вниз
                [-1, 0],  // влево
                [0, -1]   // вверх
            ];
            
            let contour = [];
            let x = startX;
            let y = startY;
            let dir = 0;  // начинаем движение вправо
            
            do {
                contour.push([x, y]);
                
                // Помечаем пиксель как посещенный
                mask[y][x] = 2;
                
                // Проверяем соседние пиксели в порядке: вправо, вниз, влево, вверх
                let found = false;
                for (let i = 0; i < 4; i++) {
                    const newDir = (dir + i) % 4;
                    const [dx, dy] = directions[newDir];
                    const newX = x + dx;
                    const newY = y + dy;
                    
                    if (newX >= 0 && newX < tempCanvas.width && 
                        newY >= 0 && newY < tempCanvas.height && 
                        mask[newY][newX] === 1) {
                        x = newX;
                        y = newY;
                        dir = newDir;
                        found = true;
                        break;
                    }
                }
                
                if (!found) {
                    // Если не нашли соседний белый пиксель, ищем в любом направлении
                    for (let i = 0; i < 4; i++) {
                        const [dx, dy] = directions[i];
                        const newX = x + dx;
                        const newY = y + dy;
                        
                        if (newX >= 0 && newX < tempCanvas.width && 
                            newY >= 0 && newY < tempCanvas.height && 
                            mask[newY][newX] === 1) {
                            x = newX;
                            y = newY;
                            dir = i;
                            found = true;
                            break;
                        }
                    }
                }
                
                if (!found) break;
                
            } while (!(x === startX && y === startY) && contour.length < 10000);
            
            return contour;
        }
        
        // Находим все контуры
        const contours = [];
        for (let y = 0; y < tempCanvas.height; y++) {
            for (let x = 0; x < tempCanvas.width; x++) {
                if (mask[y][x] === 1) {
                    const contour = traceContour(x, y);
                    if (contour.length > 2) {
                        contours.push(contour);
                    }
                }
            }
        }
        
        // Преобразуем контуры в SVG path
        if (contours.length > 0) {
            // Создаем path для внешней обводки
            let pathData = '';
            
            contours.forEach(contour => {
                if (contour.length > 0) {
                    // Начинаем новый подпуть
                    pathData += `M${contour[0][0] / scale},${contour[0][1] / scale} `;
                    
                    // Добавляем линии для каждой точки контура
                    for (let i = 1; i < contour.length; i++) {
                        pathData += `L${contour[i][0] / scale},${contour[i][1] / scale} `;
                    }
                    
                    // Замыкаем контур
                    pathData += 'Z ';
                }
            });
            
            // Добавляем path с внешней обводкой
            svg += `<path d="${pathData}" fill="none" stroke="white" stroke-width="${strokeWidth * 2}" stroke-linejoin="round" stroke-linecap="round"/>`;
            
            // Добавляем path с внутренней заливкой
            svg += `<path d="${pathData}" fill="white"/>`;
        }
        
        svg += `</g>`;
        svg += `</svg>`;
        
        return svg;
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