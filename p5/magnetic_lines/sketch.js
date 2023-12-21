// Определение переменных для отслеживания положения и движения курсора
let cursorX;
let cursorY;
let sensitivity = 12; // Чувствительность движения курсора

// Переменные для управления размером и углом наклона линий
let squareSize = 30; // Начальный размер квадрата
let baseAngle = 0; // Исходный угол наклона линии

// Переменные для управления цветом
let invertColors = false; // Флаг для инвертирования цветов
let buttonPressed = false; // Отслеживание предыдущего состояния кнопки крестика

function setup() {
  createCanvas(windowWidth, windowHeight); // Создание холста
  cursor('none'); // Скрываем системный курсор
  cursorX = windowWidth / 2; // Центрируем курсор по горизонтали
  cursorY = windowHeight / 2; // Центрируем курсор по вертикали
}

function draw() {
  background(invertColors ? 255 : 0); // Установка цвета фона в зависимости от флага инверсии
  handleGamepad(); // Обработка ввода с контроллера
  drawGrid(squareSize); // Рисование сетки линий
  drawCustomCursor(); // Рисование кастомного курсора
}

function handleGamepad() {
  let gamepads = navigator.getGamepads(); // Получение списка подключенных контроллеров
  if (gamepads[0]) {
    let gp = gamepads[0]; // Работаем с первым подключенным контроллером

    // Обновление положения курсора на основе левого стика контроллера
    cursorX += sensitivity * gp.axes[0];
    cursorY += sensitivity * gp.axes[1];

    // Вращение исходного положения линий с помощью правого стика
    let rotationSensitivity = 0.05; // Чувствительность вращения
    baseAngle += rotationSensitivity * gp.axes[2]; // Изменение угла наклона

    // Изменение размера квадратов с помощью кнопок L2 и R2
    if (gp.buttons[6].value > 0) squareSize += 1;
    if (gp.buttons[7].value > 0) squareSize = max(10, squareSize - 1);

    // Переключение цветов при однократном нажатии кнопки крестика
    if (gp.buttons[0].pressed && !buttonPressed) {
      invertColors = !invertColors; // Инвертирование флага цвета
      buttonPressed = true; // Обновление состояния кнопки
    } else if (!gp.buttons[0].pressed) {
      buttonPressed = false; // Сброс состояния кнопки, если она отпущена
    }
  }
}

function drawGrid(squareSize) {
  stroke(invertColors ? 0 : 255); // Установка цвета линий в зависимости от инверсии
  strokeWeight(1); // Толщина линий

  // Создание сетки из линий
  for (let x = 0; x < windowWidth; x += squareSize) {
    for (let y = 0; y < windowHeight; y += squareSize) {
      // Вычисление угла между курсором и центром квадрата
      let cursorAngle = atan2(cursorY - (y + squareSize / 2), cursorX - (x + squareSize / 2));
      push();
      translate(x + squareSize / 2, y + squareSize / 2); // Перемещение начала координат в центр квадрата
      rotate(baseAngle + cursorAngle); // Применение общего угла вращения
      line(-squareSize / 2, 0, squareSize / 2, 0); // Рисование линии
      pop();
    }
  }
}

function drawCustomCursor() {
  fill(invertColors ? 0 : 255); // Установка цвета курсора в зависимости от инверсии
  noStroke(); // Без обводки
  ellipse(cursorX, cursorY, 20, 20); // Рисование эллипса в позиции курсора
}
