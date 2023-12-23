let alphabet = {
    " ": "E0E0E0E00E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0",
    "A": "E0R1S1R2E0R1B3E0B0R2S0E0E0E0S2L1S1S1S1L2S0E0E0E0S2",
    "B": "L1S1S1S1R2L0S3S3S3R3S0E0E0B0R2S0E0E0E0S2L0S3S3S3R3",
    "C": "E0R1S1R2E0R1B3E0B0R2S0E0E0E0E0R0B2E0B1R3E0R0S3R3E0",
    "D": "L1S1S1R2E0S0E0E0B0R2S0E0E0E0S2S0E0E0B1R3L0S3S3R3E0",
    "E": "L1S1S1S1S1S0E0E0E0E0L1S1S1S1E0S0E0E0E0E0L0S3S3S3S3",
    "F": "L1S1S1S1S1S0E0E0E0E0L1S1S1S1E0S0E0E0E0E0S0E0E0E0E0",
    "G": "E0R1S1S1R2R1B3E0E0E0S0E0S1S1R2R0B2E0E0S2E0R0S3S3R3",
    "H": "S0E0E0E0S2S0E0E0E0S2L1S1S1S1L2S0E0E0E0S2S0E0E0E0S2",
    "I": "S1S1J1S1S1E0E0C0E0E0E0E0C0E0E0E0E0C0E0E0S3S3J3S3S3",
    "J": "S1S1S1S1L2E0E0E0E0S2S0E0E0E0S2R0B2E0B1R3E0R0S3R3E0",
    "K": "S0E0E0E0S2S0E0B1S3R3J0C1J2E0E0S0E0B0S1R2S0E0E0E0S2",
    "L": "S0E0E0E0E0S0E0E0E0E0S0E0E0E0E0S0E0E0E0E0L0S3S3S3S3",
    "M": "S0R1R2R1R2L1B3S2E0S2S0E0S2E0S2S0E0S2E0S2S0E0S2E0S2",
    "N": "S0R1S1S1R2L1B3E0E0S2S0E0E0E0S2S0E0E0E0S2S0E0E0E0S2",
    "O": "E0R1S1R2E0R1B3E0B0R2S0E0E0E0S2R0B2E0B1R3E0R0S3R3E0",
    "P": "L1S1S1S1R2L0B2E0E0S2S0R0S3S3R3S0E0E0E0E0S0E0E0E0E0",
    "Q": "E0R1S1R2E0R1B3E0B0R2S0E0E0E0S2R0B2E0E0R2E0R0S3R3S2",
    "R": "L1S1S1S1R2S0E0E0E0S2L0S3S3S3R3S0E0E0B0R2S0E0E0E0S2",
    "S": "E0R1S1R2E0R1B3E0B0R2R0S3S1S1R2R0B2E0B1R3E0R0S3R3E0",
    "T": "S1S1J1S1S1E0E0C0E0E0E0E0C0E0E0E0E0C0E0E0E0E0C0E0E0",
    "U": "S0E0E0E0S2S0E0E0E0S2S0E0E0E0S2S0E0E0E0S2R0S3S3S3R3",
    "V": "S0E0E0E0S2S0E0E0E0S2S0E0E0E0S2R0B2E0B1R3E0R0S3R3E0",
    "W": "S0E0C0E0S2S0E0C0E0S2S0B1J3B2S2S0S2E0S0S2R0R3E0R0R3",
    "X": "S1R2E0R1S1E0S2E0S0E0E0B0J1B3E0E0S2E0S0E0S3R3E0R0S3",
    "Y": "S1R2E0R1S1E0S2E0S0E0E0B0J1B3E0E0E0C0E0E0E0E0C0E0E0",
    "Z": "S1S1S1S1R2E0E0E0E0R3R1S1S1S1E0S0E0E0E0E0R0S3S3S3S3",
    
    "(": "R1S1S1E0E0S0E0E0E0E0S0E0E0E0E0S0E0E0E0E0R0S3S3E0E0",
    ")": "E0E0S1S1R2E0E0E0E0S2E0E0E0E0S2E0E0E0E0S2E0E0S3S3R3",
    "{": "E0R1S1E0E0R1B3E0E0E0S0E0E0E0E0R0B2E0E0E0E0R0S3E0E0",
    "}": "E0E0S1R2E0E0E0E0B0R2E0E0E0E0S2E0E0E0B1R3E0E0S3R3E0",
    "1": "E0S1L2E0E0E0E0S2E0E0E0E0S2E0E0E0E0S2E0E0S3S3L3S3S3",
    "2": "R1S1S1S1R2E0E0E0E0S2E0S3S3S3R3R1E0E0E0E0R0S3S3S3S3",
    "3": "S1S1S1S1R2E0E0E0E0R3E0S1S1S1R2E0E0E0E0S2S3S3S3S3R3",
    "4": "S0E0E0E0S2S0E0E0E0S2R0S3S3S3L3E0E0E0E0S2E0E0E0E0S2",
    "5": "L1S1S1S1S1R0E0E0E0E0E0S1S1S1R2E0E0E0E0S2R0S3S3S3R3",
    "6": "R1S1S1S1S1S0E0E0E0E0S0R1S1S1R2L1B3E0E0S2R0S3S3S3R3",
    "7": "S1S1S1S1R2E0E0E0E0R3E0E0R1S1E0E0E0S0E0E0E0E0S0E0E0",
    "8": "R1S1S1S1R2R0E0E0E0R3R1S1S1S1R2S0E0E0E0S2R0S3S3S3R3",
    "9": "R1S1S1S1R2S0E0E0B1L3R0S3S3R3S2E0E0E0E0S2S3S3S3S3R3",
    "0": "E0R1S1R2E0R1B3E0B0R2S0E0C1E0S2R0B2E0B1R3E0R0S3R3E0",
    
    "А": "E0R1S1R2E0R1B3E0B0R2S0E0E0E0S2L1S1S1S1L2S0E0E0E0S2",
    "Б": "L1S1S1S1S1L0S3S3S3E0S0E0E0B0R2S0E0E0E0S2L0S3S3S3R3",
    "В": "L1S1S1S1R2L0S3S3S3R3S0E0E0B0R2S0E0E0E0S2L0S3S3S3R3",
    "Г": "L1S1S1S1S1S0E0E0E0E0S0E0E0E0E0S0E0E0E0E0S0E0E0E0E0",
    "Д": "E0R1S1R2E0R1B3E0B0R2S0E0E0E0S2R0B2E0B1R3E0R0S3R3E0",
    "Е": "L1S1S1S1S1S0E0E0E0E0L1S1S1S1E0S0E0E0E0E0L0S3S3S3S3",
    
};

let words = [
    "ABCD",
    "EFGH",
    "IJKL",
    "MNOP",
    "QRST",
    "UVWX",
    "YZ  ",    
];


// Глобальные переменные
let cols = 5;  // Количество колонок в модуле
let rows = 5;  // Количество строк в модуле
let moduleSize = 12;  // Размер модуля
let stem = 6;  // Толщина штриха (динамически обновляется позже)
let letterSpacing = moduleSize; // Отступ между буквами

function setup() {
    createCanvas(windowWidth, windowHeight);
    noLoop();
}

function draw() {
    background(0);
    
    const startX = (width - (cols * moduleSize + letterSpacing) * words[0].length) / 2;
    const startY = (height - (rows * moduleSize + letterSpacing) * words.length) / 2;
    
    drawGrid(startX, startY, cols, rows, moduleSize, letterSpacing, words);
    
    for (let line = 0; line < words.length; line++) {
        for (let l = 0; l < words[line].length; l++) {
            let letterCode = alphabet[words[line][l]] || alphabet[" "]; // Default to space if undefined
            let x = startX + l * (cols * moduleSize + letterSpacing); // Adjusted for letter spacing
            let y = startY + line * (rows * moduleSize + letterSpacing); // Adjusted for line spacing
            drawLetter(letterCode, x, y, cols, rows, moduleSize, stem);
        }
    }
}

function drawGrid(x, y, cols, rows, size, spacing, words) {
    for (let line = 0; line < words.length; line++) {
        for (let l = 0; l < words[line].length; l++) {
            let letterX = x + l * (cols * size + spacing);
            let letterY = y + line * (rows * size + spacing);
            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    const x1 = letterX + i * size;
                    const y1 = letterY + j * size;
                    stroke(64);
                    strokeWeight(1);
                    noFill();
                    rect(x1, y1, size, size);
                }
            }
        }
    }
}


function drawLetter(code, x, y, cols, rows, size, stem) {
    for (let i = 0; i < cols * rows; i++) {
        const moduleType = code.charAt(i * 2);
        const rotation = parseInt(code.charAt(i * 2 + 1)) * HALF_PI; // Умножаем на HALF_PI для поворота
        
        const moduleX = x + (i % cols) * size;
        const moduleY = y + Math.floor(i / cols) * size;
        
        switch (moduleType) {
            case 'S':
                drawStraight(moduleX, moduleY, size, size, rotation, stem);
                break;
            case 'C':
                drawCentral(moduleX, moduleY, size, size, rotation, stem);
                break;
            case 'J':
                drawJoint(moduleX, moduleY, size, size, rotation, stem);
                break;
            case 'L':
                drawLink(moduleX, moduleY, size, size, rotation, stem);
                break;
            case 'R':
                drawRound(moduleX, moduleY, size, size, rotation, stem);
                break;
            case 'B':
                drawBend(moduleX, moduleY, size, size, rotation, stem);
                break;
            case 'E':
                drawEmpty(moduleX, moduleY, size, size, rotation, stem);
                break;
        }
    }
}

function drawStraight(x, y, w, h, a, stem) {
    push(); // Сохраняем текущее состояние холста
    fill(255); // Устанавливаем цвет заливки
    noStroke(); // Убираем обводку

    // Перемещаем начало координат в центр модуля
    translate(x + w / 2, y + h / 2);
    // Поворачиваем холст на угол a
    rotate(a);

    // Рисуем прямоугольник. Изменяем координаты начала отрисовки,
    // чтобы прямоугольник был прижат к левому краю модуля
    rectMode(CORNER); // Устанавливаем режим отрисовки от угла
    rect(-w / 2, -h / 2, stem, h); // Смещаем прямоугольник к левому краю

    pop(); // Восстанавливаем предыдущее состояние холста
}

function drawCentral(x, y, w, h, a, stem) {
    push();
    fill(255);
    noStroke();
    translate(x + w / 2, y + h / 2);
    rotate(a);
    rectMode(CORNER); // Устанавливаем режим отрисовки от угла
    rect(-stem / 2, -h / 2, stem, h); // Смещаем прямоугольник к центру

    pop();
}

function drawLink(x, y, w, h, a, stem) {
    push();
    fill(255);
    noStroke();
    translate(x + w / 2, y + h / 2);
    rotate(a);
    rectMode(CORNER);
    rect(-w / 2, -h / 2, stem, h);
    rect(-w / 2, h / 2 - stem, w, stem);
    pop();
}

function drawJoint(x, y, w, h, a, stem) {
    push();
    fill(255);
    noStroke();
    translate(x + w / 2, y + h / 2);
    rotate(a);
    rectMode(CORNER);

    // Рисуем первый прямоугольник по центру модуля
    rect(-w / 2, -h / 2, stem, h);

    // Рисуем второй прямоугольник, полностью выровненный по центру модуля
    rect(-w / 2, -stem / 2, w, stem);

    pop();
}

function drawRound(x, y, w, h, a, stem) {
    push();
    noStroke();
    translate(x + w / 2, y + h / 2);
    rotate(a);

    // Рисуем внешний белый сектор
    fill(255);
    arc(w / 2, -h / 2, w * 2, h * 2, HALF_PI, PI);

    // Рисуем внутренний черный сектор поверх белого с меньшим радиусом
    fill(0);
    arc(w / 2, -h / 2, max(w * 2 - stem * 2, stem), max(h * 2 - stem * 2, stem), HALF_PI, PI);

    pop();
}

function drawBend(x, y, w, h, a, stem) {
    push();
    noStroke();
    translate(x + w / 2, y + h / 2);
    rotate(a);
    fill(255);
    arc(w / 2, -h / 2, max(w * 2 - stem * 2, stem), max(h * 2 - stem * 2, stem), HALF_PI, PI);

    pop();
}

function drawEmpty(x, y, w, h, a, stem) {
    // Этот модуль не имеет заливки, только контур сетки
}
