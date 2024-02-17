let video;
let poseNet;
let poses = [];

function setup() {
    createCanvas(windowWidth, windowHeight); // Создаем холст размером с окно браузера
    video = createCapture(VIDEO);
    video.size(width, height);
    
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
    image(video, 0, 0, width, height);
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