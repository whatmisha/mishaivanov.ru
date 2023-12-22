function setup() {
    createCanvas(windowWidth, windowHeight);
    noLoop();
}

function draw() {
    background(0);
    
    const cols = 5;
    const rows = 5;
    const moduleSize = 12;
    const gridWidth = cols * moduleSize;
    const gridHeight = rows * moduleSize;
    
    const startX = (width - gridWidth) / 2;
    const startY = (height - gridHeight) / 2;
    
    drawGrid(startX, startY, cols, rows, moduleSize);
    
    const letterA = "E0R1S1R2E0R1B3E0B0R2S0E0E0E0S2L1S1S1S1L2S0E0E0E0S2";
    drawLetter(letterA, startX, startY, cols, rows, moduleSize);
}

function drawGrid(x, y, cols, rows, size) {
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            const x1 = x + i * size;
            const y1 = y + j * size;
            stroke(255);
            strokeWeight(1);
            noFill();
            rect(x1, y1, size, size);
        }
    }
}

function drawLetter(code, x, y, cols, rows, size) {
    for (let i = 0; i < cols * rows; i++) {
        const moduleType = code.charAt(i * 2);
        const rotation = parseInt(code.charAt(i * 2 + 1));
        
        const moduleX = x + (i % cols) * size;
        const moduleY = y + Math.floor(i / cols) * size;
        
        switch (moduleType) {
            case 'S':
                drawStraight(moduleX, moduleY, size, rotation);
                break;
            case 'C':
                drawCentral(moduleX, moduleY, size, rotation);
                break;
            case 'J':
                drawJoint(moduleX, moduleY, size, rotation);
                break;
            case 'L':
                drawLink(moduleX, moduleY, size, rotation);
                break;
            case 'R':
                drawRound(moduleX, moduleY, size, rotation);
                break;
            case 'B':
                drawBend(moduleX, moduleY, size, rotation);
                break;
            case 'E':
                drawEmpty(moduleX, moduleY, size, rotation);
                break;
        }
    }
}

function drawStraight(x, y, size, rotation) {
    push();
    translate(x + size / 2, y + size / 2);
    rotate(rotation * PI / 2);
    fill(255);
    noStroke();
    rectMode(CENTER);
    rect(0, 0, size, size / 3);
    pop();
}

function drawCentral(x, y, size, rotation) {
    push();
    translate(x + size / 2, y + size / 2);
    rotate(rotation * PI / 2);
    fill(255);
    noStroke();
    rectMode(CENTER);
    rect(0, 0, size / 3, size / 3);
    pop();
}

function drawJoint(x, y, size, rotation) {
    push();
    translate(x + size / 2, y + size / 2);
    rotate(rotation * PI / 2);
    fill(255);
    noStroke();
    rectMode(CENTER);
    rect(0, 0, size, size / 3);
    rect(0, 0, size / 3, size);
    pop();
}

function drawLink(x, y, size, rotation) {
    push();
    translate(x + size / 2, y + size / 2);
    rotate(rotation * PI / 2);
    fill(255);
    noStroke();
    rectMode(CENTER);
    rect(0, 0, size, size / 3);
    rect(0, size / 3, size / 3, size / 3);
    pop();
}

function drawRound(x, y, size, rotation) {
    push();
    translate(x + size / 2, y + size / 2);
    rotate(rotation * PI / 2);
    fill(255);
    noStroke();
    arc(-size / 6, 0, size / 3, size / 3, 0, PI);
    pop();
}

function drawBend(x, y, size, rotation) {
    push();
    translate(x + size / 2, y + size / 2);
    rotate(rotation * PI / 2);
    fill(255);
    noStroke();
    arc(0, -size / 6, size / 3, size / 3, PI / 2, PI);
    pop();
}

function drawEmpty(x, y, size, rotation) {
    // Пустой модуль, только контур
}

