let x, y;

function setup() {
    createCanvas(windowWidth, windowHeight);
    x = width / 2;
    y = height / 2;
}

function draw() {
    background(220);
    fill(255, 0, 0);
    ellipse(x, y, 30, 30);
}

function keyPressed() {
    const step = 5;
    if (keyCode === LEFT_ARROW) {
        x -= step;
    } else if (keyCode === RIGHT_ARROW) {
        x += step;
    } else if (keyCode === UP_ARROW) {
        y -= step;
        return false; // Предотвращает скролл
    } else if (keyCode === DOWN_ARROW) {
        y += step;
        return false; // Предотвращает скролл
    }
}

