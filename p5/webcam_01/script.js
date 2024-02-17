let video;
let poseNet;
let poses = [];

function setup() {
    createCanvas(windowWidth, windowHeight); // Создаем холст размером с окно браузера
    video = createCapture(VIDEO);
    video.size(width, height);

    // Отражаем видео по горизонтали для эффекта зеркала
    video.style('transform', 'scale(-1, 1)');

    poseNet = ml5.poseNet(video, modelReady);
    poseNet.on('pose', function(results) {
        poses = results;
    });
    video.hide(); // Скрываем HTML-элемент видео
}

function modelReady() {
    console.log('Model Loaded');
}

function draw() {
    background(0);

    // Рассчитываем соотношение сторон видео и окна
    const windowRatio = windowWidth / windowHeight;
    const videoRatio = video.width / video.height;
    let newWidth, newHeight;

    // Адаптируем размер видео, сохраняя пропорции и обрезая лишнее
    if (windowRatio > videoRatio) {
        newWidth = windowWidth;
        newHeight = windowWidth / videoRatio;
    } else {
        newWidth = windowHeight * videoRatio;
        newHeight = windowHeight;
    }

    // Отображаем видео зеркально, адаптированное под размер окна
    translate(width, 0);
    scale(-1, 1); // Зеркальное отображение
    image(video, (width - newWidth) / 2, (height - newHeight) / 2, newWidth, newHeight);

    drawKeypoints();
    drawSkeleton();
}

function drawKeypoints() {
    for (let i = 0; i < poses.length; i++) {
        let pose = poses[i].pose;
        for (let j = 0; j < pose.keypoints.length; j++) {
            let keypoint = pose.keypoints[j];
            if (keypoint.score > 0.2) {
                fill(0, 0, 255); // Синий цвет
                noStroke();
                ellipse(keypoint.position.x, keypoint.position.y, 40, 40); // Размер маркера
            }
        }
    }
}

function drawSkeleton() {
    for (let i = 0; i < poses.length; i++) {
        let skeleton = poses[i].skeleton;
        for (let j = 0; j < skeleton.length; j++) {
            let partA = skeleton[j][0];
            let partB = skeleton[j][1];
            stroke(0, 0, 255);
            strokeWeight(40);
            line(partA.position.x, partA.position.y, partB.position.x, partB.position.y);
        }
    }
}

// Добавляем обработчик события для адаптации размера холста при изменении размера окна
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}