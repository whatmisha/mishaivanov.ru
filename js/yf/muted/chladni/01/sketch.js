let mic, fft;
let resolution = 300;
let isRunning = false;
let thresholdSlider; // Ползунок для порогового значения
let thresholdValue = 0.05; // Значение по умолчанию
let invertedMode = false; // Режим инверсии (белые линии на черном или черные линии на белом)
let modeXSlider, modeYSlider; // Слайдеры для режимов
let modeX = 3, modeY = 2; // Начальные значения режимов
let sensitivitySlider; // Ползунок для чувствительности
let sensitivity = 2.0; // Значение чувствительности по умолчанию
let smoothingSlider; // Ползунок для сглаживания
let smoothingValue = 0.8; // Значение сглаживания по умолчанию
// Параметры для сглаживания
let currentNX = 3;
let currentNY = 2;
let currentAmplitude = 1.0;
// Параметры для текста
let customText = "THE SOUND OF SILENCE";
let textSizeValue = 64; // Увеличиваем размер текста по умолчанию
let textBlurValue = 5; // Уменьшаем значение размытия по умолчанию
let textSizeSlider, textBlurSlider;
let textInput;
let gradientModeCheckbox;
let useGradientMode = false;
let textInfluenceFactor = 3.0; // Увеличиваем влияние текста на волны
let textVisible = true; // Для отладки
let textInfluenceSlider;

function setup() {
  // Создаем холст и помещаем его в контейнер
  const canvas = createCanvas(600, 600);
  canvas.parent('canvas-container');
  pixelDensity(1);

  // Настраиваем аудио-анализаторы
  mic = new p5.AudioIn();
  fft = new p5.FFT(smoothingValue, 1024); // Увеличиваем размер FFT для лучшего разрешения
  fft.setInput(mic);

  noStroke();
  
  // Настройка шрифта - используем жирный шрифт для лучшей видимости
  textFont('Arial Bold');
  textAlign(CENTER, CENTER);
  
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
  
  // Измеряем общую громкость микрофона
  let volume = mic.getLevel();
  
  // Получаем энергию в разных диапазонах
  let bass = fft.getEnergy("bass") * sensitivity;
  let lowMid = fft.getEnergy("lowMid") * sensitivity;
  let mid = fft.getEnergy("mid") * sensitivity;
  let highMid = fft.getEnergy("highMid") * sensitivity;
  let treble = fft.getEnergy("treble") * sensitivity;
  
  // Нормализуем значения, чтобы они реагировали даже на тихие звуки
  let bassNorm = normalizeEnergy(bass);
  let trebleNorm = normalizeEnergy(treble);

  // Применяем более чувствительное преобразование звука в параметры волны
  let targetNX = map(bassNorm, 0, 1, 1, 15); // Расширяем диапазон
  let targetNY = map(trebleNorm, 0, 1, 1, 15);
  let targetAmplitude = map(mid, 0, 255 * sensitivity, 0.5, 3);
  
  // Сглаживаем переходы для более плавной анимации
  currentNX = lerp(currentNX, targetNX, 1 - smoothingValue);
  currentNY = lerp(currentNY, targetNY, 1 - smoothingValue);
  currentAmplitude = lerp(currentAmplitude, targetAmplitude, 1 - smoothingValue);
  
  // Округляем значения волновых чисел до целых
  let nX = int(currentNX);
  let nY = int(currentNY);
  
  // Минимум 1 для избежания ошибок
  nX = max(1, nX);
  nY = max(1, nY);
  
  // Выводим информацию о текущих параметрах и уровне звука
  console.log(`Громкость: ${volume.toFixed(4)}, Басы: ${bassNorm.toFixed(2)}, Высокие: ${trebleNorm.toFixed(2)}, nX: ${nX}, nY: ${nY}, Амплитуда: ${currentAmplitude.toFixed(2)}`);

  // Динамически меняем пороговое значение в зависимости от громкости
  let dynamicThreshold = map(volume, 0, 0.1, thresholdValue * 2, thresholdValue * 0.8);
  dynamicThreshold = constrain(dynamicThreshold, 0.01, 0.2);
  
  // Рисуем фигуру Хладни с динамическим порогом
  drawChladniPattern(nX, nY, currentAmplitude, dynamicThreshold);
}

// Функция для нормализации энергии звука с усилением слабых сигналов
function normalizeEnergy(energy) {
  // Нелинейное преобразование для усиления слабых сигналов
  // Используем квадратный корень для более равномерного отклика
  return pow(constrain(energy / (255 * sensitivity), 0, 1), 0.5);
}

function createControlSliders() {
  // Создаем ползунок для регулировки порогового значения
  thresholdSlider = createSlider(0.01, 0.2, thresholdValue, 0.01);
  thresholdSlider.parent('threshold-slider-container');
  thresholdSlider.style('width', '100%');
  thresholdSlider.input(() => {
    thresholdValue = thresholdSlider.value();
    // Обновляем статический паттерн при изменении порога, если не активен микрофон
    if (!isRunning) {
      drawStaticPattern(modeX, modeY);
    }
  });
  
  // Создаем ползунки для режимов X и Y
  modeXSlider = createSlider(1, 15, modeX, 1);
  modeXSlider.parent('modeX-slider-container');
  modeXSlider.style('width', '100%');
  modeXSlider.input(() => {
    modeX = modeXSlider.value();
    if (!isRunning) {
      drawStaticPattern(modeX, modeY);
    }
  });
  
  modeYSlider = createSlider(1, 15, modeY, 1);
  modeYSlider.parent('modeY-slider-container');
  modeYSlider.style('width', '100%');
  modeYSlider.input(() => {
    modeY = modeYSlider.value();
    if (!isRunning) {
      drawStaticPattern(modeX, modeY);
    }
  });
  
  // Добавляем ползунок для регулировки чувствительности
  sensitivitySlider = createSlider(0.5, 5, sensitivity, 0.1);
  sensitivitySlider.parent('sensitivity-slider-container');
  sensitivitySlider.style('width', '100%');
  sensitivitySlider.input(() => {
    sensitivity = sensitivitySlider.value();
  });
  
  // Добавляем ползунок для регулировки сглаживания
  smoothingSlider = createSlider(0, 0.95, smoothingValue, 0.05);
  smoothingSlider.parent('smoothing-slider-container');
  smoothingSlider.style('width', '100%');
  smoothingSlider.input(() => {
    smoothingValue = smoothingSlider.value();
    fft.smooth(smoothingValue);
  });
  
  // Поле ввода для текста
  textInput = createInput(customText);
  textInput.parent('text-input-container');
  textInput.style('width', '100%');
  textInput.input(() => {
    customText = textInput.value();
    if (!isRunning) {
      drawStaticPattern(modeX, modeY);
    }
  });
  
  // Ползунок для размера текста
  textSizeSlider = createSlider(12, 120, textSizeValue, 2);
  textSizeSlider.parent('text-size-slider-container');
  textSizeSlider.style('width', '100%');
  textSizeSlider.input(() => {
    textSizeValue = textSizeSlider.value();
    if (!isRunning) {
      drawStaticPattern(modeX, modeY);
    }
  });
  
  // Ползунок для размытия текста
  textBlurSlider = createSlider(0, 20, textBlurValue, 1);
  textBlurSlider.parent('text-blur-slider-container');
  textBlurSlider.style('width', '100%');
  textBlurSlider.input(() => {
    textBlurValue = textBlurSlider.value();
    if (!isRunning) {
      drawStaticPattern(modeX, modeY);
    }
  });
  
  // Ползунок для влияния текста
  textInfluenceSlider = createSlider(1, 10, textInfluenceFactor, 0.5);
  textInfluenceSlider.parent('text-influence-slider-container');
  textInfluenceSlider.style('width', '100%');
  textInfluenceSlider.input(() => {
    textInfluenceFactor = textInfluenceSlider.value();
    if (!isRunning) {
      drawStaticPattern(modeX, modeY);
    }
  });
  
  // Чекбокс для отображения градиентного режима
  gradientModeCheckbox = createCheckbox('', useGradientMode);
  gradientModeCheckbox.parent('gradient-checkbox-container');
  gradientModeCheckbox.changed(() => {
    useGradientMode = gradientModeCheckbox.checked();
    if (!isRunning) {
      drawStaticPattern(modeX, modeY);
    }
  });
}

function drawChladniPattern(nX, nY, amplitude = 1, threshold = thresholdValue) {
  // Устанавливаем фон в зависимости от режима инверсии
  background(invertedMode ? 255 : 0);
  
  // Временно создаем буфер для размытия текста
  let textGraphics = createGraphics(width, height);
  textGraphics.background(0, 0); // Полностью прозрачный фон
  
  // Определяем эффективное размытие (минимум 2.0 для гауссового размытия)
  let effectiveBlur = max(2.0, textBlurValue);
  
  // Рисуем текст с гауссовым размытием
  drawBlurredText(textGraphics, customText, width/2, height/2, effectiveBlur);
  
  loadPixels();
  
  // Получаем пиксели текстовой графики
  let textPixels = textGraphics.get().pixels;

  const centerX = width / 2;
  const centerY = height / 2;
  const scale = min(width, height) / 2;
  
  // Предварительно вычисляем максимальное значение волны, чтобы масштабировать контраст
  let maxWaveValue = 0;
  for (let x = 0; x < width; x += 5) {
    for (let y = 0; y < height; y += 5) {
      let normX = (x - centerX) / scale;
      let normY = (y - centerY) / scale;
      let value = abs(realChladniFormula(normX, normY, nX, nY) * amplitude);
      maxWaveValue = max(maxWaveValue, value);
    }
  }
  maxWaveValue = max(1.0, maxWaveValue);
  
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let normX = (x - centerX) / scale;
      let normY = (y - centerY) / scale;
      
      let value = realChladniFormula(normX, normY, nX, nY) * amplitude;
      
      let txtIndex = (x + y * width) * 4;
      let textAlpha = textPixels[txtIndex + 3];
      
      if (!textVisible && textAlpha > 0) {
        let textInfluence = (textAlpha / 255) * textInfluenceFactor;
        value = value * (1 + textInfluence * 2);
        
        if (textAlpha > 150) {
          value = maxWaveValue - value;
        }
        
        if (textAlpha > 200) {
          value = invertedMode ? 0.0 : 1.0;
        }
      }
      
      let pixelValue;
      if (useGradientMode) {
        pixelValue = map(abs(value), 0, maxWaveValue, 0, 255);
      } else {
        let dynamicThreshold = threshold * maxWaveValue;
        pixelValue = abs(value) < dynamicThreshold ? 0 : 255;
      }
      
      let index = (x + y * width) * 4;
      pixels[index] = invertedMode ? (255 - pixelValue) : pixelValue;
      pixels[index + 1] = invertedMode ? (255 - pixelValue) : pixelValue;
      pixels[index + 2] = invertedMode ? (255 - pixelValue) : pixelValue;
      pixels[index + 3] = 255;
    }
  }

  updatePixels();
  
  // Отрисовываем текст поверх фигур Хладни
  image(textGraphics, 0, 0);
  
  textGraphics.remove();
}

// Функция для рисования текста с гауссовым размытием
function drawBlurredText(graphics, txt, x, y, blurAmount) {
  // Очищаем графический буфер для текста
  graphics.clear();
  
  // Создаем второй буфер для применения гауссового размытия
  let blurBuffer = createGraphics(width, height);
  blurBuffer.clear();
  
  // Рисуем текст в буфере для размытия
  blurBuffer.textFont('Arial Bold');
  blurBuffer.textAlign(CENTER, CENTER);
  blurBuffer.textSize(textSizeValue);
  blurBuffer.fill(255);
  blurBuffer.noStroke();
  blurBuffer.text(txt, x, y);
  
  // Применяем гауссовое размытие к буферу
  applyGaussianBlur(blurBuffer, graphics, blurAmount);
  
  // Удаляем временный буфер
  blurBuffer.remove();
}

// Функция для применения гауссового размытия
function applyGaussianBlur(sourceBuffer, targetBuffer, sigma) {
  // Получаем пиксели из исходного буфера
  let sourcePixels = sourceBuffer.get().pixels;
  
  // Создаем временные массивы для хранения промежуточных результатов
  let tempPixels = new Uint8ClampedArray(sourcePixels.length);
  let resultPixels = new Uint8ClampedArray(sourcePixels.length);
  
  // Копируем исходные пиксели во временный массив
  for (let i = 0; i < sourcePixels.length; i++) {
    tempPixels[i] = sourcePixels[i];
    resultPixels[i] = sourcePixels[i];
  }
  
  // Размер ядра Гаусса (должен быть нечетным)
  let kernelSize = Math.ceil(sigma * 6);
  if (kernelSize % 2 === 0) kernelSize++;
  
  // Создаем ядро Гаусса
  let kernel = createGaussianKernel(sigma, kernelSize);
  
  // Применяем размытие по горизонтали
  blurHorizontal(sourcePixels, tempPixels, width, height, kernel, kernelSize);
  
  // Применяем размытие по вертикали
  blurVertical(tempPixels, resultPixels, width, height, kernel, kernelSize);
  
  // Загружаем размытое изображение в целевой буфер
  targetBuffer.loadPixels();
  for (let i = 0; i < resultPixels.length; i++) {
    targetBuffer.pixels[i] = resultPixels[i];
  }
  targetBuffer.updatePixels();
}

// Создаем ядро Гаусса
function createGaussianKernel(sigma, size) {
  const kernel = [];
  const halfSize = Math.floor(size / 2);
  let sum = 0;
  
  // Вычисляем коэффициенты ядра
  for (let i = 0; i < size; i++) {
    const x = i - halfSize;
    const g = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernel.push(g);
    sum += g;
  }
  
  // Нормализуем ядро, чтобы сумма коэффициентов была равна 1
  for (let i = 0; i < size; i++) {
    kernel[i] /= sum;
  }
  
  return kernel;
}

// Применяем размытие по горизонтали
function blurHorizontal(sourcePixels, targetPixels, width, height, kernel, kernelSize) {
  const halfKernel = Math.floor(kernelSize / 2);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      
      // Свертка с ядром Гаусса
      for (let i = 0; i < kernelSize; i++) {
        const sampleX = Math.min(Math.max(x + i - halfKernel, 0), width - 1);
        const idx = (y * width + sampleX) * 4;
        
        // Учитываем весовой коэффициент из ядра
        r += sourcePixels[idx] * kernel[i];
        g += sourcePixels[idx + 1] * kernel[i];
        b += sourcePixels[idx + 2] * kernel[i];
        a += sourcePixels[idx + 3] * kernel[i];
      }
      
      // Записываем результат в целевой массив
      const targetIdx = (y * width + x) * 4;
      targetPixels[targetIdx] = r;
      targetPixels[targetIdx + 1] = g;
      targetPixels[targetIdx + 2] = b;
      targetPixels[targetIdx + 3] = a;
    }
  }
}

// Применяем размытие по вертикали
function blurVertical(sourcePixels, targetPixels, width, height, kernel, kernelSize) {
  const halfKernel = Math.floor(kernelSize / 2);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      
      // Свертка с ядром Гаусса
      for (let i = 0; i < kernelSize; i++) {
        const sampleY = Math.min(Math.max(y + i - halfKernel, 0), height - 1);
        const idx = (sampleY * width + x) * 4;
        
        // Учитываем весовой коэффициент из ядра
        r += sourcePixels[idx] * kernel[i];
        g += sourcePixels[idx + 1] * kernel[i];
        b += sourcePixels[idx + 2] * kernel[i];
        a += sourcePixels[idx + 3] * kernel[i];
      }
      
      // Записываем результат в целевой массив
      const targetIdx = (y * width + x) * 4;
      targetPixels[targetIdx] = r;
      targetPixels[targetIdx + 1] = g;
      targetPixels[targetIdx + 2] = b;
      targetPixels[targetIdx + 3] = a;
    }
  }
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
      // Запрашиваем доступ к микрофону с усиленными параметрами
      userStartAudio().then(() => {
        mic.start();
        // Устанавливаем высокий уровень усиления для микрофона
        mic.amp(1.0);
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
  
  // Добавляем кнопку для переключения видимости текста для отладки
  const debugButton = createButton('Отладка текста');
  debugButton.position(10, 10);
  debugButton.mousePressed(() => {
    textVisible = !textVisible;
    console.log('Отладка текста:', textVisible);
  });
} 