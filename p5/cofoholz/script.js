const textElement = document.getElementById('text');
let posX = window.innerWidth / 2;
let posY = window.innerHeight / 2;
let rotation = 0;
let currentWght = 0;
let currentWdth = 0;
let fontSize = 240;
let printRequested = false;

const letters = ["H", "O", "L", "Z"];
let currentLetterIndex = 0;
let circlePressed = false;

function updateStyles() {
  textElement.textContent = letters[currentLetterIndex];
  textElement.style.transform = `translate(-50%, -50%) translate(${posX}px, ${posY}px) rotate(${rotation}deg)`;
  textElement.style.fontVariationSettings = `'wght' ${currentWght}, 'wdth' ${currentWdth}`;
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
    posX += leftStickX * 10;
    posY += leftStickY * 10;

    const rightStickX = gamepad.axes[2];
    rotation += rightStickX * 2;

    const L1 = 4;
    const R1 = 5;
    const L2 = 6;
    const R2 = 7;
    if (gamepad.buttons[L1].pressed && currentWght > 100) currentWght -= 16; // Увеличение скорости изменения жирност
    if (gamepad.buttons[R1].pressed && currentWght < 700) currentWght += 16;
    if (gamepad.buttons[L2].pressed && currentWdth > 100) currentWdth -= 6; // Увеличение скорости изменения ширины
    if (gamepad.buttons[R2].pressed && currentWdth < 200) currentWdth += 6;

    const dpadLeft = 14;
    const dpadRight = 15;
    if (gamepad.buttons[dpadLeft].pressed && fontSize > 60) fontSize -= 8;
    if (gamepad.buttons[dpadRight].pressed && fontSize < 1200) fontSize += 8;

    const circleButtonIndex = 1;
    if (gamepad.buttons[circleButtonIndex].pressed && !circlePressed) {
      currentLetterIndex = (currentLetterIndex + 1) % letters.length;
      updateStyles();
      circlePressed = true;
    } else if (!gamepad.buttons[circleButtonIndex].pressed && circlePressed) {
      circlePressed = false;
    }

    if (gamepad.buttons[0].pressed) {
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
  updateStyles();
  readGamepad();
});
