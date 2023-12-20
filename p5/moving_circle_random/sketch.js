let x, y;
let diameter = 30;
const step = 4; // Скорость перемещения для контроллера
const sizeChangeStep = 5;
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

    drawBezierCircle(x, y, diameter / 2); // Используем функцию для рисования круга
}

function drawBezierCircle(cx, cy, r) {
    const numPoints = 16; // Увеличиваем количество точек
    const angleStep = TWO_PI / numPoints;
    const handleLength = r * 0.552284749831;

    fill(255);
    stroke(0); // Черная обводка
    strokeWeight(2); // Толщина обводки
    beginShape();
    for (let i = 0; i < TWO_PI; i += angleStep) {
        let px = cx + cos(i) * r;
        let py = cy + sin(i) * r;
        let nx = cx + cos(i + angleStep) * r;
        let ny = cy + sin(i + angleStep) * r;

        let c1x = px + cos(i - HALF_PI) * handleLength;
        let c1y = py + sin(i - HALF_PI) * handleLength;
        let c2x = nx + cos(i + HALF_PI) * handleLength;
        let c2y = ny + sin(i + HALF_PI) * handleLength;

        bezierVertex(c1x, c1y, c2x, c2y, nx, ny);
    }
    endShape(CLOSE);
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
    }
}
