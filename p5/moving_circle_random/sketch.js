let x, y;
let diameter = 30;
const step = 4; // Скорость перемещения для контроллера
const sizeChangeStep = 5;
let blobbiness = 1; // Уровень "блобности"
const blobChangeStep = 0.01; // Шаг изменения "блобности"
let noiseScale = 0.05; // Масштаб шума
let trailEnabled = false;

function setup() {
    createCanvas(windowWidth, windowHeight);
    x = width / 2;
    y = height / 2;
    background(0);
    noiseDetail(2, 0.5); // Настройка качества шума
}

function draw() {
    if (!trailEnabled) {
        background(0); // Очищаем фон, если шлейф отключен
    }

    handleGamepad();

    drawBlob(x, y, diameter / 2, blobbiness); // Используем функцию для рисования "блоба"
}

function drawBlob(cx, cy, r, blobbiness) {
    fill(255);       // Белый цвет заливки
    stroke(0);       // Чёрный цвет обводки
    strokeWeight(1); // Толщина обводки в 1 пиксель

    beginShape();
    let noiseOffset = frameCount * 0.1; // Непрерывное изменение шума
    for (let angle = 0; angle < TWO_PI; angle += TWO_PI / 100) {
        let xoff = map(cos(angle), -1, 1, 0, noiseScale) + noiseOffset;
        let yoff = map(sin(angle), -1, 1, 0, noiseScale) + noiseOffset;
        let rOffset = noise(xoff, yoff) * blobbiness * r;
        let x = rOffset * cos(angle) + cx;
        let y = rOffset * sin(angle) + cy;
        vertex(x, y);
    }
    endShape(CLOSE);
}

function handleGamepad() {
    let gamepads = navigator.getGamepads();
    if (gamepads[0]) {
        let gp = gamepads[0];

        // Кнопки L2 и R2
        let L2 = gp.buttons[6].value;
        let R2 = gp.buttons[7].value;

        if (L2 > 0.1) {
            diameter = max(10, diameter - L2 * sizeChangeStep);
        }
        if (R2 > 0.1) {
            diameter = min(2000, diameter + R2 * sizeChangeStep);
        }

        // Кнопки L1 и R1 для изменения "блобности"
        if (gp.buttons[4].pressed) {
            blobbiness = max(0, blobbiness - blobChangeStep);
        }
        if (gp.buttons[5].pressed) {
            blobbiness = min(5, blobbiness + blobChangeStep);
        }

        // Кнопка "Крестик"
        if (gp.buttons[0].pressed) {
            trailEnabled = !trailEnabled;
        }
    }
}
