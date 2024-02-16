let video;
let poseNet;
let poses = [];

function setup() {
    createCanvas(640, 480);
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
    // Отображаем видео, отраженное по горизонтали
    translate(width, 0); // Смещаем систему координат к правому краю канваса
    scale(-1, 1); // Применяем масштабирование для отражения содержимого канваса
    image(video, 0, 0, width, height);
    drawKeypoints();
    drawSkeleton();
}

// Рисуем ключевые точки позы на канвасе
function drawKeypoints()  {
    for (let i = 0; i < poses.length; i++) {
        let pose = poses[i].pose;
        for (let j = 0; j < pose.keypoints.length; j++) {
            let keypoint = pose.keypoints[j];
            if (keypoint.score > 0.2) {
                fill(255, 0, 0);
                noStroke();
                ellipse(keypoint.position.x, keypoint.position.y, 10, 10);
            }
        }
    }
}

// Добавим функцию для рисования скелета
function drawSkeleton() {
    for (let i = 0; i < poses.length; i++) {
        let skeleton = poses[i].skeleton;
        for (let j = 0; j < skeleton.length; j++) {
            let partA = skeleton[j][0];
            let partB = skeleton[j][1];
            stroke(255, 0, 0);
            line(partA.position.x, partA.position.y, partB.position.x, partB.position.y);
        }
    }
}
