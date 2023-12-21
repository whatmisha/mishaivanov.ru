const textElement = document.getElementById('text');
let posX = 50; // Центр по горизонтали (изменено на 50)
let posY = 50; // Центр по вертикали (изменено на 50)
let rotation = 0;
let currentWght = 0;
let currentSrff = 0;
let fontSize = 240; // Начальный размер шрифта

function updateStyles() {
  // Обновлено смещение для translate, учитывая начальное положение элемента
  textElement.style.transform = `translate(calc(${posX}% - 50%), calc(${posY}% - 50%)) rotate(${rotation}deg)`;
  textElement.style.fontVariationSettings = `'wght' ${currentWght}, 'srff' ${currentSrff}`;
  textElement.style.fontSize = `${fontSize}px`; // Обновляем размер шрифта
}

function readGamepad() {
  const gamepad = navigator.getGamepads()[0];
  if (gamepad) {
    // Управление позицией буквы с помощью левого стика
    const leftStickX = gamepad.axes[0]; // Горизонтальное движение левого стика
    const leftStickY = gamepad.axes[1]; // Вертикальное движение левого стика
    posX += leftStickX * 5; // Увеличена скорость изменения X позиции
    posY += leftStickY * 5; // Увеличена скорость изменения Y позиции

    // Управление вращением буквы с помощью правого стика
    const rightStickX = gamepad.axes[2]; // Горизонтальное движение правого стика
    rotation += rightStickX * 2; // Увеличена скорость вращения

    // Управление параметрами 'wght' и 'srff' с помощью кнопок L1, L2, R1, R2
    const L1 = 4;
    const R1 = 5;
    const L2 = 6;
    const R2 = 7;
    if (gamepad.buttons[L1].pressed && currentWght > 0) currentWght -= 2;
    if (gamepad.buttons[R1].pressed && currentWght < 100) currentWght += 2;
    if (gamepad.buttons[L2].pressed && currentSrff > 0) currentSrff -= 2;
    if (gamepad.buttons[R2].pressed && currentSrff < 100) currentSrff += 2;

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
