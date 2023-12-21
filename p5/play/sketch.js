let x, y; // Позиция буквы "A"

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Angst'); // Используем шрифт Angst, определенный в CSS
  textSize(240);
  textAlign(CENTER, CENTER);
  fill(255); // Белый цвет текста
  x = width / 2;
  y = height / 2;

  window.addEventListener("gamepadconnected", function(e) {
    console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
      e.gamepad.index, e.gamepad.id,
      e.gamepad.buttons.length, e.gamepad.axes.length);
  });
}

function draw() {
  background(0); // Черный фон
  text('A', x, y); // Отрисовка буквы "A"

  // Обновление позиции буквы с помощью левого стика Dualshock
  let gamepads = navigator.getGamepads();
  if (gamepads[0]) {
    x += gamepads[0].axes[0] * 5; // изменение позиции по оси X
    y += gamepads[0].axes[1] * 5; // изменение позиции по оси Y
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  x = width / 2; // Сброс позиции буквы "A" в центр
  y = height / 2;
}
