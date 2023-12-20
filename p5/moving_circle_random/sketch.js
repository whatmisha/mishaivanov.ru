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

    noFill(); // Не заполняем кривые Безье
    stroke(255); // Цвет линии

    let handleDistance = radius * 0.552284749831; // Коэффициент для круга

    // Рисуем круг с помощью кривых Безье
    beginShape();
    for (let i = 0; i < 2 * PI; i += PI / 2) {
        let sx = x + cos(i) * radius;
        let sy = y + sin(i) * radius;
        let ex = x + cos(i + PI / 2) * radius;
        let ey = y + sin(i + PI / 2) * radius;
        let cx1 = sx + cos(i - PI / 2) * handleDistance;
        let cy1 = sy + sin(i - PI / 2) * handleDistance;
        let cx2 = ex + cos(i + PI) * handleDistance;
        let cy2 = ey + sin(i + PI) * handleDistance;
        bezierVertex(cx1, cy1, cx2, cy2, ex, ey);
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