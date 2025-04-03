// Параметры паттерна
let params = {
    lineThickness: 50,        // Толщина линий
    lineLength: 100,         // Длина линий
    cornerRadius: 10,        // Радиус скругления
    roundedCaps: false       // Скругленные окончания
};

// Получаем канвас и его контекст
const canvas = document.getElementById('patternCanvas');
const ctx = canvas.getContext('2d');

// Центр канваса
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

// Центр модульной сетки
const gridCenterX = 960.1428571;
const gridCenterY = 540;

// Получаем элементы управления
const lineThicknessSlider = document.getElementById('lineThickness');
const lineThicknessValue = document.getElementById('lineThicknessValue');
const roundedCapsCheckbox = document.getElementById('roundedCaps');
const exportSVGButton = document.getElementById('exportSVG');

// Функция инициализации
function init() {
    // Установка начальных значений
    lineThicknessSlider.value = params.lineThickness;
    updateThicknessValue();
    roundedCapsCheckbox.checked = params.roundedCaps;

    // Масштабирование канваса для правильного отображения на разных устройствах
    resize();
    
    // Рисуем паттерн
    drawPattern();

    // Обработчики событий
    lineThicknessSlider.addEventListener('input', function() {
        params.lineThickness = parseInt(this.value);
        updateThicknessValue();
        drawPattern();
    });

    roundedCapsCheckbox.addEventListener('change', function() {
        params.roundedCaps = this.checked;
        drawPattern();
    });

    exportSVGButton.addEventListener('click', exportToSVG);

    // Слушатель события изменения размера окна
    window.addEventListener('resize', function() {
        resize();
        drawPattern();
    });
}

// Обновление отображения значения толщины
function updateThicknessValue() {
    lineThicknessValue.textContent = `${params.lineThickness}px`;
}

// Функция масштабирования канваса
function resize() {
    // Сохраняем оригинальный размер канваса
    const originalWidth = canvas.width;
    const originalHeight = canvas.height;
    
    // Получаем размеры контейнера
    const container = document.querySelector('.container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Вычисляем масштаб для сохранения пропорций
    const scale = Math.min(
        containerWidth / originalWidth,
        containerHeight / originalHeight
    );
    
    // Устанавливаем новые размеры
    canvas.style.width = `${originalWidth * scale}px`;
    canvas.style.height = `${originalHeight * scale}px`;
}

// Функция рисования паттерна
function drawPattern() {
    // Очищаем канвас
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем модульную сетку (серые линии)
    drawGrid();
    
    // Рисуем основную графику (белую линию)
    drawMainGraphic();
}

// Функция рисования модульной сетки
function drawGrid() {
    ctx.strokeStyle = '#3F3F3F';
    ctx.lineWidth = 0.5;
    
    // Рисуем круги
    const centerPoint = { x: gridCenterX, y: gridCenterY };
    const radii = [250, 225, 200, 175, 150, 125, 100, 75, 50, 25];
    
    for (let radius of radii) {
        ctx.beginPath();
        ctx.arc(centerPoint.x, centerPoint.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
    }
    
    // Рисуем линии от центра
    const angles = [
        0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330
    ];
    
    for (let angle of angles) {
        const radian = angle * Math.PI / 180;
        const endX = centerPoint.x + Math.cos(radian) * 250;
        const endY = centerPoint.y + Math.sin(radian) * 250;
        
        ctx.beginPath();
        ctx.moveTo(centerPoint.x, centerPoint.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
}

// Функция для поворота точки вокруг центра
function rotatePoint(x, y, centerX, centerY, angleDegrees) {
    // Конвертируем угол в радианы
    const angleRadians = angleDegrees * Math.PI / 180;
    
    // Переносим в начало координат
    const dx = x - centerX;
    const dy = y - centerY;
    
    // Применяем поворот
    const rotatedX = dx * Math.cos(angleRadians) - dy * Math.sin(angleRadians);
    const rotatedY = dx * Math.sin(angleRadians) + dy * Math.cos(angleRadians);
    
    // Возвращаем на место
    return {
        x: rotatedX + centerX,
        y: rotatedY + centerY
    };
}

// Функция рисования основной графики
function drawMainGraphic() {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = params.lineThickness;
    
    // Устанавливаем тип окончания линии в зависимости от параметра
    ctx.lineCap = params.roundedCaps ? 'round' : 'butt';
    ctx.lineJoin = params.roundedCaps ? 'round' : 'miter';
    
    // Точки исходной линии
    const points = [
        { x: 1135, y: 540.0001153 },
        { x: gridCenterX, y: gridCenterY },
        { x: 1047.5291575, y: 388.3952144 }
    ];
    
    // Рисуем исходную линию
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.lineTo(points[2].x, points[2].y);
    ctx.stroke();
    
    // Рисуем линию, повернутую на 120 градусов
    ctx.beginPath();
    
    const rotatedPoints1 = points.map(point => 
        rotatePoint(point.x, point.y, gridCenterX, gridCenterY, 120)
    );
    
    ctx.moveTo(rotatedPoints1[0].x, rotatedPoints1[0].y);
    ctx.lineTo(rotatedPoints1[1].x, rotatedPoints1[1].y);
    ctx.lineTo(rotatedPoints1[2].x, rotatedPoints1[2].y);
    ctx.stroke();
    
    // Рисуем линию, повернутую на 240 градусов
    ctx.beginPath();
    
    const rotatedPoints2 = points.map(point => 
        rotatePoint(point.x, point.y, gridCenterX, gridCenterY, 240)
    );
    
    ctx.moveTo(rotatedPoints2[0].x, rotatedPoints2[0].y);
    ctx.lineTo(rotatedPoints2[1].x, rotatedPoints2[1].y);
    ctx.lineTo(rotatedPoints2[2].x, rotatedPoints2[2].y);
    ctx.stroke();
}

// Функция экспорта в SVG
function exportToSVG() {
    // Создаем SVG элемент
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgElement.setAttribute('width', canvas.width);
    svgElement.setAttribute('height', canvas.height);
    svgElement.setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`);
    
    // Добавляем стили
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    
    // Устанавливаем стили в зависимости от параметра скругления
    const lineCap = params.roundedCaps ? 'round' : 'butt';
    const lineJoin = params.roundedCaps ? 'round' : 'miter';
    
    style.textContent = `
        .st0 {
            stroke: #fff;
            stroke-width: ${params.lineThickness}px;
            fill: none;
            stroke-miterlimit: 10;
            stroke-linecap: ${lineCap};
            stroke-linejoin: ${lineJoin};
        }
        .st1 {
            stroke: #3f3f3f;
            stroke-width: .5px;
            fill: none;
            stroke-miterlimit: 10;
        }
    `;
    svgElement.appendChild(style);
    
    // Создаем группу для модульной сетки
    const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Добавляем круги
    const centerPoint = { x: gridCenterX, y: gridCenterY };
    const radii = [250, 225, 200, 175, 150, 125, 100, 75, 50, 25];
    
    for (let radius of radii) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('class', 'st1');
        circle.setAttribute('cx', centerPoint.x);
        circle.setAttribute('cy', centerPoint.y);
        circle.setAttribute('r', radius);
        gridGroup.appendChild(circle);
    }
    
    // Добавляем линии от центра
    const angles = [
        0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330
    ];
    
    for (let angle of angles) {
        const radian = angle * Math.PI / 180;
        const endX = centerPoint.x + Math.cos(radian) * 250;
        const endY = centerPoint.y + Math.sin(radian) * 250;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'st1');
        line.setAttribute('x1', centerPoint.x);
        line.setAttribute('y1', centerPoint.y);
        line.setAttribute('x2', endX);
        line.setAttribute('y2', endY);
        gridGroup.appendChild(line);
    }
    
    svgElement.appendChild(gridGroup);
    
    // Создаем группу для основной графики
    const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Точки исходной линии
    const points = [
        { x: 1135, y: 540.0001153 },
        { x: gridCenterX, y: gridCenterY },
        { x: 1047.5291575, y: 388.3952144 }
    ];
    
    // Создаем polyline для исходной линии
    const polyline1 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline1.setAttribute('class', 'st0');
    polyline1.setAttribute('points', `${points[0].x},${points[0].y} ${points[1].x},${points[1].y} ${points[2].x},${points[2].y}`);
    mainGroup.appendChild(polyline1);
    
    // Создаем polyline для линии, повернутой на 120 градусов
    const rotatedPoints1 = points.map(point => 
        rotatePoint(point.x, point.y, gridCenterX, gridCenterY, 120)
    );
    
    const polyline2 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline2.setAttribute('class', 'st0');
    polyline2.setAttribute('points', `${rotatedPoints1[0].x},${rotatedPoints1[0].y} ${rotatedPoints1[1].x},${rotatedPoints1[1].y} ${rotatedPoints1[2].x},${rotatedPoints1[2].y}`);
    mainGroup.appendChild(polyline2);
    
    // Создаем polyline для линии, повернутой на 240 градусов
    const rotatedPoints2 = points.map(point => 
        rotatePoint(point.x, point.y, gridCenterX, gridCenterY, 240)
    );
    
    const polyline3 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline3.setAttribute('class', 'st0');
    polyline3.setAttribute('points', `${rotatedPoints2[0].x},${rotatedPoints2[0].y} ${rotatedPoints2[1].x},${rotatedPoints2[1].y} ${rotatedPoints2[2].x},${rotatedPoints2[2].y}`);
    mainGroup.appendChild(polyline3);
    
    svgElement.appendChild(mainGroup);
    
    // Конвертируем SVG в строку и создаем ссылку для скачивания
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgString], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pattern.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Инициализация при загрузке страницы
window.addEventListener('load', init); 