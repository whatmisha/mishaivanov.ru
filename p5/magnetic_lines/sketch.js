function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);
  cursor('none'); // Скрываем системный курсор
  // Устанавливаем начальное положение курсора в центре экрана
  mouseX = windowWidth / 2;
  mouseY = windowHeight / 2;
}

function draw() {
  background(0); // Перерисовываем фон, чтобы курсор не оставлял след.
  stroke(255);
  strokeWeight(1);

  let squareSize = 30;

  for (let x = 0; x < windowWidth; x += squareSize) {
    for (let y = 0; y < windowHeight; y += squareSize) {
      let angle = atan2(mouseY - (y + squareSize / 2), mouseX - (x + squareSize / 2));
      push();
      translate(x + squareSize / 2, y + squareSize / 2);
      rotate(angle);
      line(-squareSize / 2, 0, squareSize / 2, 0);
      pop();
    }
  }

  drawCustomCursor();
}

function drawCustomCursor() {
  noStroke();
  fill(255);
  ellipse(mouseX, mouseY, 20, 20);
}
