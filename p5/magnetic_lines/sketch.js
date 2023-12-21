let cursorX;
let cursorY;
let sensitivity = 12; // Учетверенная чувствительность для быстрого движения курсора
let squareSize = 30; // Начальный размер квадрата
let baseAngle = 0; // Исходный угол наклона линии
let invertColors = false; // Флаг для инвертирования цветов

function setup() {
  createCanvas(windowWidth, windowHeight);
  cursor('none'); // Скрываем системный курсор
  // Устанавливаем начальное положение курсора в центре экрана
  cursorX = windowWidth / 2;
  cursorY = windowHeight / 2;
}

function draw() {
  // Установка цвета фона в зависимости от инверсии
  background(invertColors ? 255 : 0);
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

    // Вращаем исходное положение линий с помощью правого стика
    let rotationSensitivity = 0.05; // Чувствительность вращения
    baseAngle += rotationSensitivity * gp.axes[2]; // Добавляем к углу наклона

    // Изменяем размер квадратов с помощью кнопок L2 и R2
    if (gp.buttons[6].value > 0) {
      squareSize += 1;
    }
    if (gp.buttons[7].value > 0) {
      squareSize = max(10, squareSize - 1);
    }

    // Инвертируем цвета при нажатии кнопки крестика (gp.buttons[0])
    if (gp.buttons[0].pressed) {
      invertColors = !invertColors;
    }
  }
}

function drawGrid(squareSize) {
  // Установка цвета линий в зависимости от инверсии
  stroke(invertColors ? 0 : 255);
  strokeWeight(1);

  for (let x = 0; x < windowWidth; x += squareSize) {
    for (let y = 0; y < windowHeight; y += squareSize) {
      let angle = atan2(cursorY - (y + squareSize / 2), cursorX - (x + squareSize / 2));
      push();
      translate(x + squareSize / 2, y + squareSize / 2);
      rotate(baseAngle + angle);
      line(-squareSize / 2, 0, squareSize / 2, 0);
      pop();
    }
  }
}

function drawCustomCursor() {
  fill(invertColors ? 0 : 255);
  noStroke();
  ellipse(cursorX, cursorY, 20, 20);
}
