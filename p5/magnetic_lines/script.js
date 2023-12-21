function setup() {
    // Создаем холст черного цвета на всю ширину и высоту окна
    createCanvas(windowWidth, windowHeight);
    background(0);
}

function draw() {
    // Очищаем холст каждый кадр
    clear();
    background(0);

    // Задаем белый цвет линии
    stroke(255);

    // Рассчитываем координаты центра холста
    let centerX = width / 2;
    let centerY = height / 2;

    // Рассчитываем координаты углов квадрата 30x30 пикселей
    let squareSize = 30;
    let halfSquare = squareSize / 2;
    let x1 = centerX - halfSquare;
    let y1 = centerY - halfSquare;
    let x2 = centerX + halfSquare;
    let y2 = centerY + halfSquare;

    // Рисуем диагональную линию внутри квадрата
    line(x1, y1, x2, y2);
}

function windowResized() {
    // Обеспечиваем перерисовку холста при изменении размеров окна
    resizeCanvas(windowWidth, windowHeight);
}
