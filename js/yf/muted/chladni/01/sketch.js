let mic, fft;
let resolution = 300;
let isRunning = false;

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

function drawChladniPattern(freq, mode) {
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let u = map(x, 0, width, -1, 1);
      let v = map(y, 0, height, -1, 1);
      let r = sqrt(u * u + v * v);
      let theta = atan2(v, u);

      let wave = sin(freq * PI * r) * cos(mode * theta);
      let bright = map(abs(wave), 0, 1, 0, 255);

      let index = (x + y * width) * 4;
      pixels[index] = bright;
      pixels[index + 1] = bright;
      pixels[index + 2] = bright;
      pixels[index + 3] = 255;
    }
  }

  updatePixels();
}

function drawStaticPattern(freq, mode) {
  // Отрисовываем статическую фигуру для начального состояния
  background(0);
  loadPixels();
  
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let u = map(x, 0, width, -1, 1);
      let v = map(y, 0, height, -1, 1);
      let r = sqrt(u * u + v * v);
      let theta = atan2(v, u);

      let wave = sin(freq * PI * r) * cos(mode * theta);
      let bright = map(abs(wave), 0, 1, 0, 255);

      let index = (x + y * width) * 4;
      pixels[index] = bright;
      pixels[index + 1] = bright;
      pixels[index + 2] = bright;
      pixels[index + 3] = 255;
    }
  }
  
  updatePixels();
}

function setupInterface() {
  // Настройка кнопок
  const startButton = select('#start-button');
  const stopButton = select('#stop-button');
  
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
} 