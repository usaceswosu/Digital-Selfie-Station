let currentFacingMode = 'environment';
let activeStream = null;

const video = document.getElementById('webcam');
const snapBtn = document.getElementById('snapBtn');
const timerBtn = document.getElementById('timerBtn');
const flipBtn = document.getElementById('flipBtn');
const countdown = document.getElementById('countdown');
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

// Captures camera view matching the viewfinder display
function captureCompositeFrame() {
    if (!activeStream) return;

    const videoWidth = video.videoWidth || 1280;
    const videoHeight = video.videoHeight || 720;
    const displayRect = video.getBoundingClientRect();
    const displayWidth = displayRect.width || 300;
    const displayHeight = displayRect.height || 400;
    
    canvas.width = displayWidth * 2; 
    canvas.height = displayHeight * 2;

    const ctx = canvas.getContext('2d');

    // Mirror camera for selfie mode
    ctx.save();
    if (currentFacingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
    }

    const videoRatio = videoWidth / videoHeight;
    const displayRatio = displayWidth / displayHeight;

    let sWidth, sHeight, sX, sY;

    if (videoRatio > displayRatio) {
        sHeight = videoHeight;
        sWidth = videoHeight * displayRatio;
        sX = (videoWidth - sWidth) / 2;
        sY = 0;
    } else {
        sWidth = videoWidth;
        sHeight = videoWidth / displayRatio;
        sX = 0;
        sY = (videoHeight - sHeight) / 2;
    }

    ctx.drawImage(video, sX, sY, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

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
    flipBtn.disabled = true;
    countdown.innerText = remaining;

    const interval = setInterval(() => {
        remaining--;
        if (remaining > 0) {
            countdown.innerText = remaining;
        } else {
            clearInterval(interval);
            countdown.innerText = '';
            snapBtn.disabled = false;
            timerBtn.disabled = false;
            flipBtn.disabled = false;
            captureCompositeFrame();
        }
    }, 1000);
}

// Event listeners
snapBtn.addEventListener('click', captureCompositeFrame);
timerBtn.addEventListener('click', () => runTimerSequence(5));
flipBtn.addEventListener('click', () => {
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    startCamera(currentFacingMode);
});

startCamera(currentFacingMode);

 // overlay selection,  make it pretty

// other todos: consent form, supabase backend for storing images. I'd like to get finished with the easier stuff early so I can have some fun with the overlays, maybe with AR/filters etc. 