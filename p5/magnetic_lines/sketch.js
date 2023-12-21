let cursorX;
let cursorY;
let sensitivity = 12; // Учетверенная чувствительность для быстрого движения курсора
let squareSize = 30; // Начальный размер квадрата
let baseAngle = 0; // Исходный угол наклона линии

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

    // Вращаем исходное положение линий с помощью правого стика (обычно axes[2] и axes[3])
    let rotationSensitivity = 0.05; // Чувствительность вращения
    baseAngle += rotationSensitivity * gp.axes[2]; // Добавляем к углу наклона

    // Изменяем размер квадратов с помощью кнопок L2 и R2
    if (gp.buttons[6].value > 0) {
      squareSize += 1;
    }
    if (gp.buttons[7].value > 0) {
      squareSize = max(10, squareSize - 1);
    }
  }
}

function drawGrid(squareSize) {
  stroke(255);
  strokeWeight(1);

  for (let x = 0; x < windowWidth; x += squareSize) {
    for (let y = 0; y < windowHeight; y += squareSize) {
      // Угол между курсором и центром квадрата
      let cursorAngle = atan2(cursorY - (y + squareSize / 2), cursorX - (x + squareSize / 2));
      push();
      translate(x + squareSize / 2, y + squareSize / 2);
      rotate(baseAngle + cursorAngle); // Применяем оба угла
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
