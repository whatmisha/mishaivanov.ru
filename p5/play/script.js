const textElement = document.getElementById('text');
let posX = 50; // Проценты от ширины окна
let posY = 50; // Проценты от высоты окна
let rotation = 0;
let currentWght = 0;
let currentSrff = 0;
let fontSize = 240;
let printRequested = false;

function updateStyles() {
  // Используем проценты для translate, чтобы буква всегда оставалась в центре
  textElement.style.transform = `translate(-50%, -50%) translate(${posX}vw, ${posY}vh) rotate(${rotation}deg)`;
  textElement.style.fontVariationSettings = `'wght' ${currentWght}, 'srff' ${currentSrff}`;
  textElement.style.fontSize = `${fontSize}px`;
}

function createPrint() {
  const print = textElement.cloneNode(true);
  print.style.transform = `translate(-50%, -50%) translate(${posX}vw, ${posY}vh) rotate(${rotation}deg)`;
  document.body.appendChild(print);
}

function readGamepad() {
  const gamepad = navigator.getGamepads()[0];
  if (gamepad) {
    const leftStickX = gamepad.axes[0];
    const leftStickY = gamepad.axes[1];
    // Изменяем проценты положения, а не пиксели
    posX += leftStickX * 0.1; // Изменение posX в процентах от ширины окна
    posY += leftStickY * 0.1; // Изменение posY в процентах от высоты окна

    const rightStickX = gamepad.axes[2];
    rotation += rightStickX * 2; // Изменение угла вращения

    const L1 = 4;
    const R1 = 5;
    const L2 = 6;
    const R2 = 7;
    if (gamepad.buttons[L1].pressed && currentWght > 0) currentWght -= 2;
    if (gamepad.buttons[R1].pressed && currentWght < 100) currentWght += 2;
    if (gamepad.buttons[L2].pressed && currentSrff > 0) currentSrff -= 2;
    if (gamepad.buttons[R2].pressed && currentSrff < 100) currentSrff += 2;

    const dpadLeft = 14;
    const dpadRight = 15;
    if (gamepad.buttons[dpadLeft].pressed && fontSize > 60) fontSize -= 2;
    if (gamepad.buttons[dpadRight].pressed && fontSize < 600) fontSize += 2;

    const crossButtonIndex = 0; 
    if (gamepad.buttons[crossButtonIndex].pressed) {
      if (!printRequested) {
        createPrint();
        printRequested = true;
      }
    } else {
      printRequested = false;
    }

    updateStyles();
  }
  requestAnimationFrame(readGamepad);
}

window.addEventListener("load", readGamepad);
