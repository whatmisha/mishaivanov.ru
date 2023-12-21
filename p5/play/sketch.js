let x, y; // Позиция буквы "A"

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Angst'); // Используем шрифт Angst, загруженный через CSS
  textSize(240);
  textAlign(CENTER, CENTER);
  fill(255); // Белый цвет текста
  x = width / 2;
  y = height / 2;

  // Слушатель для подключения геймпада
  window.addEventListener("gamepadconnected", function(e) {
    console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
      e.gamepad.index, e.gamepad.id,
      e.gamepad.buttons.length, e.gamepad.axes.length);
  });
}

function draw() {
  background(0); // Черный фон
  text('A', x, y); // Отрисовка буквы "A" в текущей позиции (x, y)

  // Получение данных от геймпада
  let gamepads = navigator.getGamepads();
  if (gamepads[0]) {
    x += gamepads[0].axes[0] * 5; // изменение позиции по оси X
    y += gamepads[0].axes[1] * 5; // изменение позиции по оси Y
  }
}

function windowResized() {
  // Обработка изменения размера окна
  resizeCanvas(windowWidth, windowHeight);
  x = width / 2; // Сброс позиции буквы "A" в центр
  y = height / 2;
}
