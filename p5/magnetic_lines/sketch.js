function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);
}

function draw() {
  let squareSize = 30;
  let x = (windowWidth - squareSize) / 2;
  let y = (windowHeight - squareSize) / 2;

  stroke(255);
  line(x, y, x + squareSize, y + squareSize);
}
