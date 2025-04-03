// Параметры паттерна
let params = {
    lineThickness: 50,        // Толщина линий
    lineLength: 100,         // Длина линий
    cornerRadius: 100,        // Радиус скругления
    roundedCaps: false,       // Скругленные окончания
    showLabels: true          // Отображение подписей модульной сетки
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

// Радиусы окружностей (от большего к меньшему)
const gridRadii = [250, 225, 200, 175, 150, 125, 100, 75, 50, 25];

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
    cornerRadiusSlider.value = params.cornerRadius;
    updateThicknessValue();
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
    
    for (let radius of gridRadii) {
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
    
    // Рисуем подписи точек пересечения по принципу циферблата часов
    if (params.showLabels) {
        drawGridLabels();
    }
}

// Функция рисования подписей модульной сетки
function drawGridLabels() {
    const centerPoint = { x: gridCenterX, y: gridCenterY };
    const outerRadius = 250; // Радиус самой большой окружности
    
    // Настройки текста
    ctx.font = '12px Arial';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Рисуем цифры по аналогии с циферблатом часов
    for (let hour = 1; hour <= 12; hour++) {
        // Вычисляем угол для текущего часа (в радианах)
        // На циферблате 3 часа соответствует 0 градусов в системе координат Canvas
        const angle = ((hour * 30) - 90) * Math.PI / 180;
        
        // Вычисляем координаты метки
        const x = centerPoint.x + Math.cos(angle) * outerRadius;
        const y = centerPoint.y + Math.sin(angle) * outerRadius;
        
        // Смещение для лучшего позиционирования
        const offsetX = Math.cos(angle) * 10;
        const offsetY = Math.sin(angle) * 10;
        
        // Отрисовываем текст
        ctx.fillText(hour.toString(), x + offsetX, y + offsetY);
    }
    
    // Рисуем буквенные индексы вдоль луча "3 часа" (0 градусов)
    const angle3Hour = 0; // 0 градусов - направление вправо (восток)
    
    // Буквы для маркировки от центра (A) до внешней окружности (K)
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
    
    // Центр (точка A)
    ctx.fillText('A', centerPoint.x, centerPoint.y - 10);
    
    // Точки на пересечении с окружностями (от B до K)
    for (let i = 0; i < gridRadii.length; i++) {
        const radius = gridRadii[gridRadii.length - 1 - i]; // Идем от меньшей окружности к большей
        const letterIndex = i + 1; // Индекс буквы: B для первой окружности, C для второй и т.д.
        
        if (letterIndex >= letters.length) break;
        
        const x = centerPoint.x + Math.cos(angle3Hour) * radius;
        const y = centerPoint.y + Math.sin(angle3Hour) * radius;
        
        // Смещение для лучшего позиционирования
        const offsetY = -10; // Смещение вверх
        
        // Отрисовываем букву
        ctx.fillText(letters[letterIndex], x, y + offsetY);
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

// Функция для вычисления расстояния между двумя точками
function distance(point1, point2) {
    return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
}

// Функция для вычисления точки на отрезке на определенном расстоянии от начала
function getPointOnLine(start, end, distanceFromStart) {
    const totalDistance = distance(start, end);
    const ratio = distanceFromStart / totalDistance;
    
    return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio
    };
}

// Функция для вычисления нормализованного вектора направления
function getNormalizedDirection(from, to) {
    const dist = distance(from, to);
    return {
        x: (to.x - from.x) / dist,
        y: (to.y - from.y) / dist
    };
}

// Функция рисования линии со скругленным углом
function drawRoundedAngleLine(ctx, points, radius) {
    if (points.length < 3) return;
    
    // Если радиус скругления равен 0, рисуем обычную ломаную линию
    if (radius === 0) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        return;
    }
    
    const point1 = points[0];   // Первая точка
    const point2 = points[1];   // Угловая точка
    const point3 = points[2];   // Третья точка
    
    // Вычисляем расстояния
    const dist1 = distance(point1, point2);
    const dist2 = distance(point2, point3);
    
    // Определяем максимально допустимый радиус скругления
    const maxRadius = Math.min(dist1, dist2) * 0.9;
    const actualRadius = Math.min(radius, maxRadius);
    
    // Вычисляем точки на отрезках на расстоянии радиуса от угловой точки
    const tangentPoint1 = getPointOnLine(point2, point1, actualRadius);
    const tangentPoint2 = getPointOnLine(point2, point3, actualRadius);
    
    // Вычисляем направления от угловой точки
    const dir1 = getNormalizedDirection(point2, point1);
    const dir2 = getNormalizedDirection(point2, point3);
    
    // Вычисляем контрольные точки для квадратичной кривой Безье
    const controlPoint = point2;
    
    // Рисуем линию
    ctx.beginPath();
    ctx.moveTo(point1.x, point1.y);
    ctx.lineTo(tangentPoint1.x, tangentPoint1.y);
    ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, tangentPoint2.x, tangentPoint2.y);
    ctx.lineTo(point3.x, point3.y);
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
    drawRoundedAngleLine(ctx, points, params.cornerRadius);
    
    // Рисуем линию, повернутую на 120 градусов
    const rotatedPoints1 = points.map(point => 
        rotatePoint(point.x, point.y, gridCenterX, gridCenterY, 120)
    );
    drawRoundedAngleLine(ctx, rotatedPoints1, params.cornerRadius);
    
    // Рисуем линию, повернутую на 240 градусов
    const rotatedPoints2 = points.map(point => 
        rotatePoint(point.x, point.y, gridCenterX, gridCenterY, 240)
    );
    drawRoundedAngleLine(ctx, rotatedPoints2, params.cornerRadius);
}

// Функция создания SVG-пути со скругленным углом
function createRoundedAnglePath(points, radius) {
    if (points.length < 3) return '';
    
    // Если радиус скругления равен 0, создаем обычный путь
    if (radius === 0) {
        return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y} L ${points[2].x},${points[2].y}`;
    }
    
    const point1 = points[0];   // Первая точка
    const point2 = points[1];   // Угловая точка
    const point3 = points[2];   // Третья точка
    
    // Вычисляем расстояния
    const dist1 = distance(point1, point2);
    const dist2 = distance(point2, point3);
    
    // Определяем максимально допустимый радиус скругления
    const maxRadius = Math.min(dist1, dist2) * 0.9;
    const actualRadius = Math.min(radius, maxRadius);
    
    // Вычисляем точки на отрезках на расстоянии радиуса от угловой точки
    const tangentPoint1 = getPointOnLine(point2, point1, actualRadius);
    const tangentPoint2 = getPointOnLine(point2, point3, actualRadius);
    
    // Формируем SVG-путь
    return `M ${point1.x},${point1.y} 
            L ${tangentPoint1.x},${tangentPoint1.y} 
            Q ${point2.x},${point2.y} ${tangentPoint2.x},${tangentPoint2.y} 
            L ${point3.x},${point3.y}`;
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
        .label {
            font-family: Arial;
            font-size: 12px;
            fill: #999;
            text-anchor: middle;
            dominant-baseline: middle;
        }
    `;
    svgElement.appendChild(style);
    
    // Создаем группу для модульной сетки
    const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Добавляем круги
    const centerPoint = { x: gridCenterX, y: gridCenterY };
    
    for (let radius of gridRadii) {
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
    
    // Добавляем подписи точек пересечения по принципу циферблата часов
    if (params.showLabels) {
        const outerRadius = 250; // Радиус самой большой окружности
        
        // Добавляем подписи цифр по циферблату
        for (let hour = 1; hour <= 12; hour++) {
            // Вычисляем угол для текущего часа (в радианах)
            // На циферблате 3 часа соответствует 0 градусов в системе координат SVG
            const angle = ((hour * 30) - 90) * Math.PI / 180;
            
            // Вычисляем координаты метки
            const x = centerPoint.x + Math.cos(angle) * outerRadius;
            const y = centerPoint.y + Math.sin(angle) * outerRadius;
            
            // Смещение для лучшего позиционирования
            const offsetX = Math.cos(angle) * 10;
            const offsetY = Math.sin(angle) * 10;
            
            // Создаем текстовый элемент
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('class', 'label');
            text.setAttribute('x', x + offsetX);
            text.setAttribute('y', y + offsetY);
            text.textContent = hour.toString();
            
            gridGroup.appendChild(text);
        }
        
        // Добавляем буквенные индексы вдоль луча "3 часа" (0 градусов)
        const angle3Hour = 0; // 0 градусов - направление вправо (восток)
        
        // Буквы для маркировки от центра (A) до внешней окружности (K)
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
        
        // Центр (точка A)
        const textA = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textA.setAttribute('class', 'label');
        textA.setAttribute('x', centerPoint.x);
        textA.setAttribute('y', centerPoint.y - 10);
        textA.textContent = 'A';
        gridGroup.appendChild(textA);
        
        // Точки на пересечении с окружностями (от B до K)
        for (let i = 0; i < gridRadii.length; i++) {
            const radius = gridRadii[gridRadii.length - 1 - i]; // Идем от меньшей окружности к большей
            const letterIndex = i + 1; // Индекс буквы: B для первой окружности, C для второй и т.д.
            
            if (letterIndex >= letters.length) break;
            
            const x = centerPoint.x + Math.cos(angle3Hour) * radius;
            const y = centerPoint.y + Math.sin(angle3Hour) * radius;
            
            // Смещение для лучшего позиционирования
            const offsetY = -10; // Смещение вверх
            
            // Создаем текстовый элемент
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('class', 'label');
            text.setAttribute('x', x);
            text.setAttribute('y', y + offsetY);
            text.textContent = letters[letterIndex];
            
            gridGroup.appendChild(text);
        }
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
    path1.setAttribute('d', createRoundedAnglePath(points, params.cornerRadius));
    mainGroup.appendChild(path1);
    
    // Создаем path для линии, повернутой на 120 градусов
    const rotatedPoints1 = points.map(point => 
        rotatePoint(point.x, point.y, gridCenterX, gridCenterY, 120)
    );
    
    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.setAttribute('class', 'st0');
    path2.setAttribute('d', createRoundedAnglePath(rotatedPoints1, params.cornerRadius));
    mainGroup.appendChild(path2);
    
    // Создаем path для линии, повернутой на 240 градусов
    const rotatedPoints2 = points.map(point => 
        rotatePoint(point.x, point.y, gridCenterX, gridCenterY, 240)
    );
    
    const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path3.setAttribute('class', 'st0');
    path3.setAttribute('d', createRoundedAnglePath(rotatedPoints2, params.cornerRadius));
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