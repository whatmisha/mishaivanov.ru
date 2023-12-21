function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);
}

function draw() {
  background(0); // Перерисовываем фон, чтобы курсор не оставлял след.
  stroke(255);
  strokeWeight(1);

  // Рисуем простую диагональную линию слева-направо снизу-вверх
  line(0, windowHeight, windowWidth, 0);

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
