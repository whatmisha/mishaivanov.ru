let x, y;
const step = 2;

function setup() {
    createCanvas(windowWidth, windowHeight);
    x = width / 2;
    y = height / 2;
    background(0); // Черный фон
}

function draw() {
    handleGamepad();

    fill(255); // Белый цвет основного круга
    ellipse(x, y, 30, 30);
}

function handleGamepad() {
    let gamepads = navigator.getGamepads();
    if (gamepads[0]) {
        let gp = gamepads[0];

        // Левый стик контроллера
        let leftStickX = gp.axes[0];
        let leftStickY = gp.axes[1];
        let stickPressed = gp.buttons[10].pressed; // L3 кнопка (нажатие левого стика)

        if (Math.abs(leftStickX) > 0.1) {
            x += leftStickX * step;
        }
        if (Math.abs(leftStickY) > 0.1) {
            y += leftStickY * step;
        }

        if (stickPressed) {
            drawCircleAtCurrentPosition();
        }
    }
}

function drawCircleAtCurrentPosition() {
    fill(255); // Белый цвет для рисованных кругов
    ellipse(x, y, 30, 30);
}
