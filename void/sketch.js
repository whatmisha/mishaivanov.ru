// Определение цветов для разных модулей
const colors = {
    straight: [255, 0, 0], // Красный
    central: [0, 255, 0], // Зеленый
    joint: [0, 0, 255], // Синий
    link: [255, 255, 0], // Желтый
    round: [0, 255, 255], // Голубой
    bend: [255, 0, 255], // Фиолетовый
    empty: [255, 255, 255] // Белый
};

// Параметры дизайна шрифта
let cols = 5;
let rows = 5;
let alphabet = {"A": "E0R1S1R2E0R1B3E0B0R2S0E0E0E0S2L1S1S1S1L2S0E0E0E0S2"};
let letterSize = 200; // размер буквы
let stem = 24; // толщина штриха

function setup() {
    createCanvas(windowWidth, windowHeight);
    noLoop(); // Отрисовываем только один раз
}

function draw() {
    background(0); // Черный фон
    // Центрирование буквы на экране
    drawLetter("A", (width - cols * letterSize) / 2, (height - rows * letterSize) / 2, letterSize, letterSize);
}

function drawLetter(letter, x, y, letW, letH) {
    let w = letW / cols;
    let h = letH / rows;
    let code = alphabet[letter];

    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            let index = (i + j * cols) * 2;
            let x1 = x + w * i;
            let y1 = y + h * j;
            let a = parseInt(code.charAt(index + 1)) * PI / 2;

            switch (code.charAt(index)) {
                case 'S':
                    drawStraight_alt(x1, y1, w, h, a);
                    break;
                case 'C':
                    drawCentral_alt(x1, y1, w, h, a);
                    break;
                case 'J':
                    drawJoint_alt(x1, y1, w, h, a);
                    break;
                case 'L':
                    drawLink_alt(x1, y1, w, h, a);
                    break;
                case 'R':
                    drawRound_alt(x1, y1, w, h, a);
                    break;
                case 'B':
                    drawBend_alt(x1, y1, w, h, a);
                    break;
                case 'E':
                    drawEmpty_alt(x1, y1, w, h, a);
                    break;
            }
        }
    }
}

// Определение модульных функций для рисования частей буквы
function drawStraight_alt(x, y, w, h, a) {
    push();
    fill(...colors.straight);
    noStroke();
    translate(x + w / 2, y + h / 2);
    rotate(a);
    rectMode(CENTER);
    rect(0, 0, stem / 2, h);
    pop();
}

function drawCentral_alt(x, y, w, h, a) {
    push();
    fill(...colors.central);
    noStroke();
    translate(x + w / 2, y + h / 2);
    rotate(a);
    rectMode(CENTER);
    rect(0, 0, stem / 2, h);
    pop();
}

function drawJoint_alt(x, y, w, h, a) {
    push();
    fill(...colors.joint);
    noStroke();
    translate(x + w / 2, y + h / 2);
    rotate(a);
    rectMode(CENTER);
    rect(0, -h / 4, stem / 2, h);
    rect(-w / 4, 0, w, stem / 2);
    pop();
}

function drawLink_alt(x, y, w, h, a) {
    push();
    fill(...colors.link);
    noStroke();
    translate(x + w / 2, y + h / 2);
    rotate(a);
    rectMode(CENTER);
    rect(0, 0, stem / 2, h);
    rect(0, (h - stem) / 4, w, stem / 2);
    pop();
}

function drawRound_alt(x, y, w, h, a) {
    push();
    noStroke();
    translate(x + w / 2, y + h / 2);
    rotate(a);
    fill(...colors.round);
    arc(0, -h / 2, w, h, HALF_PI, PI);
    pop();
}

function drawBend_alt(x, y, w, h, a) {
    push();
    fill(...colors.bend);
    noStroke();
    translate(x + w / 2, y + h / 2);
    rotate(a);
    arc(0, -h / 2, stem, stem, HALF_PI, PI);
    pop();
}

function drawEmpty_alt(x, y, w, h, a) {
    push();
    noFill();
    stroke(...colors.empty);
    strokeWeight(2);
    translate(x + w / 2, y + h / 2);
    rotate(a);
    rectMode(CENTER);
    rect(0, 0, stem, stem);
    pop();
}
