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
    // Оставляем эту функцию без изменений
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
        // Обработка движения и изменения размера остаётся без изменений

        // Кнопка "Квадрат" для переключения стиля контура
        if (gp.buttons[2].pressed) {
            smoothContour = !smoothContour;
        }
    }
}
