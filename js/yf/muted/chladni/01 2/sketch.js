let mic, fft;
let resolution = 300;
let isRunning = false;
let thresholdSlider; // Ползунок для порогового значения
let thresholdValue = 0.05; // Значение по умолчанию
let invertedMode = false; // Режим инверсии (белые линии на черном или черные линии на белом)

function setup() {
  // Создаем холст и помещаем его в контейнер
  const canvas = createCanvas(600, 600);
  canvas.parent('canvas-container');
  pixelDensity(1);

  // Настраиваем аудио-анализаторы
  mic = new p5.AudioIn();
  fft = new p5.FFT();
  fft.setInput(mic);

  noStroke();
  
  // Создаем ползунок для регулировки порогового значения
  createControlSliders();
  
  // Подготавливаем интерфейс
  setupInterface();
  
  // Отрисовываем начальное состояние
  drawStaticPattern(5, 5);
}

function draw() {
  if (!isRunning) return;
  
  background(0);
  loadPixels();

  // Получаем аудиоспектр
  let spectrum = fft.analyze();
  let bass = fft.getEnergy("bass");
  let treble = fft.getEnergy("treble");

  // Преобразуем громкость в параметры волны
  let freq = map(bass, 0, 255, 1, 10);
  let mode = int(map(treble, 0, 255, 1, 12));

  // Выводим информацию о текущих параметрах в консоль
  console.log(`Басы: ${bass}, Высокие: ${treble}, Частота: ${freq.toFixed(2)}, Режим: ${mode}`);

  // Рисуем фигуру Хладни
  drawChladniPattern(freq, mode);
}

function createControlSliders() {
  // Создаем ползунок для регулировки порогового значения
  thresholdSlider = createSlider(0.01, 0.2, thresholdValue, 0.01);
  thresholdSlider.parent('slider-container');
  thresholdSlider.style('width', '200px');
  thresholdSlider.input(() => {
    thresholdValue = thresholdSlider.value();
    // Обновляем статический паттерн при изменении порога, если не активен микрофон
    if (!isRunning) {
      drawStaticPattern(5, 5);
    }
  });
}

function drawChladniPattern(freq, mode) {
  // Устанавливаем фон в зависимости от режима инверсии
  background(invertedMode ? 255 : 0);
  loadPixels();

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let u = map(x, 0, width, -1, 1);
      let v = map(y, 0, height, -1, 1);
      let r = sqrt(u * u + v * v);
      let theta = atan2(v, u);

      let wave = sin(freq * PI * r) * cos(mode * theta);
      
      // Определяем яркость в зависимости от режима инверсии
      let bright;
      if (invertedMode) {
        // В инверсном режиме черные линии на белом фоне
        bright = abs(wave) < thresholdValue ? 0 : 255;
      } else {
        // В обычном режиме белые линии на черном фоне
        bright = abs(wave) < thresholdValue ? 0 : 255;
      }

      let index = (x + y * width) * 4;
      pixels[index] = invertedMode ? (255 - bright) : bright;
      pixels[index + 1] = invertedMode ? (255 - bright) : bright;
      pixels[index + 2] = invertedMode ? (255 - bright) : bright;
      pixels[index + 3] = 255;
    }
  }

  updatePixels();
}

function drawStaticPattern(freq, mode) {
  // Устанавливаем фон в зависимости от режима инверсии
  background(invertedMode ? 255 : 0);
  loadPixels();
  
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let u = map(x, 0, width, -1, 1);
      let v = map(y, 0, height, -1, 1);
      let r = sqrt(u * u + v * v);
      let theta = atan2(v, u);

      let wave = sin(freq * PI * r) * cos(mode * theta);
      
      // Определяем яркость в зависимости от режима инверсии
      let bright = abs(wave) < thresholdValue ? 0 : 255;

      let index = (x + y * width) * 4;
      pixels[index] = invertedMode ? (255 - bright) : bright;
      pixels[index + 1] = invertedMode ? (255 - bright) : bright;
      pixels[index + 2] = invertedMode ? (255 - bright) : bright;
      pixels[index + 3] = 255;
    }
  }
  
  updatePixels();
}

function setupInterface() {
  // Настройка кнопок
  const startButton = select('#start-button');
  const stopButton = select('#stop-button');
  const invertButton = select('#invert-button');
  
  startButton.mousePressed(() => {
    if (!isRunning) {
      // Запрашиваем доступ к микрофону
      userStartAudio().then(() => {
        mic.start();
        isRunning = true;
        console.log('Микрофон активирован');
      }).catch(err => {
        console.error('Ошибка доступа к микрофону:', err);
        alert('Не удалось получить доступ к микрофону. Пожалуйста, разрешите доступ и попробуйте снова.');
      });
    }
  });
  
  stopButton.mousePressed(() => {
    if (isRunning) {
      mic.stop();
      isRunning = false;
      console.log('Микрофон остановлен');
      // Отрисовываем статическую фигуру
      drawStaticPattern(5, 5);
    }
  });
  
  invertButton.mousePressed(() => {
    invertedMode = !invertedMode;
    // Обновляем отображение
    if (!isRunning) {
      drawStaticPattern(5, 5);
    }
  });
} 