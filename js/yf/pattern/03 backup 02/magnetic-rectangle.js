/**
 * Модуль Diagonal Grid
 */
(function() {
    // Переменные для хранения параметров
    let canvas, ctx;
    let canvasWidth = 800;   // Ширина холста
    let canvasHeight = 800;  // Высота холста
    
    // Параметры для сетки
    let lineLength = 20;        // Длина линий (px)
    let lineWidth = 1;          // Толщина линий (px)
    let cellSpacing = 50;       // Расстояние между ячейками (px)
    let lineAngle = 45;         // Угол наклона линий (в градусах)
    let roundedLineCaps = false; // Скругление концов линий
    let segments = [];          // Массив сегментов
    
    /**
     * Инициализация модуля
     */
    function initialize() {
        // Получаем ссылки на DOM-элементы
        canvas = document.getElementById('magnetic-rect-canvas');
        ctx = canvas.getContext('2d');
        
        // Создаем и настраиваем элементы управления
        setupControls();
        
        // Устанавливаем размер холста
        setCanvasSize();
        
        // Начальная инициализация
        generateSegments();
        drawCanvas();
    }
    
    /**
     * Установка размера холста
     */
    function setCanvasSize() {
        // Получаем текущее соотношение пикселей устройства (для ретина-дисплеев)
        const dpr = window.devicePixelRatio || 1;
        
        // Устанавливаем размеры канваса с учетом плотности пикселей устройства
        canvas.width = canvasWidth * dpr;
        canvas.height = canvasHeight * dpr;
        
        // Фиксированный размер для отображения на странице
        const fixedSize = 800;
        
        // Вычисляем масштаб для отображения на странице
        const scaleX = fixedSize / canvasWidth;
        const scaleY = fixedSize / canvasHeight;
        const scale = Math.min(scaleX, scaleY);
        
        // Устанавливаем фиксированный размер внешнего контейнера
        const container = canvas.parentElement;
        container.style.width = `${fixedSize}px`;
        container.style.height = `${fixedSize}px`;
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.style.overflow = 'hidden';
        
        // Масштабируем canvas для отображения
        const displayWidth = canvasWidth * scale;
        const displayHeight = canvasHeight * scale;
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
        
        // Масштабируем контекст для рисования с учетом ретина-дисплея
        ctx.scale(dpr, dpr);
        
        // Сбрасываем настройки линий для ретина-дисплея
        ctx.lineWidth = lineWidth;
    }
    
    /**
     * Настройка элементов управления
     */
    function setupControls() {
        // Очищаем контейнер с настройками
        const controlsContainer = document.querySelector('#magnetic-rect-tab .controls');
        controlsContainer.innerHTML = `
            <h2>Settings</h2>
            <div class="control-group text-input-group">
                <label for="magnetic-rect-canvasWidth">Canvas width (px):</label>
                <input type="number" id="magnetic-rect-canvasWidth" value="${canvasWidth}" min="1">
            </div>
            
            <div class="control-group text-input-group">
                <label for="magnetic-rect-canvasHeight">Canvas height (px):</label>
                <input type="number" id="magnetic-rect-canvasHeight" value="${canvasHeight}" min="1">
            </div>
            
            <div class="control-group text-input-group">
                <label for="magnetic-rect-cellSpacing">Cell spacing (px):</label>
                <input type="number" id="magnetic-rect-cellSpacing" value="${cellSpacing}" min="1">
            </div>
            
            <div class="control-group text-input-group">
                <label for="magnetic-rect-lineLength">Line length (px):</label>
                <input type="number" id="magnetic-rect-lineLength" value="${lineLength}" min="1">
            </div>
            
            <div class="control-group text-input-group">
                <label for="magnetic-rect-lineWidth">Line width (px):</label>
                <input type="number" id="magnetic-rect-lineWidth" value="${lineWidth}" min="0.1" step="0.1">
            </div>
            
            <div class="control-group">
                <label for="magnetic-rect-lineAngle">Line angle: <span id="magnetic-rect-lineAngleValue" class="value-display">${lineAngle}</span>°</label>
                <input type="range" id="magnetic-rect-lineAngle" min="0" max="180" value="${lineAngle}" step="5">
            </div>
            
            <div class="control-group checkbox-control">
                <input type="checkbox" id="magnetic-rect-roundedLineCaps" ${roundedLineCaps ? 'checked' : ''}>
                <label for="magnetic-rect-roundedLineCaps">Rounded line caps</label>
            </div>
            
            <button id="magnetic-rect-exportSvgBtn" class="export-btn">Export as SVG (⌘E)</button>
        `;
        
        // Настраиваем обработчики событий для элементов управления
        document.getElementById('magnetic-rect-canvasWidth').addEventListener('input', function() {
            const value = parseInt(this.value);
            if (!isNaN(value) && value > 0) {
                canvasWidth = value;
            }
        });
        
        document.getElementById('magnetic-rect-canvasWidth').addEventListener('change', function() {
            const value = parseInt(this.value);
            if (!isNaN(value) && value > 0) {
                canvasWidth = value;
                setCanvasSize();
                generateSegments();
                drawCanvas();
            } else {
                // Возвращаем предыдущее корректное значение
                this.value = canvasWidth;
            }
        });
        
        document.getElementById('magnetic-rect-canvasHeight').addEventListener('input', function() {
            const value = parseInt(this.value);
            if (!isNaN(value) && value > 0) {
                canvasHeight = value;
            }
        });
        
        document.getElementById('magnetic-rect-canvasHeight').addEventListener('change', function() {
            const value = parseInt(this.value);
            if (!isNaN(value) && value > 0) {
                canvasHeight = value;
                setCanvasSize();
                generateSegments();
                drawCanvas();
            } else {
                // Возвращаем предыдущее корректное значение
                this.value = canvasHeight;
            }
        });
        
        document.getElementById('magnetic-rect-cellSpacing').addEventListener('input', function() {
            const value = parseInt(this.value);
            if (!isNaN(value) && value > 0) {
                cellSpacing = value;
            }
        });
        
        document.getElementById('magnetic-rect-cellSpacing').addEventListener('change', function() {
            const value = parseInt(this.value);
            if (!isNaN(value) && value > 0) {
                cellSpacing = value;
                generateSegments();
                drawCanvas();
            } else {
                this.value = cellSpacing;
            }
        });
        
        document.getElementById('magnetic-rect-lineLength').addEventListener('input', function() {
            const value = parseInt(this.value);
            if (!isNaN(value) && value > 0) {
                lineLength = value;
            }
        });
        
        document.getElementById('magnetic-rect-lineLength').addEventListener('change', function() {
            const value = parseInt(this.value);
            if (!isNaN(value) && value > 0) {
                lineLength = value;
                drawCanvas();
            } else {
                this.value = lineLength;
            }
        });
        
        document.getElementById('magnetic-rect-lineWidth').addEventListener('input', function() {
            const value = parseFloat(this.value);
            if (!isNaN(value) && value > 0) {
                lineWidth = value;
            }
        });
        
        document.getElementById('magnetic-rect-lineWidth').addEventListener('change', function() {
            const value = parseFloat(this.value);
            if (!isNaN(value) && value > 0) {
                lineWidth = value;
                drawCanvas();
            } else {
                this.value = lineWidth;
            }
        });
        
        document.getElementById('magnetic-rect-lineAngle').addEventListener('input', function() {
            lineAngle = parseInt(this.value);
            document.getElementById('magnetic-rect-lineAngleValue').textContent = lineAngle;
            drawCanvas();
        });
        
        document.getElementById('magnetic-rect-roundedLineCaps').addEventListener('change', function() {
            roundedLineCaps = this.checked;
            drawCanvas();
        });
        
        document.getElementById('magnetic-rect-exportSvgBtn').addEventListener('click', exportSvg);
    }
    
    /**
     * Генерация сегментов по модульной сетке
     */
    function generateSegments() {
        segments = [];
        
        // Вычисляем количество строк и столбцов на основе расстояния между ячейками
        const cols = Math.floor(canvasWidth / cellSpacing);
        const rows = Math.floor(canvasHeight / cellSpacing);
        
        // Вычисляем отступы, чтобы сетка была по центру
        const offsetX = (canvasWidth - cols * cellSpacing) / 2;
        const offsetY = (canvasHeight - rows * cellSpacing) / 2;
        
        // Угол поворота хранится в градусах, но для расчетов не преобразуем в радианы
        // это будет происходить в функции drawCanvas
        
        // Создаем точки в узлах сетки
        for (let col = 0; col < cols; col++) {
            for (let row = 0; row < rows; row++) {
                const x = offsetX + (col + 0.5) * cellSpacing;
                const y = offsetY + (row + 0.5) * cellSpacing;
                
                segments.push({
                    x,
                    y
                    // угол будет устанавливаться в drawCanvas
                });
            }
        }
    }
    
    /**
     * Отрисовка канваса
     */
    function drawCanvas() {
        // Получаем DPR для правильной отрисовки
        const dpr = window.devicePixelRatio || 1;
        
        // Очищаем холст с учетом размеров в пикселях устройства
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Фон оставляем прозрачным (черным он будет за счет CSS)
        
        // Обновляем угол в радианах
        const angleRad = (lineAngle * Math.PI) / 180;
        
        // Настраиваем стиль линий
        ctx.strokeStyle = '#fff';
        // Не умножаем lineWidth на dpr, так как scale(dpr, dpr) уже учтен при инициализации
        ctx.lineWidth = lineWidth;
        ctx.lineCap = roundedLineCaps ? 'round' : 'butt';
        
        // Рисуем каждый сегмент
        for (const segment of segments) {
            // Рассчитываем координаты концов линии
            const halfLength = lineLength / 2;
            const startX = segment.x - Math.cos(angleRad) * halfLength;
            const startY = segment.y - Math.sin(angleRad) * halfLength;
            const endX = segment.x + Math.cos(angleRad) * halfLength;
            const endY = segment.y + Math.sin(angleRad) * halfLength;
            
            // Рисуем линию
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    }
    
    /**
     * Экспорт в SVG
     */
    function exportSvg() {
        // Переводим угол в радианы
        const angleRad = (lineAngle * Math.PI) / 180;
        
        // Получаем соотношение пикселей устройства (для расчета толщины линий в SVG)
        const dpr = window.devicePixelRatio || 1;
        const svgLineWidth = lineWidth;  // В SVG используем исходную толщину линии
        
        // Создаем SVG-документ
        const svgContent = `<svg width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${canvasWidth}" height="${canvasHeight}" fill="black" />
            ${segments.map(segment => {
                const halfLength = lineLength / 2;
                const startX = segment.x - Math.cos(angleRad) * halfLength;
                const startY = segment.y - Math.sin(angleRad) * halfLength;
                const endX = segment.x + Math.cos(angleRad) * halfLength;
                const endY = segment.y + Math.sin(angleRad) * halfLength;
                
                return `<line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="white" stroke-width="${svgLineWidth}" stroke-linecap="${roundedLineCaps ? 'round' : 'butt'}" />`;
            }).join('\n')}
        </svg>`;
        
        // Создаем Blob и URL для скачивания
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        // Создаем ссылку для скачивания и активируем её
        const link = document.createElement('a');
        link.href = url;
        link.download = 'diagonal-grid.svg';
        link.click();
        
        // Очищаем URL
        URL.revokeObjectURL(url);
    }
    
    // Инициализация модуля при загрузке страницы
    document.addEventListener('DOMContentLoaded', initialize);
    
    // Экспортируем публичное API
    window.magneticRectModule = {
        drawCanvas,
        exportSvg
    };
})(); 