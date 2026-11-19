let currentFacingMode = 'environment';
let activeStream = null;

const video = document.getElementById('webcam');
const snapBtn = document.getElementById('snapBtn');
const timerBtn = document.getElementById('timerBtn');
const flipBtn = document.getElementById('flipBtn');
const countdown = document.getElementById('countdown');
const canvas = document.getElementById('snapshotCanvas');
const photoReviewModal = document.getElementById('photoReviewModal');
const photoPreviewImg = document.getElementById('photoPreviewImg');
const submitPhotoBtn = document.getElementById('submitPhotoBtn');
const retakeBtn = document.getElementById('retakeBtn');

const frameConfigs = {
    'assets/Canton Lake.png': { x: 100, y: 200, width: 1720, height: 950 },
    'assets/Mount Corpsmore.png': { x: 120, y: 140, width: 1680, height: 900 },
    'assets/Lock 18 RFH.png': { x: 100, y: 120, width: 1750, height: 980 },
    'assets/Keystone Lake.png': { x: 130, y: 220, width: 1660, height: 900 },
    'assets/Fort Supply Lake.png': { x: 110, y: 210, width: 1700, height: 920 }
};

let capturedBlob = null;

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
        if (facingMode === 'user') {
            video.style.transform = 'scaleX(-1)';
        } else {
            video.style.transform = 'none';
        }

    } catch (err) {
        console.error("Camera access error:", err);
        alert("Unable to access camera. Please check browser permissions.");
    }
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
            preview();
        }
    }, 1000);
}

function preview() {
    if (!video.srcObject) return;

    const videoWidth = video.videoWidth || 1280;
    const videoHeight = video.videoHeight || 720;
    const displayRect = video.getBoundingClientRect();
    
    // Fallback to window dimensions if bounding rect is 0
    const displayWidth = displayRect.width || window.innerWidth;
    const displayHeight = displayRect.height || window.innerHeight;

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
    const displayRatio = canvas.width / canvas.height; 

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


    const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
    photoPreviewImg.src = dataUrl;
    photoReviewModal.style.display = 'flex';
}

// Event listeners
timerBtn.addEventListener('click', () => runTimerSequence(5));
flipBtn.addEventListener('click', () => {
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    startCamera(currentFacingMode);
});

snapBtn.addEventListener('click', () => preview());
retakeBtn.addEventListener('click', () => {
    photoReviewModal.style.display = 'none';
    photoPreviewImg.src = '';
});
 // overlay selection, fix weird mobile bugs

// other todos: make consent form pretty, supabase backend for storing images. I'd like to get finished with the easier stuff early so I can have some fun with the overlays, maybe with AR/filters etc. 