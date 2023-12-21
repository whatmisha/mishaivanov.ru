let cursorX;
let cursorY;
let sensitivity = 3; // Чувствительность движения курсора

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);
  cursor('none'); // Скрываем системный курсор
  // Устанавливаем начальное положение курсора в центре экрана
  cursorX = windowWidth / 2;
  cursorY = windowHeight / 2;
}

function draw() {
  background(0);
  handleGamepad(); // Обрабатываем ввод с контроллера
  drawGrid();
  drawCustomCursor();
}

function handleGamepad() {
  // Получаем данные от первого подключенного контроллера
  let gamepads = navigator.getGamepads();
  if (gamepads[0]) {
    let gp = gamepads[0];
    // Обновляем положение курсора на основе левого стика контроллера (обычно axes[0] и axes[1])
    cursorX += sensitivity * gp.axes[0];
    cursorY += sensitivity * gp.axes[1];
  }
}

function drawGrid() {
  stroke(255);
  strokeWeight(1);
  let squareSize = 30;

  for (let x = 0; x < windowWidth; x += squareSize) {
    for (let y = 0; y < windowHeight; y += squareSize) {
      let angle = atan2(cursorY - (y + squareSize / 2), cursorX - (x + squareSize / 2));
      push();
      translate(x + squareSize / 2, y + squareSize / 2);
      rotate(angle);
      line(-squareSize / 2, 0, squareSize / 2, 0);
      pop();
    }
  }
}

function drawCustomCursor() {
  noStroke();
  fill(255);
  ellipse(cursorX, cursorY, 20, 20);
}
