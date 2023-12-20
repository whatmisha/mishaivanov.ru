let x, y;
const diameter = 30; // Фиксированный диаметр круга
const radius = diameter / 2;
const step = 4; // Скорость перемещения для контроллера
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

    fill(255); // Заливка белым цветом
    stroke(255); // Цвет линии

    // Рисуем круг с помощью кривых Безье
    drawBezierCircle(x, y, radius);
}

function drawBezierCircle(cx, cy, r) {
    const numPoints = 8;
    const angleStep = TWO_PI / numPoints;
    const handleLength = r * 0.552284749831;

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

        // Обработка движения левого стика
        let leftStickX = gp.axes[0];
        let leftStickY = gp.axes[1];

        if (Math.abs(leftStickX) > 0.1) {
            x += leftStickX * step;
        }
        if (Math.abs(leftStickY) > 0.1) {
            y += leftStickY * step;
        }

        // Переключение трейла кнопкой "Крестик"
        if (gp.buttons[0].pressed) {
            trailEnabled = !trailEnabled;
        }
    }
}
