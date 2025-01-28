let video;
let poseNet;
let poses = [];

function setup() {
    createCanvas(windowWidth, windowHeight);
    video = createCapture(VIDEO);
    video.size(640, 480);
    video.hide();
    
    poseNet = ml5.poseNet(video, modelReady);
    poseNet.on('pose', function(results) {
        poses = results;
    });
    
    textAlign(CENTER, CENTER);
    textSize(180);
    textFont('Ony Track VGX');
}

function modelReady() {
    console.log('PoseNet модель загружена');
}

function calculateWidth(nose, leftEye, rightEye) {
    // Вычисляем среднюю точку между глазами
    let centerX = (leftEye.position.x + rightEye.position.x) / 2;
    
    // Вычисляем отклонение носа от центра
    let deviation = Math.abs(nose.position.x - centerX);
    
    // Вычисляем максимально возможное отклонение (расстояние между глазами)
    let maxDeviation = Math.abs(rightEye.position.x - leftEye.position.x);
    
    // Нормализуем отклонение от 0 до 1
    let normalizedDeviation = deviation / maxDeviation;
    
    // Преобразуем в значение ширины от 100 до 1000
    // Чем больше отклонение, тем меньше ширина
    let width = 1000 - (normalizedDeviation * 900);
    
    // Ограничиваем значения
    width = Math.max(100, Math.min(1000, Math.round(width)));
    
    console.log('Width value:', width); // Отладочная информация
    return width;
}

function draw() {
    background(0);
    
    push();
    translate(width, 0);
    scale(-1, 1);
    
    let videoAspect = 4/3;
    let windowAspect = width / height;
    
    let w, h;
    
    if (windowAspect > videoAspect) {
        w = width;
        h = width / videoAspect;
    } else {
        h = height;
        w = height * videoAspect;
    }
    
    let x = (width - w) / 2;
    let y = (height - h) / 2;
    
    image(video, x, y, w, h);
    
    if (poses.length > 0) {
        let pose = poses[0].pose;
        
        let leftEye = pose.keypoints.find(k => k.part === 'leftEye');
        let rightEye = pose.keypoints.find(k => k.part === 'rightEye');
        let nose = pose.keypoints.find(k => k.part === 'nose');
        
        if (leftEye && rightEye && nose && 
            leftEye.score > 0.2 && rightEye.score > 0.2 && nose.score > 0.2) {
            
            let widthValue = calculateWidth(nose, leftEye, rightEye);
            document.body.style.fontVariationSettings = `'wdth' ${widthValue}`;
            
            // Отладочная информация
            console.log('Nose position:', nose.position.x);
            console.log('Center position:', (leftEye.position.x + rightEye.position.x) / 2);
            console.log('Font width set to:', widthValue);
            
            if (leftEye.score > 0.2) {
                let scaledX = (leftEye.position.x / 640) * w + x;
                let scaledY = (leftEye.position.y / 480) * h + y;
                fill(0, 255, 0);
                noStroke();
                push();
                translate(scaledX, scaledY);
                scale(-1, 1);
                text('O', 0, 0);
                pop();
            }
            
            if (rightEye.score > 0.2) {
                let scaledX = (rightEye.position.x / 640) * w + x;
                let scaledY = (rightEye.position.y / 480) * h + y;
                fill(0, 255, 0);
                noStroke();
                push();
                translate(scaledX, scaledY);
                scale(-1, 1);
                text('N', 0, 0);
                pop();
            }
            
            if (nose.score > 0.2) {
                let scaledX = (nose.position.x / 640) * w + x;
                let scaledY = ((nose.position.y / 480) * h + y) + 30;
                fill(0, 255, 0);
                noStroke();
                push();
                translate(scaledX, scaledY);
                scale(-1, 1);
                text('Y', 0, 0);
                pop();
            }
        }
    }
    
    pop();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
