let cursorX;
let cursorY;
let sensitivity = 12; // Учетверенная чувствительность для еще более быстрого движения курсора
let squareSize = 30; // Начальный размер квадрата

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
  drawGrid(squareSize);
  drawCustomCursor();
}

function handleGamepad() {
  let gamepads = navigator.getGamepads();
  if (gamepads[0]) {
    let gp = gamepads[0];

    // Обновляем положение курсора на основе левого стика контроллера
    cursorX += sensitivity * gp.axes[0];
    cursorY += sensitivity * gp.axes[1];

    // Изменяем размер квадратов с помощью кнопок L2 (gp.buttons[6].value) и R2 (gp.buttons[7].value)
    if (gp.buttons[6].value > 0) {
      squareSize += 1; // Увеличиваем размер квадратов
    }
    if (gp.buttons[7].value > 0) {
      squareSize = max(10, squareSize - 1); // Уменьшаем размер квадратов, но не меньше 10
    }
  }
}

function drawGrid(squareSize) {
  stroke(255);
  strokeWeight(1);

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
