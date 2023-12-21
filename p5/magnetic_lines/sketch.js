function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);
  noFill();
}

function draw() {
  background(0); // Перерисовываем фон, чтобы курсор оставался одиноким кругом, а не следом.
  stroke(255);
  strokeWeight(1);

  // Определяем точки для кривой Безье
  let startX = 0;
  let startY = windowHeight;
  let endX = windowWidth;
  let endY = 0;
  let controlX1 = windowWidth / 4;
  let controlY1 = windowHeight;
  let controlX2 = 3 * windowWidth / 4;
  let controlY2 = 0;

  // Рисуем кривую Безье
  bezier(startX, startY, controlX1, controlY1, controlX2, controlY2, endX, endY);

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
