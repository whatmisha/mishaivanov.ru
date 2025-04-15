let mic, fft;
let resolution = 300;
let isRunning = false;
let thresholdSlider; // Ползунок для порогового значения
let thresholdValue = 0.05; // Значение по умолчанию
let invertedMode = false; // Режим инверсии (белые линии на черном или черные линии на белом)
let modeXSlider, modeYSlider; // Слайдеры для режимов
let modeX = 3, modeY = 2; // Начальные значения режимов

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
  
  // Создаем ползунок для регулировки порогового значения и режимов
  createControlSliders();
  
  // Подготавливаем интерфейс
  setupInterface();
  
  // Отрисовываем начальное состояние
  drawStaticPattern(modeX, modeY);
}

function draw() {
  if (!isRunning) return;
  
  // Получаем аудиоспектр
  let spectrum = fft.analyze();
  let bass = fft.getEnergy("bass");
  let mid = fft.getEnergy("mid");
  let treble = fft.getEnergy("treble");

  // Преобразуем громкость в параметры волны
  let nX = int(map(bass, 0, 255, 1, 10));
  let nY = int(map(treble, 0, 255, 1, 10));
  let amplitude = map(mid, 0, 255, 0.5, 2);

  // Выводим информацию о текущих параметрах в консоль
  console.log(`Басы: ${bass}, Средние: ${mid}, Высокие: ${treble}, nX: ${nX}, nY: ${nY}, Амплитуда: ${amplitude.toFixed(2)}`);

  // Рисуем фигуру Хладни
  drawChladniPattern(nX, nY, amplitude);
}

function createControlSliders() {
  // Создаем ползунок для регулировки порогового значения
  thresholdSlider = createSlider(0.01, 0.2, thresholdValue, 0.01);
  thresholdSlider.parent('threshold-slider-container');
  thresholdSlider.style('width', '200px');
  thresholdSlider.input(() => {
    thresholdValue = thresholdSlider.value();
    // Обновляем статический паттерн при изменении порога, если не активен микрофон
    if (!isRunning) {
      drawStaticPattern(modeX, modeY);
    }
  });
  
  // Создаем ползунки для режимов X и Y
  modeXSlider = createSlider(1, 12, modeX, 1);
  modeXSlider.parent('modeX-slider-container');
  modeXSlider.style('width', '200px');
  modeXSlider.input(() => {
    modeX = modeXSlider.value();
    if (!isRunning) {
      drawStaticPattern(modeX, modeY);
    }
  });
  
  modeYSlider = createSlider(1, 12, modeY, 1);
  modeYSlider.parent('modeY-slider-container');
  modeYSlider.style('width', '200px');
  modeYSlider.input(() => {
    modeY = modeYSlider.value();
    if (!isRunning) {
      drawStaticPattern(modeX, modeY);
    }
  });
}

function drawChladniPattern(nX, nY, amplitude = 1) {
  // Устанавливаем фон в зависимости от режима инверсии
  background(invertedMode ? 255 : 0);
  loadPixels();

  const centerX = width / 2;
  const centerY = height / 2;
  const scale = min(width, height) / 2;
  
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      // Нормализуем координаты к квадрату [-1, 1] x [-1, 1]
      let normX = (x - centerX) / scale;
      let normY = (y - centerY) / scale;
      
      // Вычисляем фигуру Хладни по формуле для прямоугольной пластины
      // A*sin(nπx/a)*sin(mπy/b) + B*sin(mπx/a)*sin(nπy/b)
      let value = realChladniFormula(normX, normY, nX, nY) * amplitude;
      
      // Применяем пороговое значение
      let bright = abs(value) < thresholdValue ? 0 : 255;
      
      let index = (x + y * width) * 4;
      pixels[index] = invertedMode ? (255 - bright) : bright;
      pixels[index + 1] = invertedMode ? (255 - bright) : bright;
      pixels[index + 2] = invertedMode ? (255 - bright) : bright;
      pixels[index + 3] = 255;
    }
  }

  updatePixels();
}

function realChladniFormula(x, y, nX, nY) {
  // Более реалистичная формула для фигур Хладни на квадратной пластине
  // Используем тригонометрические функции с волновыми числами
  
  // Коэффициент относительного вклада каждой моды (для случайности)
  let ratio = 0.7;
  
  // Основная формула для квадратной пластины
  let term1 = sin(nX * PI * x) * sin(nY * PI * y);
  let term2 = sin(nY * PI * x) * sin(nX * PI * y);
  
  // Комбинируем два режима с разными амплитудами
  return ratio * term1 + (1 - ratio) * term2;
}

function drawStaticPattern(nX, nY) {
  // Отрисовываем статическую фигуру для начального состояния
  drawChladniPattern(nX, nY, 1);
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
      drawStaticPattern(modeX, modeY);
    }
  });
  
  invertButton.mousePressed(() => {
    invertedMode = !invertedMode;
    // Обновляем отображение
    if (!isRunning) {
      drawStaticPattern(modeX, modeY);
    }
  });
} 