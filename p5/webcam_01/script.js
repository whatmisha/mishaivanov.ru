let capture;

function setup() {
    createCanvas(windowWidth, windowHeight); // Создаем канвас на весь экран
    capture = createCapture(VIDEO); // Запрашиваем видео с веб-камеры
    capture.size(windowWidth, windowHeight); // Размер видео - на весь экран
    capture.hide(); // Скрываем оригинальный HTML элемент видео, чтобы мы могли рисовать его на канвасе p5.js
}

function draw() {
    image(capture, 0, 0, windowWidth, windowHeight); // Отображаем видео на канвасе
}

// При изменении размера окна браузера обновляем размер канваса и видео
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    capture.size(windowWidth, windowHeight);
}
