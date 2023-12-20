let x, y;
let diameter = 30;
const step = 4; // Скорость перемещения для контроллера
const sizeChangeStep = 5;
const distortionStep = 0.05; // Шаг изменения искажения
let distortion = 0; // Степень искажения круга
let trailEnabled = false;

function setup() {
    createCanvas(windowWidth, windowHeight);
    x = width / 2;
    y = height / 2;
    background(0);
}

function draw() {
    if (!trailEnabled) {
        background(0);
    }

    handleGamepad();

    fill(255);
    ellipse(x, y, diameter * (1 + distortion), diameter * (1 - distortion));
}

function handleGamepad() {
    let gamepads = navigator.getGamepads();
    if (gamepads[0]) {
        let gp = gamepads[0];

        // Обработка движения левого стика
        let leftStickX = gp.axes[0];
        let leftStickY = gp.axes[1];

        if (Math.abs(leftStickX) > 0.1) {
            x += leftStickX * step;
        }
        if (Math.abs(leftStickY) > 0.1) {
            y += leftStickY * step;
        }

        // Обработка кнопок L2 и R2 для изменения размера
        let L2 = gp.buttons[6].value;
        let R2 = gp.buttons[7].value;

        if (L2 > 0.1) {
            diameter = max(10, diameter - L2 * sizeChangeStep);
        }
        if (R2 > 0.1) {
            diameter = min(2000, diameter + R2 * sizeChangeStep);
        }

        // Обработка кнопок L1 и R1 для изменения искажения
        let L1 = gp.buttons[4].pressed;
        let R1 = gp.buttons[5].pressed;

        if (L1) {
            distortion = max(-1, distortion - distortionStep);
        }
        if (R1) {
            distortion = min(1, distortion + distortionStep);
        }

        // Переключение трейла кнопкой "Крестик"
        if (gp.buttons[0].pressed) {
            trailEnabled = !trailEnabled;
        }
    }
}
