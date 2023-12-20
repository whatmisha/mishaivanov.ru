let x, y;
let diameter = 30;
const step = 4; // Скорость перемещения для контроллера
const sizeChangeStep = 5;
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

    drawBezierCircle(x, y, diameter / 2); // Используем функцию для рисования круга
}

function drawBezierCircle(cx, cy, r) {
    const handleLength = r * 0.552284749831;

    fill(255);
    noStroke();
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

        // Кнопки L2 и R2
        let L2 = gp.buttons[6].value;
        let R2 = gp.buttons[7].value;

        if (L2 > 0.1) {
            diameter = max(10, diameter - L2 * sizeChangeStep);
        }
        if (R2 > 0.1) {
            diameter = min(2000, diameter + R2 * sizeChangeStep);
        }

        // Кнопка "Крестик"
        if (gp.buttons[0].pressed) {
            trailEnabled = !trailEnabled;
        }
    }
}

function mouseMoved() {
    x = mouseX;
    y = mouseY;
}
