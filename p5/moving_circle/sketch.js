let diameter = 30;
const sizeChangeStep = 5;
let trailEnabled = false;

function setup() {
    createCanvas(windowWidth, windowHeight);
    background(0);
}

function draw() {
    if (!trailEnabled) {
        background(0); // Очищаем фон, если шлейф отключен
    }

    handleKeyboard();

    fill(255);
    ellipse(mouseX, mouseY, diameter, diameter);
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

function handleGamepad() {
    // Ваш код для обработки ввода с геймпада
}
