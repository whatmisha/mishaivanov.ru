const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user' },
    });
    video.srcObject = stream;
    return new Promise((resolve) => {
        video.onloadedmetadata = () => resolve(video);
    });
}

async function loadModel() {
    try {
        const model = await blazeface.load();
        console.log('Модель успешно загружена.');
        return model;
    } catch (error) {
        console.error('Ошибка при загрузке модели:', error);
    }
}

async function detect(net) {
    if (video.readyState !== 4) {
        requestAnimationFrame(() => detect(net));
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const predictions = await net.estimateFaces(video, false);

    predictions.forEach(prediction => {
        const start = prediction.topLeft;
        const end = prediction.bottomRight;
        const size = [end[0] - start[0], end[1] - start[1]];

        // Рисуем прямоугольник вокруг лица
        ctx.beginPath();
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 20;
        ctx.rect(start[0], start[1], size[0], size[1]);
        ctx.stroke();
    });

    requestAnimationFrame(() => detect(net));
}

async function main() {
    await setupCamera();
    video.play();
    const net = await loadModel();
    document.getElementById('preloader').style.display = 'none';
    detect(net);
}

main();
