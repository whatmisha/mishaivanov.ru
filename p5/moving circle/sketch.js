let x, y;
let diameter = 30;
const step = 4;
const sizeChangeStep = 5;
let movingLeft = false;
let movingRight = false;
let movingUp = false;
let movingDown = false;
let trailEnabled = false; // Переменная для отслеживания состояния шлейфа

function setup() {
    createCanvas(windowWidth, windowHeight);
    x = width / 2;
    y = height / 2;
}

function draw() {
    if (!trailEnabled) {
        background(0); // Очищаем фон, если шлейф отключен
    }

    handleGamepad();

    if (movingLeft) {
        x -= step;
    }
    if (movingRight) {
        x += step;
    }
    if (movingUp) {
        y -= step;
    }
    if (movingDown) {
        y += step;
    }

    fill(255);
    ellipse(x, y, diameter, diameter);
}

function handleGamepad() {
    let gamepads = navigator.getGamepads();
    if (gamepads[0]) {
        let gp = gamepads[0];

        // Обработка движения
        let leftStickX = gp.axes[0];
        let leftStickY = gp.axes[1];

        if (Math.abs(leftStickX) > 0.1) {
            x += leftStickX * step;
        }
        if (Math.abs(leftStickY) > 0.1) {
            y += leftStickY * step;
        }

        // Обработка изменения размера
        let L2 = gp.buttons[6].value;
        let R2 = gp.buttons[7].value;

        if (L2 > 0.1) {
            diameter = max(10, diameter - L2 * sizeChangeStep);
        }
        if (R2 > 0.1) {
            diameter = min(2000, diameter + R2 * sizeChangeStep);
        }

        // Включение/выключение шлейфа
        if (gp.buttons[0].pressed) {
            trailEnabled = !trailEnabled;
        }
    }
}
