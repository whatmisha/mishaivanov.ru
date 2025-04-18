let mic, fft;
let resolution = 300;
let isRunning = false;
let thresholdSlider; // Ползунок для порогового значения
let thresholdValue = 0.2; // Максимальное значение для максимальной контрастности (было 0.01)
let invertedMode = false; // Режим инверсии (белые линии на черном или черные линии на белом)
let modeXSlider, modeYSlider; // Слайдеры для режимов
let modeX = 3, modeY = 2; // Начальные значения режимов
let sensitivitySlider; // Ползунок для чувствительности
let sensitivity = 5.0; // Максимальная чувствительность микрофона
let smoothingSlider; // Ползунок для сглаживания
let smoothingValue = 0.0; // Минимальное сглаживание
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
let textInfluenceSlider;
let textVisible = true; // Для отладки

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
  textGraphics.fill(255); // Всегда белый текст
  textGraphics.noStroke();
  textGraphics.textFont('Arial Bold'); // Жирный шрифт для текста
  textGraphics.textAlign(CENTER, CENTER);
  textGraphics.textSize(textSizeValue);
  
  // Создаем размытый текст
  // Всегда применяем размытие, игнорируя значение textBlurValue = 0
  let effectiveBlur = max(5, textBlurValue); // Минимальное размытие 5
  drawBlurredText(textGraphics, customText, width/2, height/2, effectiveBlur);
  
  loadPixels();
  
  // Получаем пиксели текстовой графики
  let textPixels = textGraphics.get().pixels;

  const centerX = width / 2;
  const centerY = height / 2;
  const scale = min(width, height) / 2;
  
  // Предварительно вычисляем максимальное значение волны, чтобы масштабировать контраст
  let maxWaveValue = 0;
  for (let x = 0; x < width; x += 5) { // Проверяем каждый 5-й пиксель для скорости
    for (let y = 0; y < height; y += 5) {
      let normX = (x - centerX) / scale;
      let normY = (y - centerY) / scale;
      let value = abs(realChladniFormula(normX, normY, nX, nY) * amplitude);
      maxWaveValue = max(maxWaveValue, value);
    }
  }
  maxWaveValue = max(1.0, maxWaveValue); // Избегаем деления на ноль
  
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      // Нормализуем координаты к квадрату [-1, 1] x [-1, 1]
      let normX = (x - centerX) / scale;
      let normY = (y - centerY) / scale;
      
      // Вычисляем фигуру Хладни по формуле для прямоугольной пластины
      let value = realChladniFormula(normX, normY, nX, nY) * amplitude;
      
      // Получаем индекс пикселя в текстовой графике
      let txtIndex = (x + y * width) * 4;
      
      // Получаем значение альфа-канала текста (0-255)
      let textAlpha = textPixels[txtIndex + 3];
      
      // Смешиваем значение фигуры с текстом только в режиме интеграции
      // (но не когда текст отображается поверх)
      if (!textVisible && textAlpha > 0) {
        // Если есть текст в данной точке, влияем на значение фигуры
        // Нормализуем альфа к диапазону 0-1
        let textInfluence = (textAlpha / 255) * textInfluenceFactor;
        
        // Можно выбрать один из нескольких методов взаимодействия:
        
        // 1. Увеличиваем значение там, где текст
        value = value * (1 + textInfluence * 2);
        
        // 2. Для более сильного контраста, инвертируем значение в области текста
        if (textAlpha > 150) {
          value = maxWaveValue - value;
        }
        
        // 3. Задаем фиксированное значение для текста
        if (textAlpha > 200) {
          value = invertedMode ? 0.0 : 1.0;
        }
      }
      
      // Применяем пороговое значение или используем градиент
      let pixelValue;
      if (useGradientMode) {
        // Градиентный режим - используем значение напрямую, без порога
        pixelValue = map(abs(value), 0, maxWaveValue, 0, 255);
      } else {
        // Контрастный режим с порогом
        // Используем динамический порог в зависимости от максимального значения
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
  
  textGraphics.remove(); // Удаляем временную графику для экономии памяти
}

// Функция для рисования размытого текста
function drawBlurredText(graphics, txt, x, y, blurAmount) {
  // Убираем фон вокруг текста - больше не нужен
  
  // Рисуем текст с несколькими смещенными копиями для эффекта размытия
  let alpha = 180; // Настраиваем непрозрачность для размытия
  let step = max(0.3, blurAmount / 20); // Уменьшаем шаг для более плотного размытия
  
  // Очищаем графический буфер для текста
  graphics.clear();
  
  for (let i = -blurAmount; i <= blurAmount; i += step) {
    for (let j = -blurAmount; j <= blurAmount; j += step) {
      // Рассчитываем непрозрачность на основе расстояния от центра
      let distance = sqrt(i*i + j*j);
      let opacity = map(distance, 0, blurAmount, alpha, 0);
      
      // Всегда используем белый цвет для текста
      graphics.fill(255, opacity);
      graphics.text(txt, x + i, y + j);
    }
  }
  
  // Рисуем основной текст поверх с высокой непрозрачностью
  graphics.fill(255, 220);
  graphics.text(txt, x, y);
  
  // Убираем контрастную обводку текста - больше не нужна
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