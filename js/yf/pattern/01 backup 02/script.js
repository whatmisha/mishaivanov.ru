// Параметры паттерна
let params = {
    lineThickness: 50,        // Толщина линий
    lineLength: 100,         // Длина линий
    cornerRadius: 50,        // Радиус скругления угла
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
const cornerRadiusSlider = document.getElementById('cornerRadius');
const cornerRadiusValue = document.getElementById('cornerRadiusValue');
const roundedCapsCheckbox = document.getElementById('roundedCaps');
const exportSVGButton = document.getElementById('exportSVG');

// Функция инициализации
function init() {
    // Установка начальных значений
    lineThicknessSlider.value = params.lineThickness;
    updateThicknessValue();
    cornerRadiusSlider.value = params.cornerRadius;
    updateCornerRadiusValue();
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

    cornerRadiusSlider.addEventListener('input', function() {
        params.cornerRadius = parseInt(this.value);
        updateCornerRadiusValue();
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

// Обновление отображения значения радиуса скругления
function updateCornerRadiusValue() {
    cornerRadiusValue.textContent = `${params.cornerRadius}px`;
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

// Функция для рисования скругленной линии
function drawRoundedPath(ctx, points, radius) {
    if (points.length < 3) return;
    
    // Если радиус равен 0, просто рисуем прямые линии
    if (radius === 0) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        return;
    }
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length - 1; i++) {
        const p1 = points[i-1]; // Предыдущая точка
        const p2 = points[i];   // Текущая точка (угол)
        const p3 = points[i+1]; // Следующая точка
        
        // Вычисляем векторы направления
        const v1x = p2.x - p1.x;
        const v1y = p2.y - p1.y;
        const v2x = p3.x - p2.x;
        const v2y = p3.y - p2.y;
        
        // Вычисляем длины векторов
        const l1 = Math.sqrt(v1x * v1x + v1y * v1y);
        const l2 = Math.sqrt(v2x * v2x + v2y * v2y);
        
        // Нормализуем векторы
        const v1xu = v1x / l1;
        const v1yu = v1y / l1;
        const v2xu = v2x / l2;
        const v2yu = v2y / l2;
        
        // Вычисляем расстояние от точки угла для начала и конца закругления
        // Ограничиваем радиус половиной длины короткого сегмента
        const maxRadius = Math.min(l1, l2) / 2;
        const actualRadius = Math.min(radius, maxRadius);
        
        // Вычисляем точки начала и конца закругления
        const p2StartX = p2.x - v1xu * actualRadius;
        const p2StartY = p2.y - v1yu * actualRadius;
        const p2EndX = p2.x + v2xu * actualRadius;
        const p2EndY = p2.y + v2yu * actualRadius;
        
        // Рисуем линию до начала закругления
        ctx.lineTo(p2StartX, p2StartY);
        
        // Рисуем квадратическую кривую для закругления
        ctx.quadraticCurveTo(p2.x, p2.y, p2EndX, p2EndY);
    }
    
    // Рисуем линию до последней точки
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();
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
    
    // Рисуем исходную линию со скруглением
    drawRoundedPath(ctx, points, params.cornerRadius);
    
    // Рисуем линию, повернутую на 120 градусов
    const rotatedPoints1 = points.map(point => 
        rotatePoint(point.x, point.y, gridCenterX, gridCenterY, 120)
    );
    
    // Рисуем повернутую линию со скруглением
    drawRoundedPath(ctx, rotatedPoints1, params.cornerRadius);
    
    // Рисуем линию, повернутую на 240 градусов
    const rotatedPoints2 = points.map(point => 
        rotatePoint(point.x, point.y, gridCenterX, gridCenterY, 240)
    );
    
    // Рисуем еще одну повернутую линию со скруглением
    drawRoundedPath(ctx, rotatedPoints2, params.cornerRadius);
}

// Функция для создания пути для SVG со скруглением
function createRoundedPathD(points, radius) {
    if (points.length < 3) return '';
    
    // Если радиус равен 0, просто создаем путь из прямых линий
    if (radius === 0) {
        let d = `M ${points[0].x},${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            d += ` L ${points[i].x},${points[i].y}`;
        }
        return d;
    }
    
    let d = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 1; i < points.length - 1; i++) {
        const p1 = points[i-1]; // Предыдущая точка
        const p2 = points[i];   // Текущая точка (угол)
        const p3 = points[i+1]; // Следующая точка
        
        // Вычисляем векторы направления
        const v1x = p2.x - p1.x;
        const v1y = p2.y - p1.y;
        const v2x = p3.x - p2.x;
        const v2y = p3.y - p2.y;
        
        // Вычисляем длины векторов
        const l1 = Math.sqrt(v1x * v1x + v1y * v1y);
        const l2 = Math.sqrt(v2x * v2x + v2y * v2y);
        
        // Нормализуем векторы
        const v1xu = v1x / l1;
        const v1yu = v1y / l1;
        const v2xu = v2x / l2;
        const v2yu = v2y / l2;
        
        // Вычисляем расстояние от точки угла для начала и конца закругления
        // Ограничиваем радиус половиной длины короткого сегмента
        const maxRadius = Math.min(l1, l2) / 2;
        const actualRadius = Math.min(radius, maxRadius);
        
        // Вычисляем точки начала и конца закругления
        const p2StartX = p2.x - v1xu * actualRadius;
        const p2StartY = p2.y - v1yu * actualRadius;
        const p2EndX = p2.x + v2xu * actualRadius;
        const p2EndY = p2.y + v2yu * actualRadius;
        
        // Добавляем линию до начала закругления
        d += ` L ${p2StartX},${p2StartY}`;
        
        // Добавляем квадратическую кривую для закругления
        d += ` Q ${p2.x},${p2.y} ${p2EndX},${p2EndY}`;
    }
    
    // Добавляем линию до последней точки
    d += ` L ${points[points.length - 1].x},${points[points.length - 1].y}`;
    
    return d;
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
    
    // Создаем path для исходной линии со скруглением
    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path1.setAttribute('class', 'st0');
    path1.setAttribute('d', createRoundedPathD(points, params.cornerRadius));
    mainGroup.appendChild(path1);
    
    // Создаем path для линии, повернутой на 120 градусов
    const rotatedPoints1 = points.map(point => 
        rotatePoint(point.x, point.y, gridCenterX, gridCenterY, 120)
    );
    
    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.setAttribute('class', 'st0');
    path2.setAttribute('d', createRoundedPathD(rotatedPoints1, params.cornerRadius));
    mainGroup.appendChild(path2);
    
    // Создаем path для линии, повернутой на 240 градусов
    const rotatedPoints2 = points.map(point => 
        rotatePoint(point.x, point.y, gridCenterX, gridCenterY, 240)
    );
    
    const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path3.setAttribute('class', 'st0');
    path3.setAttribute('d', createRoundedPathD(rotatedPoints2, params.cornerRadius));
    mainGroup.appendChild(path3);
    
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