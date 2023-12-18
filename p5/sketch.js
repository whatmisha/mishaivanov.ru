let x, y;
let movingLeft = false;
let movingRight = false;
let movingUp = false;
let movingDown = false;
const step = 5;

function setup() {
    createCanvas(windowWidth, windowHeight);
    x = width / 2;
    y = height / 2;
}

function draw() {
    background(220);

    if (movingLeft) {
        x -= step;
    }
    if (movingRight) {
        x += step;
    }
    if (movingUp) {
        y -= step;
    }
    if (movingDown) {
        y += step;
    }

    fill(255, 0, 0);
    ellipse(x, y, 30, 30);
}

function keyPressed() {
    if (keyCode === LEFT_ARROW) {
        movingLeft = true;
    } else if (keyCode === RIGHT_ARROW) {
        movingRight = true;
    } else if (keyCode === UP_ARROW) {
        movingUp = true;
    } else if (keyCode === DOWN_ARROW) {
        movingDown = true;
    }
}

function keyReleased() {
    if (keyCode === LEFT_ARROW) {
        movingLeft = false;
    } else if (keyCode === RIGHT_ARROW) {
        movingRight = false;
    } else if (keyCode === UP_ARROW) {
        movingUp = false;
    } else if (keyCode === DOWN_ARROW) {
        movingDown = false;
    }
}

// Блокировка скроллинга при нажатии клавиш вверх/вниз
window.addEventListener("keydown", function(e) {
    if(["ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
    }
}, false);
