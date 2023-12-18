let x, y;
let diameter = 30; // Начальный диаметр круга
const step = 2;
const sizeChangeStep = 1; // Шаг изменения размера
let movingLeft = false;
let movingRight = false;
let movingUp = false;
let movingDown = false;

function setup() {
    createCanvas(windowWidth, windowHeight);
    x = width / 2;
    y = height / 2;
}

function draw() {
    background(0); // Черный фон

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

    fill(255); // Белый цвет круга
    ellipse(x, y, diameter, diameter);
}

function handleGamepad() {
    let gamepads = navigator.getGamepads();
    if (gamepads[0]) {
        let gp = gamepads[0];

        // Левый стик контроллера
        let leftStickX = gp.axes[0];
        let leftStickY = gp.axes[1];

        // Кнопки L2 и R2
        let L2 = gp.buttons[6].value; // Значение от 0 до 1
        let R2 = gp.buttons[7].value; // Значение от 0 до 1

        if (Math.abs(leftStickX) > 0.1) {
            x += leftStickX * step;
        }
        if (Math.abs(leftStickY) > 0.1) {
            y += leftStickY * step;
        }

        // Изменение размера круга
        if (L2 > 0.1) {
            diameter = max(10, diameter - L2 * sizeChangeStep); // Не уменьшать диаметр меньше 10
        }
        if (R2 > 0.1) {
            diameter = min(2000, diameter + R2 * sizeChangeStep); // Максимальный размер - 2000 пикселей
        }
    }
}
