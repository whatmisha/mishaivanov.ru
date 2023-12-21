let x, y; // Позиция буквы "A"

function setup() {
  // Создаем холст и размещаем его в теле документа
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.style('display', 'block'); // Устраняем стандартные отступы

  // Настройки текста
  textFont('Angst'); // Указываем имя шрифта, определенного в CSS
  textSize(240);
  textAlign(CENTER, CENTER);
  fill(255); // Устанавливаем белый цвет текста

  // Изначально размещаем букву "A" в центре экрана
  x = width / 2;
  y = height / 2;

  // Обработчик событий для подключения геймпада
  window.addEventListener("gamepadconnected", function(e) {
    console.log(`Gamepad connected at index ${e.gamepad.index}: ${e.gamepad.id}.`);
  });
}

function draw() {
  background(0); // Устанавливаем черный фон

  // Отрисовка буквы "A" в текущей позиции (x, y)
  text('A', x, y);

  // Попытка получить данные от первого подключенного геймпада
  let gamepads = navigator.getGamepads();
  if (gamepads[0]) {
    let gp = gamepads[0];

    // Обновляем позицию буквы "A" на основе положения левого стика
    x += gp.axes[0] * 5; // Горизонтальное движение
    y += gp.axes[1] * 5; // Вертикальное движение
  }
}

// Функция, вызываемая при изменении размеров окна браузера
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  x = width / 2; // Сбрасываем позицию буквы "A" в центр
  y = height / 2;
}
