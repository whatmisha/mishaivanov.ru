/**
 * Модуль для генерации магнитной сетки из отрезков
 */
window.magneticRectModule = (function() {
    // Приватные переменные
    const canvas = document.getElementById('magnetic-rect-canvas');
    const ctx = canvas.getContext('2d');
    
    // Элементы управления
    const gridSizeInput = document.getElementById('magnetic-rect-gridSize');
    const gridSizeValue = document.getElementById('magnetic-rect-gridSizeValue');
    const ratioInput = document.getElementById('magnetic-rect-ratio');
    const ratioValue = document.getElementById('magnetic-rect-ratioValue');
    const lineWidthInput = document.getElementById('magnetic-rect-lineWidth');
    const lineWidthValue = document.getElementById('magnetic-rect-lineWidthValue');
    const magneticForceInput = document.getElementById('magnetic-rect-magneticForce');
    const magneticForceValue = document.getElementById('magnetic-rect-magneticForceValue');
    const regenerateBtn = document.getElementById('magnetic-rect-regenerateBtn');
    const exportSvgBtn = document.getElementById('magnetic-rect-exportSvgBtn');
    
    // Состояние модуля
    const width = 400; // Фиксированная ширина прямоугольника
    let ratio = parseFloat(ratioInput.value);
    let height = width / ratio;
    let gridSize = parseInt(gridSizeInput.value);
    let lineWidth = parseFloat(lineWidthInput.value);
    let magneticForce = parseFloat(magneticForceInput.value);
    const lineColor = "#ffffff"; // Фиксированный белый цвет линий
    
    // Магнитные полюса (случайно распределенные точки притяжения)
    let magneticPoles = [];
    const poleCount = 5; // Количество магнитных полюсов
    
    // Добавляем отслеживание положения курсора
    let mouseX = 0;
    let mouseY = 0;
    
    /**
     * Инициализация событий
     */
    function init() {
        // Обработчики событий для элементов управления
        gridSizeInput.addEventListener('input', () => {
            gridSize = parseInt(gridSizeInput.value);
            gridSizeValue.textContent = gridSize;
            generateGrid();
        });
        
        ratioInput.addEventListener('input', () => {
            ratio = parseFloat(ratioInput.value);
            ratioValue.textContent = ratio.toFixed(1);
            height = width / ratio;
            resizeCanvas();
            generateGrid();
        });
        
        lineWidthInput.addEventListener('input', () => {
            lineWidth = parseFloat(lineWidthInput.value);
            lineWidthValue.textContent = lineWidth;
            drawGrid();
        });
        
        magneticForceInput.addEventListener('input', () => {
            magneticForce = parseFloat(magneticForceInput.value);
            magneticForceValue.textContent = magneticForce.toFixed(2);
            generateGrid();
        });
        
        regenerateBtn.addEventListener('click', generateGrid);
        exportSvgBtn.addEventListener('click', exportSvg);
        
        // Обработчики событий мыши
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
            drawGrid();
        });
        
        canvas.addEventListener('mouseleave', () => {
            mouseX = -1;
            mouseY = -1;
            drawGrid();
        });
        
        // Начальная инициализация
        resizeCanvas();
        generateGrid();
    }
    
    /**
     * Изменение размера холста
     */
    function resizeCanvas() {
        const containerWidth = document.querySelector('.content-wrapper').clientWidth;
        const maxWidth = containerWidth - 400; // Отступ для панели управления
        const maxHeight = window.innerHeight - 150;
        const size = Math.min(maxWidth, maxHeight);
        
        // Определяем размеры холста с учетом соотношения сторон
        const canvasWidth = size;
        const canvasHeight = size / ratio;
        
        // Устанавливаем размеры холста
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        // Перерисовываем холст
        drawGrid();
    }
    
    /**
     * Генерация магнитных полюсов
     */
    function generateMagneticPoles() {
        magneticPoles = [];
        for (let i = 0; i < poleCount; i++) {
            magneticPoles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                strength: Math.random() * 0.5 + 0.5 // Сила от 0.5 до 1
            });
        }
    }
    
    /**
     * Генерация сетки с учетом магнитных полюсов
     */
    function generateGrid() {
        // Генерируем новые магнитные полюса
        generateMagneticPoles();
        
        // Очищаем холст
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Масштабируем для отображения на холсте
        const scaleX = canvas.width / width;
        const scaleY = canvas.height / height;
        
        // Рисуем рамку прямоугольника
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        
        // Рисуем сетку
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = lineWidth;
        
        // Вычисляем количество линий по горизонтали и вертикали
        const numLinesX = Math.ceil(width / (gridSize + 5));
        const numLinesY = Math.ceil(height / (gridSize + 5));
        
        // Длина отрезка (пропорциональна размеру сетки, но не более 80% от расстояния между центрами)
        const segmentLength = Math.min(gridSize * 0.8, 20);
        
        // Отступ от краев
        const margin = segmentLength / 2;
        
        // Вычисляем размеры области для рисования с учетом отступов
        const drawWidth = width - 2 * margin;
        const drawHeight = height - 2 * margin;
        
        // Рисуем сетку
        for (let x = 0; x < numLinesX; x++) {
            for (let y = 0; y < numLinesY; y++) {
                const centerX = margin + (x * drawWidth) / (numLinesX - 1);
                const centerY = margin + (y * drawHeight) / (numLinesY - 1);
                
                // Вычисляем смещение под влиянием магнитных полюсов
                let offsetX = 0;
                let offsetY = 0;
                
                for (const pole of magneticPoles) {
                    const dx = pole.x - centerX;
                    const dy = pole.y - centerY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 0) {
                        const force = pole.strength * magneticForce / distance;
                        offsetX += (dx / distance) * force;
                        offsetY += (dy / distance) * force;
                    }
                }
                
                // Ограничиваем смещение
                const maxOffset = gridSize / 4;
                offsetX = Math.max(-maxOffset, Math.min(maxOffset, offsetX));
                offsetY = Math.max(-maxOffset, Math.min(maxOffset, offsetY));
                
                // Вычисляем координаты начала и конца отрезка
                const startX = (centerX + offsetX - segmentLength / 2) * scaleX;
                const startY = (centerY + offsetY - segmentLength / 2) * scaleY;
                const endX = (centerX + offsetX + segmentLength / 2) * scaleX;
                const endY = (centerY + offsetY + segmentLength / 2) * scaleY;
                
                // Рисуем отрезок
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
    }
    
    /**
     * Отрисовка сетки
     */
    function drawGrid() {
        generateGrid();
    }
    
    /**
     * Экспорт паттерна в формате SVG
     */
    function exportSvg() {
        // Создаем SVG элемент
        const svgNamespace = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNamespace, 'svg');
        
        // Устанавливаем атрибуты SVG
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        
        // Вычисляем количество линий по горизонтали и вертикали
        const numLinesX = Math.ceil(width / (gridSize + 5));
        const numLinesY = Math.ceil(height / (gridSize + 5));
        
        // Длина отрезка (пропорциональна размеру сетки, но не более 80% от расстояния между центрами)
        const segmentLength = Math.min(gridSize * 0.8, 20);
        
        // Отступ от краев
        const margin = segmentLength / 2;
        
        // Добавляем линии сетки
        for (let x = 0; x < numLinesX; x++) {
            for (let y = 0; y < numLinesY; y++) {
                const centerX = margin + (x * (width - 2 * margin)) / (numLinesX - 1);
                const centerY = margin + (y * (height - 2 * margin)) / (numLinesY - 1);
                
                // Вычисляем смещение под влиянием магнитных полюсов
                let offsetX = 0;
                let offsetY = 0;
                
                for (const pole of magneticPoles) {
                    const dx = pole.x - centerX;
                    const dy = pole.y - centerY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 0) {
                        const force = pole.strength * magneticForce / distance;
                        offsetX += (dx / distance) * force;
                        offsetY += (dy / distance) * force;
                    }
                }
                
                // Ограничиваем смещение
                const maxOffset = gridSize / 4;
                offsetX = Math.max(-maxOffset, Math.min(maxOffset, offsetX));
                offsetY = Math.max(-maxOffset, Math.min(maxOffset, offsetY));
                
                // Создаем линию
                const line = document.createElementNS(svgNamespace, 'line');
                line.setAttribute('x1', centerX + offsetX - segmentLength / 2);
                line.setAttribute('y1', centerY + offsetY - segmentLength / 2);
                line.setAttribute('x2', centerX + offsetX + segmentLength / 2);
                line.setAttribute('y2', centerY + offsetY + segmentLength / 2);
                line.setAttribute('stroke', lineColor);
                line.setAttribute('stroke-width', lineWidth);
                svg.appendChild(line);
            }
        }
        
        // Преобразуем SVG в строку
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
        
        // Создаем URL для скачивания
        const url = URL.createObjectURL(svgBlob);
        
        // Создаем ссылку для скачивания и активируем её
        const link = document.createElement('a');
        link.href = url;
        link.download = 'magnetic_grid.svg';
        link.click();
        
        // Очищаем URL
        URL.revokeObjectURL(url);
    }
    
    function calculateMagneticOffset(x, y) {
        const magneticForce = parseFloat(document.getElementById('magnetic-rect-magneticForce').value);
        let offsetX = 0;
        let offsetY = 0;
        
        // Если курсор находится над холстом, используем его позицию как магнитный полюс
        if (mouseX >= 0 && mouseY >= 0) {
            const dx = mouseX - x;
            const dy = mouseY - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                // Нормализуем смещение и умножаем на силу
                offsetX = magneticForce * (dx / distance);
                offsetY = magneticForce * (dy / distance);
            }
        }
        
        return { offsetX, offsetY };
    }
    
    // Инициализация модуля
    init();
    
    // Публичный API
    return {
        resizeCanvas,
        generateGrid,
        drawGrid
    };
})(); 