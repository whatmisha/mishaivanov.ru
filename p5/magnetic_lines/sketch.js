function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);
}

function draw() {
  background(0); // Перерисовываем фон, чтобы курсор не оставлял след.
  stroke(255);
  strokeWeight(1);

  // Определяем координаты и размер квадрата
  let squareSize = 30;
  let x = (windowWidth - squareSize) / 2;
  let y = (windowHeight - squareSize) / 2;

  // Вычисляем угол между центром квадрата и положением курсора
  let angle = atan2(mouseY - (y + squareSize / 2), mouseX - (x + squareSize / 2));

  // Сохраняем текущее состояние матрицы трансформации и перемещаем начало координат в центр квадрата
  push();
  translate(x + squareSize / 2, y + squareSize / 2);

  // Вращаем канвас на вычисленный угол
  rotate(angle);

  // Рисуем линию от центра квадрата
  line(-squareSize / 2, 0, squareSize / 2, 0);

  // Восстанавливаем состояние матрицы трансформации
  pop();

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
