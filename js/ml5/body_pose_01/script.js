let video;
let poseNet;
let poses = [];

function setup() {
    const canvas = createCanvas(640, 480); // Устанавливаем размер холста 640x480
    canvas.parent('videoContainer'); // Делаем холст дочерним элементом контейнера для видео
    video = createCapture(VIDEO);
    video.size(640, 480); // Устанавливаем размер видео 640x480

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
    translate(640, 0); // Перемещаем начало координат в правый верхний угол для размера 640x480
    scale(-1, 1); // Масштабируем по оси X для зеркального отображения

    filter(GRAY); // Применяем черно-белый фильтр к видео перед отображением
    image(video, 0, 0, 640, 480); // Отображаем видео на холсте 640x480

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
                fill(255, 255, 255); // Изменяем цвет точек на белый для лучшей видимости
                noStroke();
                ellipse(keypoint.position.x, keypoint.position.y, 20, 20); // Изменяем размер точек для соответствия масштабу 640x480
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
            stroke(0, 0, 0); // Изменяем цвет линий на белый для лучшей видимости
            strokeWeight(20); // Изменяем толщину линий для соответствия масштабу 640x480
            line(partA.position.x, partA.position.y, partB.position.x, partB.position.y); // Рисуем линии между ключевыми точками
        }
    }
}
