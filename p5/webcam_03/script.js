const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        'audio': false,
        'video': {
            facingMode: 'user',
        },
    });
    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

async function loadHandpose() {
    const net = await handpose.load();
    console.log('Handpose model loaded');
    return net;
}

async function detect(net) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const predictions = await net.estimateHands(video);
    
    if (predictions.length > 0) {
        for (let i = 0; i < predictions.length; i++) {
            const landmarks = predictions[i].landmarks;

            // Draw landmarks
            for (let j = 0; j < landmarks.length; j++) {
                const [x, y, z] = landmarks[j];
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 3 * Math.PI);
                ctx.fillStyle = 'aqua';
                ctx.fill();
            }
        }
    }

    requestAnimationFrame(() => detect(net));
}

async function main() {
    await setupCamera();
    video.play();
    const net = await loadHandpose();
    detect(net);
}

main();
