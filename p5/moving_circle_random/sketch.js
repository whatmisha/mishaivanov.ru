let x, y;
let diameter = 30;
const step = 4; // Скорость перемещения для контроллера
const sizeChangeStep = 5;
let distortionLevel = 0; // Уровень искажения контура
const distortionStep = 0.1; // Шаг изменения искажения
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

    drawDistortedBezierCircle(x, y, diameter / 2, distortionLevel); // Используем функцию для рисования искаженного круга
}

function drawDistortedBezierCircle(cx, cy, r, distortion) {
    const handleLength = r * 0.552284749831;
    const distortedHandleLength = handleLength + distortion * random(-1, 1);

    fill(255);       // Белый цвет заливки
    stroke(0);       // Чёрный цвет обводки
    strokeWeight(1); // Толщина обводки в 1 пиксель

    beginShape();
    // Верхняя правая часть
    vertex(cx, cy - r);
    bezierVertex(cx + distortedHandleLength, cy - r, cx + r, cy - distortedHandleLength, cx + r, cy);
    // Нижняя правая часть
    bezierVertex(cx + r, cy + distortedHandleLength, cx + distortedHandleLength, cy + r, cx, cy + r);
    // Нижняя левая часть
    bezierVertex(cx - distortedHandleLength, cy + r, cx - r, cy + distortedHandleLength, cx - r, cy);
    // Верхняя левая часть
    bezierVertex(cx - r, cy - distortedHandleLength, cx - distortedHandleLength, cy - r, cx, cy - r);
    endShape(CLOSE);
}

function handleGamepad() {
    let gamepads = navigator.getGamepads();
    if (gamepads[0]) {
        let gp = gamepads[0];

        // Левый стик контроллера
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

        // Кнопки L1 и R1 для изменения искажения
        if (gp.buttons[4].pressed) {
            distortionLevel = max(0, distortionLevel - distortionStep);
        }
        if (gp.buttons[5].pressed) {
            distortionLevel = min(50, distortionLevel + distortionStep);
        }

        // Кнопка "Крестик"
        if (gp.buttons[0].pressed) {
            trailEnabled = !trailEnabled;
        }
    }
}
