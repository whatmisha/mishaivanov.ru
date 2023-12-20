let x, y;
let diameter = 30;
const step = 4; // Скорость перемещения для контроллера
const sizeChangeStep = 5;
let smoothContour = true; // Плавность контура
let trailEnabled = false;

function setup() {
    createCanvas(windowWidth, windowHeight);
    x = width / 2;
    y = height / 2;
    background(0);
}

function draw() {
    if (!trailEnabled) {
        background(0); // Очищаем фон, если шлейф отключен
    }

    handleGamepad();

    if (smoothContour) {
        drawBezierCircle(x, y, diameter / 2); // Плавный круг
    } else {
        drawAngularCircle(x, y, diameter / 2); // Угловатый круг
    }
}

function drawBezierCircle(cx, cy, r) {
    const handleLength = r * 0.552284749831;

    fill(255);       // Белый цвет заливки
    stroke(0);       // Чёрный цвет обводки
    strokeWeight(1); // Толщина обводки в 1 пиксель

    beginShape();
    // Верхняя правая часть
    vertex(cx, cy - r);
    bezierVertex(cx + handleLength, cy - r, cx + r, cy - handleLength, cx + r, cy);
    // Нижняя правая часть
    bezierVertex(cx + r, cy + handleLength, cx + handleLength, cy + r, cx, cy + r);
    // Нижняя левая часть
    bezierVertex(cx - handleLength, cy + r, cx - r, cy + handleLength, cx - r, cy);
    // Верхняя левая часть
    bezierVertex(cx - r, cy - handleLength, cx - handleLength, cy - r, cx, cy - r);
    endShape(CLOSE);
}

function drawAngularCircle(cx, cy, r) {
    const numSides = 6; // Количество сторон угловатого круга
    fill(255); // Белый цвет заливки
    stroke(0); // Чёрный цвет обводки
    strokeWeight(1); // Толщина обводки в 1 пиксель

    beginShape();
    for (let i = 0; i < numSides; i++) {
        const angle = TWO_PI / numSides * i;
        const x = cx + cos(angle) * r;
        const y = cy + sin(angle) * r;
        vertex(x, y);
    }
    endShape(CLOSE);
}

function handleGamepad() {
    let gamepads = navigator.getGamepads();
    if (gamepads[0]) {
        let gp = gamepads[0];

        // Левый стик контроллера для управления положением
        let leftStickX = gp.axes[0];
        let leftStickY = gp.axes[1];

        if (Math.abs(leftStickX) > 0.1) {
            x += leftStickX * step;
        }
        if (Math.abs(leftStickY) > 0.1) {
            y += leftStickY * step;
        }

        // Кнопки L2 и R2 для изменения размера
        let L2 = gp.buttons[6].value;
        let R2 = gp.buttons[7].value;

        if (L2 > 0.1) {
            diameter = max(10, diameter - L2 * sizeChangeStep);
        }
        if (R2 > 0.1) {
            diameter = min(2000, diameter + R2 * sizeChangeStep);
        }

        // Кнопка "Квадрат" для переключения стиля контура
        if (gp.buttons[2].pressed) {
            smoothContour = !smoothContour;
        }

        // Кнопка "Крестик" для включения/выключения шлейфа
        if (gp.buttons[0].pressed) {
            trailEnabled = !trailEnabled;
        }
    }
}
