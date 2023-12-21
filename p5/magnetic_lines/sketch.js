function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);
}

function draw() {
  background(0); // Перерисовываем фон, чтобы курсор не оставлял след.
  stroke(255);
  strokeWeight(1);

  // Определяем координаты для квадрата 30x30 пикселей по центру экрана
  let squareSize = 30;
  let x = (windowWidth - squareSize) / 2;
  let y = (windowHeight - squareSize) / 2;

  // Рисуем линию в пределах квадрата
  line(x, y + squareSize, x + squareSize, y);

  // Рисуем курсор
  drawCustomCursor();
}

function drawCustomCursor() {
  noStroke();
  fill(255);
  ellipse(mouseX, mouseY, 20, 20);
}

// Скрываем стандартный курсор
function mouseMoved() {
  cursor(NONE);
}
