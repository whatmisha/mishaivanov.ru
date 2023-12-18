let x, y;
const step = 2; // Меньшее значение для более плавного управления
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
    background(0);

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

    fill(255, 255, 255);
    ellipse(x, y, 30, 30);
}

function keyPressed() {
    if (keyCode === LEFT_ARROW) {
        movingLeft = true;
    } else if (keyCode === RIGHT_ARROW) {
        movingRight = true;
    } else if (keyCode === UP_ARROW) {
        movingUp = true;
    } else if (keyCode === DOWN_ARROW) {
        movingDown = true;
    }
}

function keyReleased() {
    if (keyCode === LEFT_ARROW) {
        movingLeft = false;
    } else if (keyCode === RIGHT_ARROW) {
        movingRight = false;
    } else if (keyCode === UP_ARROW) {
        movingUp = false;
    } else if (keyCode === DOWN_ARROW) {
        movingDown = false;
    }
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
    }
}
