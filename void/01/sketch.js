let alphabet = {
    "A": "E0R1S1R2E0R1B3E0B0R2S0E0E0E0S2L1S1S1S1L2S0E0E0E0S2",
    // Другие символы здесь
};

let words = [
    "AAA",
];

function setup() {
    createCanvas(windowWidth, windowHeight);
    noLoop();
}

function draw() {
    background(0);
    
    const cols = 5;
    const rows = 5;
    const moduleSize = 12;
    const stem = moduleSize / 2;  // Толщина штриха
    const letterSpacing = moduleSize; // Отступ между группами модулей
    
    const gridWidth = cols * moduleSize * words[0].length + letterSpacing * (words[0].length - 1);
    const gridHeight = rows * moduleSize * words.length;
    
    const startX = (width - gridWidth) / 2;
    const startY = (height - gridHeight) / 2;
    
    drawGrid(startX, startY, cols, rows, moduleSize, letterSpacing, words[0].length);
    
    for (let w = 0; w < words.length; w++) {
        for (let l = 0; l < words[w].length; l++) {
            let letterCode = alphabet[words[w][l]] || alphabet[" "]; // Default to space if undefined
            let x = startX + l * (cols * moduleSize + letterSpacing); // Adjusted for letter spacing
            let y = startY + w * rows * moduleSize;
            drawLetter(letterCode, x, y, cols, rows, moduleSize, stem);
        }
    }
}

function drawGrid(x, y, cols, rows, size, spacing, numLetters) {
    for (let l = 0; l < numLetters; l++) {
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const x1 = x + i * size + l * (cols * size + spacing);
                const y1 = y + j * size;
                stroke(64);
                strokeWeight(1);
                noFill();
                rect(x1, y1, size, size);
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

//function drawStraight(x, y, w, h, a, stem) {
//    push();
//    translate(x + w / 2, y + h / 2);
//    rotate(a);
//    fill(255);
//    noStroke();
//    rectMode(CENTER);
//    rect(-w / 2, -h / 2, stem, h);
//    pop();
//}

function drawStraight(x, y, w, h, a, stem) {
    push();
    translate(x + w / 2, y + h / 2);
    rotate(a);
    fill(255);
    noStroke();
    rectMode(CENTER);
    rect(-w / 2, -h / 2, stem, h);
    pop();
}

function drawCentral(x, y, w, h, a, stem) {
    push();
    translate(x + w / 2, y + h / 2);
    rotate(a);
    fill(255);
    noStroke();
    rectMode(CENTER);
    rect(-w / 2, -h / 2, stem, stem);
    pop();
}

function drawJoint(x, y, w, h, a, stem) {
    push();
    translate(x + w / 2, y + h / 2);
    rotate(a);
    fill(255);
    noStroke();
    rectMode(CENTER);
    rect(-w / 2, -h / 2, stem, h);
    rect(-w / 2, -h / 2, w, stem);
    pop();
}

function drawLink(x, y, w, h, a, stem) {
    push();
    translate(x + w / 2, y + h / 2);
    rotate(a);
    fill(255);
    noStroke();
    rectMode(CENTER);
    rect(-w / 2, -h / 2, stem, h);
    rect(-w / 2, (h - stem) / 2, w, stem);
    pop();
}

function drawRound(x, y, w, h, a, stem) {
    push();
    noStroke();
    translate(x + w / 2, y + h / 2);
    rotate(a);
    fill(255);
    arc(0, -h / 2, stem * 2, stem * 2, HALF_PI, PI);
    pop();
}

function drawBend(x, y, w, h, a, stem) {
    push();
    fill(255);
    noStroke();
    translate(x + w / 2, y + h / 2);
    rotate(a);
    arc(0, -h / 2, stem, stem, HALF_PI, PI);
    pop();
}

function drawEmpty(x, y, w, h, a, stem) {
    // Этот модуль не имеет заливки, только контур сетки
}
