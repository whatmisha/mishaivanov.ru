let font;
let x, y;

function preload() {
  font = loadFont('http://mishaivanov.ru/fonts/AngstVF.woff2');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont(font);
  textSize(240);
  textAlign(CENTER, CENTER);
  x = width / 2;
  y = height / 2;

  // Проверка подключения геймпада
  window.addEventListener("gamepadconnected", function(e) {
    console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
      e.gamepad.index, e.gamepad.id,
      e.gamepad.buttons.length, e.gamepad.axes.length);
  });
}

function draw() {
  background(0);
  fill(255);
  text('A', x, y);

  // Обновление позиции буквы с помощью левого стика Dualshock
  let gamepads = navigator.getGamepads();
  if (gamepads[0]) {
    x += gamepads[0].axes[0] * 5; // изменение по оси X
    y += gamepads[0].axes[1] * 5; // изменение по оси Y
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  x = width / 2;
  y = height / 2;
}
