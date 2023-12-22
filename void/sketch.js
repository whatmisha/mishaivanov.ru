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
    const gridWidth = cols * moduleSize;
    const gridHeight = rows * moduleSize;
    
    const startX = (width - gridWidth) / 2;
    const startY = (height - gridHeight) / 2;
    
    drawGrid(startX, startY, cols, rows, moduleSize);
    
    const letterA = "E0R1S1R2E0R1B3E0B0R2S0E0E0E0S2L1S1S1S1L2S0E0E0E0S2";
    drawLetter(letterA, startX, startY, cols, rows, moduleSize, stem);
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
    push();
    fill(255);  // Белый цвет заливки
    noStroke();
    translate(x + w / 2, y + h / 2);
    rotate(a);
    rectMode(CENTER);
    rect(-w / 2, -h / 2, stem, h);
    pop();
}

function drawCentral(x, y, w, h, a, stem) {
    // Ваш код для модуля "Central"
}

function drawJoint(x, y, w, h, a, stem) {
    // Ваш код для модуля "Joint"
}

function drawLink(x, y, w, h, a, stem) {
    // Ваш код для модуля "Link"
}

function drawRound(x, y, w, h, a, stem) {
    // Ваш код для модуля "Round"
}

function drawBend(x, y, w, h, a, stem) {
    // Ваш код для модуля "Bend"
}

function drawEmpty(x, y, w, h, a, stem) {
    // Ваш код для модуля "Empty"
}

