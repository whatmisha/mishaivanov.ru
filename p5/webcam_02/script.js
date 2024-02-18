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

async function loadHandpose() {
    return await handpose.load();
}

function applyGrayscaleToImageData(imageData) {
    let data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        let gray = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
        data[i] = gray;        // red
        data[i + 1] = gray;    // green
        data[i + 2] = gray;    // blue
    }
    return imageData;
}

async function detect(net) {
    if (video.readyState !== 4) { // Ensure video is ready
        requestAnimationFrame(() => detect(net));
        return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.save();
    ctx.scale(-1, 1); // Mirror the image
    ctx.translate(-canvas.width, 0);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    imageData = applyGrayscaleToImageData(imageData);
    ctx.putImageData(imageData, 0, 0);

    const predictions = await net.estimateHands(video);
    predictions.forEach(prediction => {
        const landmarks = prediction.landmarks;
        landmarks.forEach(([x, y]) => {
            const mirroredX = canvas.width - x; // Mirror the landmark x coordinate
            ctx.beginPath();
            ctx.arc(mirroredX, y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'blue';
            ctx.fill();
        });
    });

    requestAnimationFrame(() => detect(net));
}

async function main() {
    await setupCamera();
    video.play();
    const net = await loadHandpose();
    detect(net);
}

main();
