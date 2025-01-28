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
        
        if (leftEye && leftEye.score > 0.2) {
            let scaledX = (leftEye.position.x / 640) * w + x;
            let scaledY = (leftEye.position.y / 480) * h + y;
            fill(0, 255, 0);
            noStroke();
            text('O', scaledX, scaledY);
        }
        
        if (rightEye && rightEye.score > 0.2) {
            let scaledX = (rightEye.position.x / 640) * w + x;
            let scaledY = (rightEye.position.y / 480) * h + y;
            fill(0, 255, 0);
            noStroke();
            text('N', scaledX, scaledY);
        }
        
        if (nose && nose.score > 0.2) {
            let scaledX = (nose.position.x / 640) * w + x;
            let scaledY = ((nose.position.y / 480) * h + y) + 30;
            fill(0, 255, 0);
            noStroke();
            text('Y', scaledX, scaledY);
        }
    }
    
    pop();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
