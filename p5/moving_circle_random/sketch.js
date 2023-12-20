let x, y;
let diameter = 30;
const step = 4; // Скорость перемещения для контроллера
const sizeChangeStep = 5;
let blobbiness = 10; // Уровень "блобности"
const blobChangeStep = 1; // Шаг изменения "блобности"
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

    drawBlob(x, y, diameter / 2, blobbiness); // Используем функцию для рисования "блоба"
}

function drawBlob(cx, cy, r, blobbiness) {
    const handleLength = r * 0.552284749831;

    fill(255);       // Белый цвет заливки
    stroke(0);       // Чёрный цвет обводки
    strokeWeight(1); // Толщина обводки в 1 пиксель

    beginShape();
    // Создаем "блоб" путем случайного изменения длины ручек Безье
    for (let angle = 0; angle < TWO_PI; angle += TWO_PI / 4) {
        let px = cos(angle) * r + cx;
        let py = sin(angle) * r + cy;
        let offset = random(-blobbiness, blobbiness);
        let handleOffset = handleLength + offset;

        if (angle === 0) {
            vertex(px, py);
        } else {
            bezierVertex(cx + cos(angle - PI / 4) * handleOffset, cy + sin(angle - PI / 4) * handleOffset,
                         px, py,
                         cx + cos(angle + PI / 4) * handleOffset, cy + sin(angle + PI / 4) * handleOffset);
        }
    }
    endShape(CLOSE);
}

function handleGamepad() {
    let gamepads = navigator.getGamepads();
    if (gamepads[0]) {
        let gp = gamepads[0];

        // Оставляем обработку стика и кнопок L2/R2 без изменений

        // Кнопки L1 и R1 для изменения "блобности"
        if (gp.buttons[4].pressed) {
            blobbiness = max(0, blobbiness - blobChangeStep);
        }
        if (gp.buttons[5].pressed) {
            blobbiness = min(100, blobbiness + blobChangeStep);
        }

        // Обработка кнопки "Крестик" остается без изменений
    }
}
