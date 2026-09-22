let currentFacingMode = 'environment';
let activeStream = null;

const video = document.getElementById('webcam');
const snapBtn = document.getElementById('snapBtn');
const timerBtn = document.getElementById('timerBtn');
const flipBtn = document.getElementById('flipBtn');
const canvas = document.createElement('canvas');

async function startCamera(facingMode) {
    if (activeStream) {
      activeStream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
        video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        },
        audio: false
    };

    try {
        activeStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = activeStream;
    } catch (err) {
        console.error("Camera access error:", err);
        alert("Unable to access camera. Please check browser permissions.");
    }
}

// captures camera view
function captureCompositeFrame() {
    if (!activeStream) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width; 
    canvas.height = height;

    const ctx = canvas.getContext('2d');

    // mirror camera for selfie mode
    ctx.save();

    if (currentFacingMode === 'user') {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    ctx.restore();

    canvas.toBlob((blob) => {
        console.log("Captured image blob ready:", blob);
        const photoUrl = URL.createObjectURL(blob);
        window.open(photoUrl, '_blank');
    }, 'image/jpeg', 0.85);
}

function runTimerSequence(seconds) {
    let remaining = seconds;
    snapBtn.disabled = true;
    timerBtn.disabled = true;

    const interval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(interval);
            snapBtn.disabled = false;
            timerBtn.disabled = false;
            captureCompositeFrame();
        }
    }, 1000);
}

// listeners to make the buttons work
snapBtn.addEventListener('click', captureCompositeFrame);
timerBtn.addEventListener('click', () => runTimerSequence(5));
flipBtn.addEventListener('click', () => {
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    startCamera(currentFacingMode);
});


startCamera(currentFacingMode);