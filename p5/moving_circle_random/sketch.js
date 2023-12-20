let x, y;
let diameter = 30;
const step = 4; // Скорость перемещения для контроллера
const sizeChangeStep = 5;
let trailEnabled = false;
let noiseScale = 0.1; // Масштаб шума

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

    drawNoiseDistortedCircle(x, y, diameter / 2); // Используем функцию для рисования искаженного круга
}

function drawNoiseDistortedCircle(cx, cy, r) {
    const handleLength = r * 0.552284749831;

    fill(255);
    stroke(0); // Черная обводка
    strokeWeight(1); // Толщина обводки в 1 пиксель
    beginShape();
    // Рисуем круг с помощью восьми точек, разделенных на четыре сегмента
    for (let i = 0; i < TWO_PI; i += PI / 2) {
        let px = cx + cos(i) * r;
        let py = cy + sin(i) * r;
        let nx = cx + cos(i + PI / 2) * r;
        let ny = cy + sin(i + PI / 2) * r;

        // Применяем шум Перлина для создания искажения
        let offset = noise(px * noiseScale, py * noiseScale) * 10;
        let c1x = px + cos(i - PI / 2) * handleLength + offset;
        let c1y = py + sin(i - PI / 2) * handleLength + offset;
        offset = noise(nx * noiseScale, ny * noiseScale) * 10;
        let c2x = nx + cos(i + PI) * handleLength + offset;
        let c2y = ny + sin(i + PI) * handleLength + offset;

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
