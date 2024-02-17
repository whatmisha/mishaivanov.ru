const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {facingMode: 'user'},
    });
    video.srcObject = stream;
    return new Promise((resolve) => {
        video.onloadedmetadata = () => resolve(video);
    });
}

async function loadHandpose() {
    return await handpose.load();
}

async function detect(net) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const predictions = await net.estimateHands(video);
    
    predictions.forEach(prediction => {
        const landmarks = prediction.landmarks;
        landmarks.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
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
