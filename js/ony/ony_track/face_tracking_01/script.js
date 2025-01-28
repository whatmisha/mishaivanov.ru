let video;
let poseNet;
let poses = [];
let letterO, letterN, letterY;

// В начале файла добавим стиль
let style = document.createElement('style');
style.textContent = `
    .variable-font {
        font-family: 'Ony Track VGX';
        font-variation-settings: 'wdth' 1000;
    }
`;
document.head.appendChild(style);

function setup() {
    createCanvas(windowWidth, windowHeight);
    video = createCapture(VIDEO);
    video.size(640, 480);
    video.hide();
    
    poseNet = ml5.poseNet(video, modelReady);
    poseNet.on('pose', function(results) {
        poses = results;
    });
    
    // Создаем элементы для букв
    letterO = createDiv('O');
    letterN = createDiv('N');
    letterY = createDiv('Y');
    
    // Стилизуем элементы
    const letterStyle = `
        position: absolute;
        font-family: 'Ony Track VGX';
        font-size: 180px;
        color: rgb(0, 255, 0);
        transform: scaleX(-1) translate(-50%, -50%);
        pointer-events: none;
        text-align: center;
    `;
    
    letterO.style(letterStyle);
    letterN.style(letterStyle);
    letterY.style(letterStyle);

    setTimeout(() => {
        letterO.style('font-variation-settings', '"wdth" 100');
        letterN.style('font-variation-settings', '"wdth" 500');
        letterY.style('font-variation-settings', '"wdth" 1000');
    }, 1000);
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
    
    // Нормализуем отклонение от 0 до 1 и делаем более чувствительным
    let normalizedDeviation = (deviation / maxDeviation) * 2; // Умножаем на 2 для большей чувствительности
    
    // Преобразуем в значение ширины от 100 до 1000
    let width = 1000 - (normalizedDeviation * 900);
    
    // Ограничиваем значения
    return Math.max(100, Math.min(1000, Math.round(width)));
}

function drawVariableText(x, y, text, width) {
    const ctx = drawingContext;
    ctx.save();
    ctx.font = `180px "Ony Track VGX"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgb(0, 255, 0)';
    
    // Устанавливаем вариативные настройки
    ctx.font = `180px "Ony Track VGX"`;
    ctx.fontVariationSettings = `"wdth" ${width}`;
    
    ctx.fillText(text, x, y);
    ctx.restore();
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
            console.log('Width value:', widthValue);
            
            // Обновляем позиции и стили букв
            if (leftEye.score > 0.2) {
                let scaledX = (leftEye.position.x / 640) * w + x;
                let scaledY = (leftEye.position.y / 480) * h + y;
                letterO.position(width - scaledX, scaledY);
                letterO.style('font-variation-settings', `"wdth" ${widthValue}`);
                letterO.style('transform', `scaleX(-1) translate(-50%, -50%)`);
            }
            
            if (rightEye.score > 0.2) {
                let scaledX = (rightEye.position.x / 640) * w + x;
                let scaledY = (rightEye.position.y / 480) * h + y;
                letterN.position(width - scaledX, scaledY);
                letterN.style('font-variation-settings', `"wdth" ${widthValue}`);
                letterN.style('transform', `scaleX(-1) translate(-50%, -50%)`);
            }
            
            if (nose.score > 0.2) {
                let scaledX = (nose.position.x / 640) * w + x;
                let scaledY = ((nose.position.y / 480) * h + y) + 30;
                letterY.position(width - scaledX, scaledY);
                letterY.style('font-variation-settings', `"wdth" ${widthValue}`);
                letterY.style('transform', `scaleX(-1) translate(-50%, -50%)`);
            }
        }
    }
    
    pop();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
