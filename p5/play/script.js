const textElement = document.getElementById('text');
let posX = 0;
let posY = 0;
let rotation = 0;
let currentWght = 0;
let currentSrff = 0;
let fontSize = 240; // Начальный размер шрифта

function updateStyles() {
  textElement.style.transform = `translate(${posX}px, ${posY}px) rotate(${rotation}deg)`;
  textElement.style.fontVariationSettings = `'wght' ${currentWght}, 'srff' ${currentSrff}`;
  textElement.style.fontSize = `${fontSize}px`; // Обновляем размер шрифта
}

function readGamepad() {
  const gamepad = navigator.getGamepads()[0];
  if (gamepad) {
    // Управление позицией буквы с помощью левого стика
    const leftStickX = gamepad.axes[0]; // Горизонтальное движение левого стика
    const leftStickY = gamepad.axes[1]; // Вертикальное движение левого стика
    posX += leftStickX * 10; // Увеличена скорость изменения X позиции
    posY += leftStickY * 10; // Увеличена скорость изменения Y позиции

    // Управление вращением буквы с помощью правого стика
    const rightStickX = gamepad.axes[2]; // Горизонтальное движение правого стика
    rotation += rightStickX * 4; // Увеличена скорость вращения

    // Управление параметрами 'wght' и 'srff' с помощью кнопок L1, L2, R1, R2
    const L1 = 4;
    const R1 = 5;
    const L2 = 6;
    const R2 = 7;
    if (gamepad.buttons[L1].pressed && currentWght > 0) currentWght -= 4;
    if (gamepad.buttons[R1].pressed && currentWght < 100) currentWght += 4;
    if (gamepad.buttons[L2].pressed && currentSrff > 0) currentSrff -= 4;
    if (gamepad.buttons[R2].pressed && currentSrff < 100) currentSrff += 4;

    // Изменение кегля шрифта с помощью стрелок D-pad влево и вправо
    const dpadLeft = 14; // Индекс кнопки D-pad влево
    const dpadRight = 15; // Индекс кнопки D-pad вправо
    if (gamepad.buttons[dpadLeft].pressed && fontSize > 60) fontSize -= 2; // Уменьшаем шрифт, ограничив минимальный размер 60px
    if (gamepad.buttons[dpadRight].pressed && fontSize < 600) fontSize += 2; // Увеличиваем шрифт, ограничив максимальный размер 600px

    updateStyles();
  }
  requestAnimationFrame(readGamepad); // Обновляем в каждом кадре анимации для плавности
}

window.addEventListener("load", readGamepad);
