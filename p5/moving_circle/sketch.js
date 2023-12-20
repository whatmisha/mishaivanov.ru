let x, y;
let diameter = 30;
const step = 4; // Скорость перемещения для контроллера
const sizeChangeStep = 5;
let trailEnabled = false;
let usingGamepad = false;

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
    handleKeyboard();

    fill(255);
    ellipse(x, y, diameter, diameter);
}

function handleKeyboard() {
    if (keyIsDown(49)) { // Клавиша "1"
        diameter = max(10, diameter - sizeChangeStep);
    }
    if (keyIsDown(50)) { // Клавиша "2"
        diameter = min(2000, diameter + sizeChangeStep);
    }
}

function keyPressed() {
    if (keyCode === 32) { // Пробел
        trailEnabled = !trailEnabled;
    }
}

function mouseMoved() {
    if (!usingGamepad) {
        x = mouseX;
        y = mouseY;
    }
}

function handleGamepad() {
    let gamepads = navigator.getGamepads();
    if (gamepads[0]) {
        usingGamepad = true;
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
    } else {
        usingGamepad = false;
    }
}
