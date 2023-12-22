import { alphabet } from './alphabet.js';

let words = [
    "ABCDE",
    "12345",
    "АБВГД"
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
    const stem = moduleSize / 2;
    const spacing = moduleSize; // Пространство между буквами
    
    words.forEach((word, lineIndex) => {
        Array.from(word).forEach((char, charIndex) => {
            const charCode = alphabet[char] || alphabet[" "]; // Используйте пробел, если символ отсутствует
            const x = (charIndex * (cols * moduleSize + spacing));
            const y = (lineIndex * (rows * moduleSize + spacing));
            drawLetter(charCode, x, y, cols, rows, moduleSize, stem);
        });
    });
}

function drawLetter(code, x, y, cols, rows, size, stem) {
    for (let i = 0; i < cols * rows; i++) {
        const moduleType = code.charAt(i * 2);
        const rotation = parseInt(code.charAt(i * 2 + 1)) * HALF_PI;
        
        const moduleX = x + (i % cols) * size;
        const moduleY = y + Math.floor(i / cols) * size;
        
        switch (moduleType) {
            case 'S': drawStraight(moduleX, moduleY, size, rotation, stem); break;
            case 'C': drawCentral(moduleX, moduleY, size, rotation, stem); break;
            case 'J': drawJoint(moduleX, moduleY, size, rotation, stem); break;
            case 'L': drawLink(moduleX, moduleY, size, rotation, stem); break;
            case 'R': drawRound(moduleX, moduleY, size, rotation, stem); break;
            case 'B': drawBend(moduleX, moduleY, size, rotation, stem); break;
            case 'E': drawEmpty(moduleX, moduleY, size, rotation, stem); break;
        }
    }
}

function drawStraight(x, y, size, rotation, stem) {
    push();
    translate(x + size / 2, y + size / 2);
    rotate(rotation);
    fill(255);
    noStroke();
    rectMode(CENTER);
    rect(0, 0, stem, size);
    pop();
}

function drawCentral(x, y, size, rotation, stem) {
    push();
    translate(x + size / 2, y + size / 2);
    rotate(rotation);
    fill(255);
    noStroke();
    rectMode(CENTER);
    rect(0, 0, stem, stem);
    pop();
}

function drawJoint(x, y, size, rotation, stem) {
    push();
    translate(x + size / 2, y + size / 2);
    rotate(rotation);
    fill(255);
    noStroke();
    rectMode(CENTER);
    rect(0, 0, size, stem);
    rect(0, 0, stem, size);
    pop();
}

function drawLink(x, y, size, rotation, stem) {
    push();
    translate(x + size / 2, y + size / 2);
    rotate(rotation);
    fill(255);
    noStroke();
    rectMode(CENTER);
    rect(0, 0, stem, size);
    rect(0, size / 4, stem, stem);
    pop();
}

function drawRound(x, y, size, rotation, stem) {
    push();
    translate(x + size / 2, y + size / 2);
    rotate(rotation);
    fill(255);
    noStroke();
    arc(0, 0, size, size, 0, HALF_PI);
    pop();
}

function drawBend(x, y, size, rotation, stem) {
    push();
    translate(x + size / 2, y + size / 2);
    rotate(rotation);
    fill(255);
    noStroke();
    arc(0, 0, size, size, 0, HALF_PI);
    pop();
}

function drawEmpty(x, y, size, rotation, stem) {
    // Этот модуль не имеет заливки, только контур сетки, который уже нарисован
}
