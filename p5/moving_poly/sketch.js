let x, y;
let diameter = 30;
const step = 4; // Скорость перемещения для контроллера
const sizeChangeStep = 5;
let trailEnabled = false;
let numSides = 6; // Количество сторон многоугольника
let sidesChangeStep = 1 / 8; // Шаг изменения сторон (делаем его в 8 раз меньше)
let rotationAngle = 0; // Угол вращения фигуры
const rotationStep = 0.05; // Шаг изменения угла вращения

function setup() {
    createCanvas(windowWidth, windowHeight, SVG); // Установка рендера SVG
    x = width / 2;
    y = height / 2;
    background(0);
}

function draw() {
    if (!trailEnabled) {
        background(0); // Очищаем фон, если шлейф отключен
    }

    handleGamepad();
    drawAngularCircle(x, y, diameter / 2, Math.round(numSides), rotationAngle); // Многоугольник
}

function drawAngularCircle(cx, cy, r, numSides, rotation) {
    fill(255); // Белый цвет заливки
    stroke(0); // Чёрный цвет обводки
    strokeWeight(1); // Толщина обводки в 1 пиксель

    beginShape();
    for (let i = 0; i < numSides; i++) {
        const angle = TWO_PI / numSides * i + rotation;
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

        // Левый стик контроллера для управления положением
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

        // Обработка кнопок L1 и R1 для изменения количества сторон
        if (gp.buttons[4].pressed) {
            numSides = max(5, numSides - sidesChangeStep);
        }
        if (gp.buttons[5].pressed) {
            numSides = min(32, numSides + sidesChangeStep);
        }

        // Кнопка "Крестик" для включения/выключения шлейфа
        if (gp.buttons[0].pressed) {
            trailEnabled = !trailEnabled;
        }

        // Правый стик контроллера для вращения фигуры
        let rightStickX = gp.axes[2];
        rotationAngle += rightStickX * rotationStep;
    }
}

function keyPressed() {
    if (keyCode === 32) { // 32 - код клавиши пробела
        save(); // Сохраняем рисунок в SVG
    }
}
