const textElement = document.getElementById('text');
let posX = window.innerWidth / 2; // Начальное горизонтальное положение - середина экрана в пикселях
let posY = window.innerHeight / 2; // Начальное вертикальное положение - середина экрана в пикселях
let rotation = 0;
let currentWght = 0;
let currentSrff = 0;
let fontSize = 240; // Начальный размер шрифта
let printRequested = false;

function updateStyles() {
  // Используем абсолютное позиционирование для translate
  textElement.style.transform = `translate(-50%, -50%) translate(${posX}px, ${posY}px) rotate(${rotation}deg)`;
  textElement.style.fontVariationSettings = `'wght' ${currentWght}, 'srff' ${currentSrff}`;
  textElement.style.fontSize = `${fontSize}px`;
}

function createPrint() {
  const print = textElement.cloneNode(true);
  print.style.transform = `translate(-50%, -50%) translate(${posX}px, ${posY}px) rotate(${rotation}deg)`;
  document.body.appendChild(print);
}

function readGamepad() {
  const gamepad = navigator.getGamepads()[0];
  if (gamepad) {
    const leftStickX = gamepad.axes[0];
    const leftStickY = gamepad.axes[1];
    posX += leftStickX * 5; // Медленное изменение X позиции
    posY += leftStickY * 5; // Медленное изменение Y позиции

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

window.addEventListener("load", () => {
  updateStyles(); // Обновляем стили при первой загрузке
  readGamepad();
});
