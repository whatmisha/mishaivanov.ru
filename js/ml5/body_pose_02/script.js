let video;
let poseNet;
let poses = [];

function setup() {
    const canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('videoContainer'); // Делаем холст дочерним элементом контейнера для видео
    video = createCapture(VIDEO);
    video.size(width, height);

    // Закомментируем строку с CSS-фильтром, т.к. будем применять черно-белый фильтр вручную
    // video.style('filter', 'grayscale(100%)');

    video.hide(); // Скрываем HTML-элемент видео, чтобы отобразить его на холсте
    poseNet = ml5.poseNet(video, modelReady);
    poseNet.on('pose', function(results) {
        poses = results;
    });
}

function modelReady() {
    console.log('Model Loaded');
    document.getElementById('preloader').style.display = 'none'; // Скрываем прелоадер после загрузки модели
}

function draw() {
    clear(); // Очищаем холст перед каждым новым кадром
    push(); // Сохраняем текущее состояние системы координат
    translate(width, 0); // Перемещаем начало координат в правый верхний угол
    scale(-1, 1); // Масштабируем по оси X для зеркального отображения

    // Применяем черно-белый фильтр к видео перед отображением
    filter(GRAY);
    image(video, 0, 0, width, height); // Отображаем видео на холсте

    drawKeypoints();
    drawSkeleton();
    pop(); // Восстанавливаем сохраненное состояние системы координат
}

// Функция для отрисовки ключевых точек
function drawKeypoints() {
    for (let i = 0; i < poses.length; i++) {
        let pose = poses[i].pose;
        for (let j = 0; j < pose.keypoints.length; j++) {
            let keypoint = pose.keypoints[j];
            if (keypoint.score > 0.2) {
                fill(0,0,255); // Задаем цвет точек
                noStroke();
                ellipse(keypoint.position.x, keypoint.position.y, 40, 40); // Рисуем эллипсы на ключевых точках
            }
        }
    }
}

// Функция для отрисовки скелета
function drawSkeleton() {
    for (let i = 0; i < poses.length; i++) {
        let skeleton = poses[i].skeleton;
        for (let j = 0; j < skeleton.length; j++) {
            let partA = skeleton[j][0];
            let partB = skeleton[j][1];
            stroke(0, 0, 255); // Задаем цвет линий
            strokeWeight(40);
            line(partA.position.x, partA.position.y, partB.position.x, partB.position.y); // Рисуем линии между ключевыми точками
        }
    }
}
