// Параметры паттерна
let params = {
    lineThickness: 50,        // Толщина линий
    lineLength: 100,         // Длина линий
    cornerRadius: 120,        // Радиус скругления
    roundedCaps: false,       // Скругленные окончания
    showLabels: true,         // Отображение подписей модульной сетки
    duplicateLayers: 1        // Количество слоев дубликатов
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
const duplicateLayersSlider = document.getElementById('duplicateLayers');
const duplicateLayersValue = document.getElementById('duplicateLayersValue');
const exportSVGButton = document.getElementById('exportSVG');

// Функция инициализации
function init() {
    // Установка начальных значений
    lineThicknessSlider.value = params.lineThickness;
    cornerRadiusSlider.value = params.cornerRadius;
    duplicateLayersSlider.value = params.duplicateLayers;
    updateThicknessValue();
    updateCornerRadiusValue();
    updateDuplicateLayersValue();
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
    
    duplicateLayersSlider.addEventListener('input', function() {
        params.duplicateLayers = parseInt(this.value);
        updateDuplicateLayersValue();
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

// Обновление отображения значения количества слоев дубликатов
function updateDuplicateLayersValue() {
    duplicateLayersValue.textContent = params.duplicateLayers.toString();
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
    
    // Рисуем дубликаты в соответствии с выбранным количеством слоев
    for (let layer = 1; layer <= params.duplicateLayers; layer++) {
        // Рисуем дубликаты для текущего слоя
        drawDuplicateLayer(layer);
    }
}

// Функция для рисования слоя дубликатов (1 слой = 2 дубликата симметрично)
function drawDuplicateLayer(layerIndex) {
    // Для первого слоя используем текущие смещения
    if (layerIndex === 1) {
        // Первая диагональная ось (K1-K7)
        // Рисуем первый дубликат паттерна со смещением (вверх вправо)
        drawDuplicatePattern();
        
        // Рисуем второй дубликат паттерна со смещением (вниз влево)
        drawSecondDuplicatePattern();
        
        // Горизонтальная ось (K3-K9)
        // Рисуем третий дубликат паттерна со смещением (вправо)
        drawThirdDuplicatePattern();
        
        // Рисуем четвертый дубликат паттерна со смещением (влево)
        drawFourthDuplicatePattern();
        
        // Вторая диагональная ось (K11-K5)
        // Рисуем пятый дубликат паттерна со смещением (вниз вправо)
        drawFifthDuplicatePattern();
        
        // Рисуем шестой дубликат паттерна со смещением (вверх влево)
        drawSixthDuplicatePattern();
    } else {
        // Для последующих слоев вычисляем новые смещения на основе предыдущего слоя
        
        // Первая диагональная ось (K1-K7)
        // Первый дубликат в слое (продолжение вверх вправо)
        drawLayeredDuplicatePattern(layerIndex, 1); 
        
        // Второй дубликат в слое (продолжение вниз влево)
        drawLayeredDuplicatePattern(layerIndex, 2);
        
        // Горизонтальная ось (K3-K9)
        // Третий дубликат в слое (продолжение вправо)
        drawLayeredDuplicatePattern(layerIndex, 3);
        
        // Четвертый дубликат в слое (продолжение влево)
        drawLayeredDuplicatePattern(layerIndex, 4);
        
        // Вторая диагональная ось (K11-K5)
        // Пятый дубликат в слое (продолжение вниз вправо)
        drawLayeredDuplicatePattern(layerIndex, 5);
        
        // Шестой дубликат в слое (продолжение вверх влево)
        drawLayeredDuplicatePattern(layerIndex, 6);
    }
}

// Функция для рисования дубликата на произвольном слое
function drawLayeredDuplicatePattern(layerIndex, patternType) {
    // Вычисляем координаты точек стыковки в зависимости от типа дубликата
    let k1Point, k2Point, offsetX, offsetY;
    
    if (patternType === 1 || patternType === 2) {
        // Первая диагональная ось (K1-K7)
        const angle1Hour = ((1 * 30) - 90) * Math.PI / 180; // 1 час = -60 градусов от вертикали
        const k1Point = {
            x: gridCenterX + Math.cos(angle1Hour) * 250, // 250 - радиус внешней окружности
            y: gridCenterY + Math.sin(angle1Hour) * 250
        };
        
        const angle7Hour = ((7 * 30) - 90) * Math.PI / 180; // 7 часов = 120 градусов от вертикали
        const k7Point = {
            x: gridCenterX + Math.cos(angle7Hour) * 250,
            y: gridCenterY + Math.sin(angle7Hour) * 250
        };
        
        const baseOffsetX = k1Point.x - k7Point.x;
        const baseOffsetY = k1Point.y - k7Point.y;
        
        // Для второго типа (вниз-влево) используем обратное смещение
        let offsetFactor = (patternType === 2) ? -1 : 1;
        
        offsetX = baseOffsetX * layerIndex * offsetFactor;
        offsetY = baseOffsetY * layerIndex * offsetFactor;
    } 
    else if (patternType === 3 || patternType === 4) {
        // Горизонтальная ось (K3-K9)
        const angle3Hour = ((3 * 30) - 90) * Math.PI / 180; // 3 часа = 0 градусов
        const k3Point = {
            x: gridCenterX + Math.cos(angle3Hour) * 250,
            y: gridCenterY + Math.sin(angle3Hour) * 250
        };
        
        const angle9Hour = ((9 * 30) - 90) * Math.PI / 180; // 9 часов = 180 градусов
        const k9Point = {
            x: gridCenterX + Math.cos(angle9Hour) * 250,
            y: gridCenterY + Math.sin(angle9Hour) * 250
        };
        
        const baseOffsetX = k3Point.x - k9Point.x;
        const baseOffsetY = k3Point.y - k9Point.y;
        
        // Для четвертого типа (влево) используем обратное смещение
        let offsetFactor = (patternType === 4) ? -1 : 1;
        
        offsetX = baseOffsetX * layerIndex * offsetFactor;
        offsetY = baseOffsetY * layerIndex * offsetFactor;
    }
    else if (patternType === 5 || patternType === 6) {
        // Вторая диагональная ось (K11-K5)
        const angle11Hour = ((11 * 30) - 90) * Math.PI / 180; // 11 часов = -30 градусов от вертикали
        const k11Point = {
            x: gridCenterX + Math.cos(angle11Hour) * 250,
            y: gridCenterY + Math.sin(angle11Hour) * 250
        };
        
        const angle5Hour = ((5 * 30) - 90) * Math.PI / 180; // 5 часов = 60 градусов от вертикали
        const k5Point = {
            x: gridCenterX + Math.cos(angle5Hour) * 250,
            y: gridCenterY + Math.sin(angle5Hour) * 250
        };
        
        const baseOffsetX = k11Point.x - k5Point.x;
        const baseOffsetY = k11Point.y - k5Point.y;
        
        // Для шестого типа (вверх влево) используем обратное смещение
        let offsetFactor = (patternType === 6) ? -1 : 1;
        
        offsetX = baseOffsetX * layerIndex * offsetFactor;
        offsetY = baseOffsetY * layerIndex * offsetFactor;
    }
    
    // Создаем точки для дубликата паттерна
    const duplicateCenter = { x: gridCenterX + offsetX, y: gridCenterY + offsetY };
    
    // Рисуем модульную сетку для дубликата (без индексов)
    drawDuplicateGrid(duplicateCenter);
    
    // Восстанавливаем стиль линии для дубликата паттерна
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = params.lineThickness;
    ctx.lineCap = params.roundedCaps ? 'round' : 'butt';
    ctx.lineJoin = params.roundedCaps ? 'round' : 'miter';
    
    // Точки исходной линии
    const points = [
        { x: 1135, y: 540.0001153 },
        { x: gridCenterX, y: gridCenterY },
        { x: 1047.5291575, y: 388.3952144 }
    ];
    
    // Смещаем все точки
    const shiftedPoints = points.map(point => ({
        x: point.x + offsetX,
        y: point.y + offsetY
    }));
    
    // Рисуем смещенную исходную линию со скруглением
    drawRoundedAngleLine(ctx, shiftedPoints, params.cornerRadius);
    
    // Рисуем смещенную линию, повернутую на 120 градусов
    const rotatedShiftedPoints1 = shiftedPoints.map(point => 
        rotatePoint(point.x, point.y, duplicateCenter.x, duplicateCenter.y, 120)
    );
    drawRoundedAngleLine(ctx, rotatedShiftedPoints1, params.cornerRadius);
    
    // Рисуем смещенную линию, повернутую на 240 градусов
    const rotatedShiftedPoints2 = shiftedPoints.map(point => 
        rotatePoint(point.x, point.y, duplicateCenter.x, duplicateCenter.y, 240)
    );
    drawRoundedAngleLine(ctx, rotatedShiftedPoints2, params.cornerRadius);
}

// Функция для рисования дубликата паттерна
function drawDuplicatePattern() {
    // Вычисляем координаты точки K1 (пересечение луча "1 час" с внешней окружностью)
    const angle1Hour = ((1 * 30) - 90) * Math.PI / 180; // 1 час = -60 градусов от вертикали
    const k1Point = {
        x: gridCenterX + Math.cos(angle1Hour) * 250, // 250 - радиус внешней окружности
        y: gridCenterY + Math.sin(angle1Hour) * 250
    };
    
    // Вычисляем координаты точки K7 (пересечение луча "7 часов" с внешней окружностью)
    const angle7Hour = ((7 * 30) - 90) * Math.PI / 180; // 7 часов = 120 градусов от вертикали
    const k7Point = {
        x: gridCenterX + Math.cos(angle7Hour) * 250,
        y: gridCenterY + Math.sin(angle7Hour) * 250
    };
    
    // Вычисляем смещение, при котором K7 оригинала совпадет с K1 дубля
    // Для смещения вправо-вверх используем обратное вычисление
    const offsetX = k1Point.x - k7Point.x;
    const offsetY = k1Point.y - k7Point.y;
    
    // Создаем точки для дубликата паттерна
    const duplicateCenter = { x: gridCenterX + offsetX, y: gridCenterY + offsetY };
    
    // Рисуем модульную сетку для дубликата (без индексов)
    drawDuplicateGrid(duplicateCenter);
    
    // Восстанавливаем стиль линии для дубликата паттерна
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = params.lineThickness;
    ctx.lineCap = params.roundedCaps ? 'round' : 'butt';
    ctx.lineJoin = params.roundedCaps ? 'round' : 'miter';
    
    // Точки исходной линии
    const points = [
        { x: 1135, y: 540.0001153 },
        { x: gridCenterX, y: gridCenterY },
        { x: 1047.5291575, y: 388.3952144 }
    ];
    
    // Смещаем все точки
    const shiftedPoints = points.map(point => ({
        x: point.x + offsetX,
        y: point.y + offsetY
    }));
    
    // Рисуем смещенную исходную линию со скруглением
    drawRoundedAngleLine(ctx, shiftedPoints, params.cornerRadius);
    
    // Рисуем смещенную линию, повернутую на 120 градусов
    const rotatedShiftedPoints1 = shiftedPoints.map(point => 
        rotatePoint(point.x, point.y, duplicateCenter.x, duplicateCenter.y, 120)
    );
    drawRoundedAngleLine(ctx, rotatedShiftedPoints1, params.cornerRadius);
    
    // Рисуем смещенную линию, повернутую на 240 градусов
    const rotatedShiftedPoints2 = shiftedPoints.map(point => 
        rotatePoint(point.x, point.y, duplicateCenter.x, duplicateCenter.y, 240)
    );
    drawRoundedAngleLine(ctx, rotatedShiftedPoints2, params.cornerRadius);
}

// Функция для рисования второго дубликата паттерна (вниз влево)
function drawSecondDuplicatePattern() {
    // Вычисляем координаты точки K1 (пересечение луча "1 час" с внешней окружностью)
    const angle1Hour = ((1 * 30) - 90) * Math.PI / 180; // 1 час = -60 градусов от вертикали
    const k1Point = {
        x: gridCenterX + Math.cos(angle1Hour) * 250, // 250 - радиус внешней окружности
        y: gridCenterY + Math.sin(angle1Hour) * 250
    };
    
    // Вычисляем координаты точки K7 (пересечение луча "7 часов" с внешней окружностью)
    const angle7Hour = ((7 * 30) - 90) * Math.PI / 180; // 7 часов = 120 градусов от вертикали
    const k7Point = {
        x: gridCenterX + Math.cos(angle7Hour) * 250,
        y: gridCenterY + Math.sin(angle7Hour) * 250
    };
    
    // Вычисляем смещение в противоположную сторону (K7 основного будет совмещаться с K1 нового)
    const offsetX = k7Point.x - k1Point.x;
    const offsetY = k7Point.y - k1Point.y;
    
    // Создаем точки для дубликата паттерна
    const duplicateCenter = { x: gridCenterX + offsetX, y: gridCenterY + offsetY };
    
    // Рисуем модульную сетку для дубликата (без индексов)
    drawDuplicateGrid(duplicateCenter);
    
    // Восстанавливаем стиль линии для дубликата паттерна
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = params.lineThickness;
    ctx.lineCap = params.roundedCaps ? 'round' : 'butt';
    ctx.lineJoin = params.roundedCaps ? 'round' : 'miter';
    
    // Точки исходной линии
    const points = [
        { x: 1135, y: 540.0001153 },
        { x: gridCenterX, y: gridCenterY },
        { x: 1047.5291575, y: 388.3952144 }
    ];
    
    // Смещаем все точки
    const shiftedPoints = points.map(point => ({
        x: point.x + offsetX,
        y: point.y + offsetY
    }));
    
    // Рисуем смещенную исходную линию со скруглением
    drawRoundedAngleLine(ctx, shiftedPoints, params.cornerRadius);
    
    // Рисуем смещенную линию, повернутую на 120 градусов
    const rotatedShiftedPoints1 = shiftedPoints.map(point => 
        rotatePoint(point.x, point.y, duplicateCenter.x, duplicateCenter.y, 120)
    );
    drawRoundedAngleLine(ctx, rotatedShiftedPoints1, params.cornerRadius);
    
    // Рисуем смещенную линию, повернутую на 240 градусов
    const rotatedShiftedPoints2 = shiftedPoints.map(point => 
        rotatePoint(point.x, point.y, duplicateCenter.x, duplicateCenter.y, 240)
    );
    drawRoundedAngleLine(ctx, rotatedShiftedPoints2, params.cornerRadius);
}

// Функция для рисования третьего дубликата паттерна (вправо)
function drawThirdDuplicatePattern() {
    // Вычисляем координаты точки K3 (пересечение луча "3 часа" с внешней окружностью)
    const angle3Hour = ((3 * 30) - 90) * Math.PI / 180; // 3 часа = 0 градусов
    const k3Point = {
        x: gridCenterX + Math.cos(angle3Hour) * 250,
        y: gridCenterY + Math.sin(angle3Hour) * 250
    };
    
    // Вычисляем координаты точки K9 (пересечение луча "9 часов" с внешней окружностью)
    const angle9Hour = ((9 * 30) - 90) * Math.PI / 180; // 9 часов = 180 градусов
    const k9Point = {
        x: gridCenterX + Math.cos(angle9Hour) * 250,
        y: gridCenterY + Math.sin(angle9Hour) * 250
    };
    
    // Вычисляем смещение, при котором K9 оригинала совпадет с K3 дубля
    const offsetX = k3Point.x - k9Point.x;
    const offsetY = k3Point.y - k9Point.y;
    
    // Создаем точки для дубликата паттерна
    const duplicateCenter = { x: gridCenterX + offsetX, y: gridCenterY + offsetY };
    
    // Рисуем модульную сетку для дубликата (без индексов)
    drawDuplicateGrid(duplicateCenter);
    
    // Восстанавливаем стиль линии для дубликата паттерна
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = params.lineThickness;
    ctx.lineCap = params.roundedCaps ? 'round' : 'butt';
    ctx.lineJoin = params.roundedCaps ? 'round' : 'miter';
    
    // Точки исходной линии
    const points = [
        { x: 1135, y: 540.0001153 },
        { x: gridCenterX, y: gridCenterY },
        { x: 1047.5291575, y: 388.3952144 }
    ];
    
    // Смещаем все точки
    const shiftedPoints = points.map(point => ({
        x: point.x + offsetX,
        y: point.y + offsetY
    }));
    
    // Рисуем смещенную исходную линию со скруглением
    drawRoundedAngleLine(ctx, shiftedPoints, params.cornerRadius);
    
    // Рисуем смещенную линию, повернутую на 120 градусов
    const rotatedShiftedPoints1 = shiftedPoints.map(point => 
        rotatePoint(point.x, point.y, duplicateCenter.x, duplicateCenter.y, 120)
    );
    drawRoundedAngleLine(ctx, rotatedShiftedPoints1, params.cornerRadius);
    
    // Рисуем смещенную линию, повернутую на 240 градусов
    const rotatedShiftedPoints2 = shiftedPoints.map(point => 
        rotatePoint(point.x, point.y, duplicateCenter.x, duplicateCenter.y, 240)
    );
    drawRoundedAngleLine(ctx, rotatedShiftedPoints2, params.cornerRadius);
}

// Функция для рисования четвертого дубликата паттерна (влево)
function drawFourthDuplicatePattern() {
    // Вычисляем координаты точки K3 (пересечение луча "3 часа" с внешней окружностью)
    const angle3Hour = ((3 * 30) - 90) * Math.PI / 180; // 3 часа = 0 градусов
    const k3Point = {
        x: gridCenterX + Math.cos(angle3Hour) * 250,
        y: gridCenterY + Math.sin(angle3Hour) * 250
    };
    
    // Вычисляем координаты точки K9 (пересечение луча "9 часов" с внешней окружностью)
    const angle9Hour = ((9 * 30) - 90) * Math.PI / 180; // 9 часов = 180 градусов
    const k9Point = {
        x: gridCenterX + Math.cos(angle9Hour) * 250,
        y: gridCenterY + Math.sin(angle9Hour) * 250
    };
    
    // Вычисляем смещение, при котором K3 оригинала совпадет с K9 дубля
    const offsetX = k9Point.x - k3Point.x;
    const offsetY = k9Point.y - k3Point.y;
    
    // Создаем точки для дубликата паттерна
    const duplicateCenter = { x: gridCenterX + offsetX, y: gridCenterY + offsetY };
    
    // Рисуем модульную сетку для дубликата (без индексов)
    drawDuplicateGrid(duplicateCenter);
    
    // Восстанавливаем стиль линии для дубликата паттерна
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = params.lineThickness;
    ctx.lineCap = params.roundedCaps ? 'round' : 'butt';
    ctx.lineJoin = params.roundedCaps ? 'round' : 'miter';
    
    // Точки исходной линии
    const points = [
        { x: 1135, y: 540.0001153 },
        { x: gridCenterX, y: gridCenterY },
        { x: 1047.5291575, y: 388.3952144 }
    ];
    
    // Смещаем все точки
    const shiftedPoints = points.map(point => ({
        x: point.x + offsetX,
        y: point.y + offsetY
    }));
    
    // Рисуем смещенную исходную линию со скруглением
    drawRoundedAngleLine(ctx, shiftedPoints, params.cornerRadius);
    
    // Рисуем смещенную линию, повернутую на 120 градусов
    const rotatedShiftedPoints1 = shiftedPoints.map(point => 
        rotatePoint(point.x, point.y, duplicateCenter.x, duplicateCenter.y, 120)
    );
    drawRoundedAngleLine(ctx, rotatedShiftedPoints1, params.cornerRadius);
    
    // Рисуем смещенную линию, повернутую на 240 градусов
    const rotatedShiftedPoints2 = shiftedPoints.map(point => 
        rotatePoint(point.x, point.y, duplicateCenter.x, duplicateCenter.y, 240)
    );
    drawRoundedAngleLine(ctx, rotatedShiftedPoints2, params.cornerRadius);
}

// Функция для рисования пятого дубликата паттерна (вниз вправо)
function drawFifthDuplicatePattern() {
    // Вычисляем координаты точки K11 (пересечение луча "11 часов" с внешней окружностью)
    const angle11Hour = ((11 * 30) - 90) * Math.PI / 180; // 11 часов = -30 градусов от вертикали
    const k11Point = {
        x: gridCenterX + Math.cos(angle11Hour) * 250,
        y: gridCenterY + Math.sin(angle11Hour) * 250
    };
    
    // Вычисляем координаты точки K5 (пересечение луча "5 часов" с внешней окружностью)
    const angle5Hour = ((5 * 30) - 90) * Math.PI / 180; // 5 часов = 60 градусов от вертикали
    const k5Point = {
        x: gridCenterX + Math.cos(angle5Hour) * 250,
        y: gridCenterY + Math.sin(angle5Hour) * 250
    };
    
    // Вычисляем смещение, при котором K5 оригинала совпадет с K11 дубля
    const offsetX = k11Point.x - k5Point.x;
    const offsetY = k11Point.y - k5Point.y;
    
    // Создаем точки для дубликата паттерна
    const duplicateCenter = { x: gridCenterX + offsetX, y: gridCenterY + offsetY };
    
    // Рисуем модульную сетку для дубликата (без индексов)
    drawDuplicateGrid(duplicateCenter);
    
    // Восстанавливаем стиль линии для дубликата паттерна
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = params.lineThickness;
    ctx.lineCap = params.roundedCaps ? 'round' : 'butt';
    ctx.lineJoin = params.roundedCaps ? 'round' : 'miter';
    
    // Точки исходной линии
    const points = [
        { x: 1135, y: 540.0001153 },
        { x: gridCenterX, y: gridCenterY },
        { x: 1047.5291575, y: 388.3952144 }
    ];
    
    // Смещаем все точки
    const shiftedPoints = points.map(point => ({
        x: point.x + offsetX,
        y: point.y + offsetY
    }));
    
    // Рисуем смещенную исходную линию со скруглением
    drawRoundedAngleLine(ctx, shiftedPoints, params.cornerRadius);
    
    // Рисуем смещенную линию, повернутую на 120 градусов
    const rotatedShiftedPoints1 = shiftedPoints.map(point => 
        rotatePoint(point.x, point.y, duplicateCenter.x, duplicateCenter.y, 120)
    );
    drawRoundedAngleLine(ctx, rotatedShiftedPoints1, params.cornerRadius);
    
    // Рисуем смещенную линию, повернутую на 240 градусов
    const rotatedShiftedPoints2 = shiftedPoints.map(point => 
        rotatePoint(point.x, point.y, duplicateCenter.x, duplicateCenter.y, 240)
    );
    drawRoundedAngleLine(ctx, rotatedShiftedPoints2, params.cornerRadius);
}

// Функция для рисования шестого дубликата паттерна (вверх влево)
function drawSixthDuplicatePattern() {
    // Вычисляем координаты точки K11 (пересечение луча "11 часов" с внешней окружностью)
    const angle11Hour = ((11 * 30) - 90) * Math.PI / 180; // 11 часов = -30 градусов от вертикали
    const k11Point = {
        x: gridCenterX + Math.cos(angle11Hour) * 250,
        y: gridCenterY + Math.sin(angle11Hour) * 250
    };
    
    // Вычисляем координаты точки K5 (пересечение луча "5 часов" с внешней окружностью)
    const angle5Hour = ((5 * 30) - 90) * Math.PI / 180; // 5 часов = 60 градусов от вертикали
    const k5Point = {
        x: gridCenterX + Math.cos(angle5Hour) * 250,
        y: gridCenterY + Math.sin(angle5Hour) * 250
    };
    
    // Вычисляем смещение, при котором K11 оригинала совпадет с K5 дубля
    const offsetX = k5Point.x - k11Point.x;
    const offsetY = k5Point.y - k11Point.y;
    
    // Создаем точки для дубликата паттерна
    const duplicateCenter = { x: gridCenterX + offsetX, y: gridCenterY + offsetY };
    
    // Рисуем модульную сетку для дубликата (без индексов)
    drawDuplicateGrid(duplicateCenter);
    
    // Восстанавливаем стиль линии для дубликата паттерна
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = params.lineThickness;
    ctx.lineCap = params.roundedCaps ? 'round' : 'butt';
    ctx.lineJoin = params.roundedCaps ? 'round' : 'miter';
    
    // Точки исходной линии
    const points = [
        { x: 1135, y: 540.0001153 },
        { x: gridCenterX, y: gridCenterY },
        { x: 1047.5291575, y: 388.3952144 }
    ];
    
    // Смещаем все точки
    const shiftedPoints = points.map(point => ({
        x: point.x + offsetX,
        y: point.y + offsetY
    }));
    
    // Рисуем смещенную исходную линию со скруглением
    drawRoundedAngleLine(ctx, shiftedPoints, params.cornerRadius);
    
    // Рисуем смещенную линию, повернутую на 120 градусов
    const rotatedShiftedPoints1 = shiftedPoints.map(point => 
        rotatePoint(point.x, point.y, duplicateCenter.x, duplicateCenter.y, 120)
    );
    drawRoundedAngleLine(ctx, rotatedShiftedPoints1, params.cornerRadius);
    
    // Рисуем смещенную линию, повернутую на 240 градусов
    const rotatedShiftedPoints2 = shiftedPoints.map(point => 
        rotatePoint(point.x, point.y, duplicateCenter.x, duplicateCenter.y, 240)
    );
    drawRoundedAngleLine(ctx, rotatedShiftedPoints2, params.cornerRadius);
}

// Функция рисования модульной сетки для дубликата (без индексов)
function drawDuplicateGrid(centerPoint) {
    ctx.strokeStyle = '#3F3F3F';
    ctx.lineWidth = 0.5;
    
    // Рисуем круги
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
    
    // Добавляем дубликаты в SVG
    for (let layer = 1; layer <= params.duplicateLayers; layer++) {
        // Экспортируем дубликаты для текущего слоя
        exportDuplicateLayer(svgElement, mainGroup, layer);
    }
    
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

// Функция для экспорта слоя дубликатов в SVG
function exportDuplicateLayer(svgElement, mainGroup, layerIndex) {
    // Для первого слоя используем текущие смещения
    if (layerIndex === 1) {
        // Первая диагональная ось (K1-K7)
        // Первый дубликат (вверх вправо)
        exportLayeredDuplicate(svgElement, mainGroup, layerIndex, 1);
        
        // Второй дубликат (вниз влево)
        exportLayeredDuplicate(svgElement, mainGroup, layerIndex, 2);
        
        // Горизонтальная ось (K3-K9)
        // Третий дубликат (вправо)
        exportLayeredDuplicate(svgElement, mainGroup, layerIndex, 3);
        
        // Четвертый дубликат (влево)
        exportLayeredDuplicate(svgElement, mainGroup, layerIndex, 4);
        
        // Вторая диагональная ось (K11-K5)
        // Пятый дубликат (вниз вправо)
        exportLayeredDuplicate(svgElement, mainGroup, layerIndex, 5);
        
        // Шестой дубликат (вверх влево)
        exportLayeredDuplicate(svgElement, mainGroup, layerIndex, 6);
    } else {
        // Для последующих слоев вычисляем новые смещения
        
        // Первая диагональная ось (K1-K7)
        // Первый дубликат в слое (продолжение вверх вправо)
        exportLayeredDuplicate(svgElement, mainGroup, layerIndex, 1);
        
        // Второй дубликат в слое (продолжение вниз влево)
        exportLayeredDuplicate(svgElement, mainGroup, layerIndex, 2);
        
        // Горизонтальная ось (K3-K9)
        // Третий дубликат в слое (продолжение вправо)
        exportLayeredDuplicate(svgElement, mainGroup, layerIndex, 3);
        
        // Четвертый дубликат в слое (продолжение влево)
        exportLayeredDuplicate(svgElement, mainGroup, layerIndex, 4);
        
        // Вторая диагональная ось (K11-K5)
        // Пятый дубликат в слое (продолжение вниз вправо)
        exportLayeredDuplicate(svgElement, mainGroup, layerIndex, 5);
        
        // Шестой дубликат в слое (продолжение вверх влево)
        exportLayeredDuplicate(svgElement, mainGroup, layerIndex, 6);
    }
}

// Функция для экспорта конкретного дубликата в SVG
function exportLayeredDuplicate(svgElement, mainGroup, layerIndex, patternType) {
    // Вычисляем координаты точек стыковки и смещения в зависимости от типа дубликата
    let offsetX, offsetY;
    
    if (patternType === 1 || patternType === 2) {
        // Первая диагональная ось (K1-K7)
        const angle1Hour = ((1 * 30) - 90) * Math.PI / 180; // 1 час = -60 градусов от вертикали
        const k1Point = {
            x: gridCenterX + Math.cos(angle1Hour) * 250, // 250 - радиус внешней окружности
            y: gridCenterY + Math.sin(angle1Hour) * 250
        };
        
        const angle7Hour = ((7 * 30) - 90) * Math.PI / 180; // 7 часов = 120 градусов от вертикали
        const k7Point = {
            x: gridCenterX + Math.cos(angle7Hour) * 250,
            y: gridCenterY + Math.sin(angle7Hour) * 250
        };
        
        const baseOffsetX = k1Point.x - k7Point.x;
        const baseOffsetY = k1Point.y - k7Point.y;
        
        // Для второго типа (вниз-влево) используем обратное смещение
        let offsetFactor = (patternType === 2) ? -1 : 1;
        
        offsetX = baseOffsetX * layerIndex * offsetFactor;
        offsetY = baseOffsetY * layerIndex * offsetFactor;
    } 
    else if (patternType === 3 || patternType === 4) {
        // Горизонтальная ось (K3-K9)
        const angle3Hour = ((3 * 30) - 90) * Math.PI / 180; // 3 часа = 0 градусов
        const k3Point = {
            x: gridCenterX + Math.cos(angle3Hour) * 250,
            y: gridCenterY + Math.sin(angle3Hour) * 250
        };
        
        const angle9Hour = ((9 * 30) - 90) * Math.PI / 180; // 9 часов = 180 градусов
        const k9Point = {
            x: gridCenterX + Math.cos(angle9Hour) * 250,
            y: gridCenterY + Math.sin(angle9Hour) * 250
        };
        
        const baseOffsetX = k3Point.x - k9Point.x;
        const baseOffsetY = k3Point.y - k9Point.y;
        
        // Для четвертого типа (влево) используем обратное смещение
        let offsetFactor = (patternType === 4) ? -1 : 1;
        
        offsetX = baseOffsetX * layerIndex * offsetFactor;
        offsetY = baseOffsetY * layerIndex * offsetFactor;
    }
    else if (patternType === 5 || patternType === 6) {
        // Вторая диагональная ось (K11-K5)
        const angle11Hour = ((11 * 30) - 90) * Math.PI / 180; // 11 часов = -30 градусов от вертикали
        const k11Point = {
            x: gridCenterX + Math.cos(angle11Hour) * 250,
            y: gridCenterY + Math.sin(angle11Hour) * 250
        };
        
        const angle5Hour = ((5 * 30) - 90) * Math.PI / 180; // 5 часов = 60 градусов от вертикали
        const k5Point = {
            x: gridCenterX + Math.cos(angle5Hour) * 250,
            y: gridCenterY + Math.sin(angle5Hour) * 250
        };
        
        const baseOffsetX = k11Point.x - k5Point.x;
        const baseOffsetY = k11Point.y - k5Point.y;
        
        // Для шестого типа (вверх влево) используем обратное смещение
        let offsetFactor = (patternType === 6) ? -1 : 1;
        
        offsetX = baseOffsetX * layerIndex * offsetFactor;
        offsetY = baseOffsetY * layerIndex * offsetFactor;
    }
    
    const duplicateCenter = { x: gridCenterX + offsetX, y: gridCenterY + offsetY };
    
    // Создаем группу для модульной сетки дубликата
    const duplicateGridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Добавляем круги для дубликата
    for (let radius of gridRadii) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('class', 'st1');
        circle.setAttribute('cx', duplicateCenter.x);
        circle.setAttribute('cy', duplicateCenter.y);
        circle.setAttribute('r', radius);
        duplicateGridGroup.appendChild(circle);
    }
    
    // Добавляем линии от центра для дубликата
    const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    
    for (let angle of angles) {
        const radian = angle * Math.PI / 180;
        const endX = duplicateCenter.x + Math.cos(radian) * 250;
        const endY = duplicateCenter.y + Math.sin(radian) * 250;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'st1');
        line.setAttribute('x1', duplicateCenter.x);
        line.setAttribute('y1', duplicateCenter.y);
        line.setAttribute('x2', endX);
        line.setAttribute('y2', endY);
        duplicateGridGroup.appendChild(line);
    }
    
    svgElement.appendChild(duplicateGridGroup);
    
    // Точки исходной линии
    const points = [
        { x: 1135, y: 540.0001153 },
        { x: gridCenterX, y: gridCenterY },
        { x: 1047.5291575, y: 388.3952144 }
    ];
    
    // Смещаем все точки для дубликата
    const shiftedPoints = points.map(point => ({
        x: point.x + offsetX,
        y: point.y + offsetY
    }));
    
    // Создаем path для смещенной исходной линии со скруглением
    const pathDuplicate1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathDuplicate1.setAttribute('class', 'st0');
    pathDuplicate1.setAttribute('d', createRoundedAnglePath(shiftedPoints, params.cornerRadius));
    mainGroup.appendChild(pathDuplicate1);
    
    // Создаем path для смещенной линии, повернутой на 120 градусов
    const rotatedShiftedPoints1 = shiftedPoints.map(point => 
        rotatePoint(point.x, point.y, duplicateCenter.x, duplicateCenter.y, 120)
    );
    
    const pathDuplicate2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathDuplicate2.setAttribute('class', 'st0');
    pathDuplicate2.setAttribute('d', createRoundedAnglePath(rotatedShiftedPoints1, params.cornerRadius));
    mainGroup.appendChild(pathDuplicate2);
    
    // Создаем path для смещенной линии, повернутой на 240 градусов
    const rotatedShiftedPoints2 = shiftedPoints.map(point => 
        rotatePoint(point.x, point.y, duplicateCenter.x, duplicateCenter.y, 240)
    );
    
    const pathDuplicate3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathDuplicate3.setAttribute('class', 'st0');
    pathDuplicate3.setAttribute('d', createRoundedAnglePath(rotatedShiftedPoints2, params.cornerRadius));
    mainGroup.appendChild(pathDuplicate3);
}

// Инициализация при загрузке страницы
window.addEventListener('load', init); 