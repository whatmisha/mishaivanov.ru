function setup() {
    createCanvas(windowWidth, windowHeight);
    noLoop(); // Отрисовка сетки только один раз
}

function draw() {
    background(0); // Черный фон
    
    const cols = 5;
    const rows = 5;
    const moduleSize = 12; // Размер модуля 12 пикселей
    const gridWidth = cols * moduleSize;
    const gridHeight = rows * moduleSize;
    
    // Расчет начальных координат для центрирования сетки
    const startX = (width - gridWidth) / 2;
    const startY = (height - gridHeight) / 2;
    
    // Отрисовка сетки модулей
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            const x = startX + i * moduleSize;
            const y = startY + j * moduleSize;
            stroke(255); // Белый контур
            strokeWeight(1); // Толщина контура 1 пиксель
            noFill(); // Без заливки
            rect(x, y, moduleSize, moduleSize); // Рисование модуля
        }
    }
}
