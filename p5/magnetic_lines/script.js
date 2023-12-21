function setup() {
    // Создаем холст черного цвета на всю ширину и высоту окна
    createCanvas(windowWidth, windowHeight);
    background(0);
}

function draw() {
    // Очищаем холст каждый кадр
    clear();
    background(0);

    // Рассчитываем угол поворота относительно позиции курсора
    let angle = atan2(mouseY - height / 2, mouseX - width / 2);

    // Сохраняем состояние холста
    push();
    // Перемещаем начало координат в центр холста
    translate(width / 2, height / 2);
    // Вращаем холст на вычисленный угол
    rotate(angle);
    // Устанавливаем белый цвет линии
    stroke(255);
    // Рисуем кривую Безье
    bezier(-15, -15, 30, 30, -30, 30, 15, 15);
    // Восстанавливаем состояние холста
    pop();
}

function windowResized() {
    // Обеспечиваем перерисовку холста при изменении размеров окна
    resizeCanvas(windowWidth, windowHeight);
}
