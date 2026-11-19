let currentFacingMode = 'environment';
let activeStream = null;
let currentOverlay = 'none';

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
const overlayModal = document.getElementById('overlayModal');
const frameChoiceBtns = document.querySelectorAll('.frame-choice');
const closeOverlayModal = document.getElementById('closeOverlayModal');
const openOverlayBtn = document.getElementById('openOverlayBtn');
const loadedOverlayImages = {};
const liveOverlayPreview = document.getElementById('liveOverlayPreview');

const frameConfigs = {
    'assets/frame1.png': { x: 0.09, y: 0.2, width: 0.85, height: 0.85 },
    'assets/frame2.png': { x: 0.09, y: 0.2, width: 0.85, height: 0.85 },
    'assets/frame3.png': { x: 0.09, y: 0.2, width: 0.85, height: 0.85 },
    'assets/frame4.png': { x: 0.09, y: 0.1, width: 0.85, height: 0.85 },
    'assets/frame5.png': { x: 0.09, y: 0.1, width: 0.85, height: 0.85 }
};

let capturedBlob = null;
let boothRotation = 0;

Object.keys(frameConfigs).forEach(path => {
    const img = new Image();
    img.src = path;
    loadedOverlayImages[path] = img;
});

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
    updateLiveViewfinder();
}

function applyBoothRotation() {
    const stage = document.getElementById('boothStage'); // container holding #webcam & #liveOverlayPreview
    if (!stage) return;

    // Swap width/height on 90/270 deg so a landscape frame fits a portrait screen cleanly
    const isSideways = boothRotation % 180 !== 0;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (isSideways) {
        const scale = Math.min(vw / vh, vh / vw);
        stage.style.transform = `rotate(${boothRotation}deg) scale(${scale})`;
    } else {
        stage.style.transform = `rotate(${boothRotation}deg)`;
    }
    stage.style.transformOrigin = 'center center';
}

function updateLiveViewfinder() {
    const config = frameConfigs[currentOverlay];

    // Reset to full viewfinder when no frame is selected
    if (!config) {
        video.style.position = 'absolute';
        video.style.left = '0%';
        video.style.top = '0%';
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.clipPath = 'none';
        video.style.webkitClipPath = 'none';
        video.style.transform = currentFacingMode === 'user' ? 'scaleX(-1)' : 'none';
        return;
    }

    // Size and position <video> directly to the frame cutout window
    video.style.position = 'absolute';
    video.style.left = `${(config.x * 100).toFixed(2)}%`;
    video.style.top = `${(config.y * 100).toFixed(2)}%`;
    video.style.width = `${(config.width * 100).toFixed(2)}%`;
    video.style.height = `${(config.height * 100).toFixed(2)}%`;
    video.style.clipPath = 'none';
    video.style.webkitClipPath = 'none';
    video.style.transform = currentFacingMode === 'user' ? 'scaleX(-1)' : 'none';
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const config = frameConfigs[currentOverlay];

    if (config) {
        const winX = config.x * canvas.width;
        const winY = config.y * canvas.height;
        const winW = config.width * canvas.width;
        const winH = config.height * canvas.height;

        const angleRad = (boothRotation * Math.PI) / 180;
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(angleRad);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        ctx.beginPath();
        ctx.rect(winX, winY, winW, winH);
        ctx.clip();
    // Mirror camera for selfie mode
        if (currentFacingMode === 'user') {
            ctx.translate(winX + winW, winY);
            ctx.scale(-1, 1);
        } else {
            ctx.translate(winX, winY);
        }

        const videoRatio = videoWidth / videoHeight;
        const targetRatio = winW / winH; 

        let sWidth, sHeight, sX, sY;

        if (videoRatio > targetRatio) {
            sHeight = videoHeight;
            sWidth = videoHeight * targetRatio;
            sX = (videoWidth - sWidth) / 2;
            sY = 0;
        } else {
            sWidth = videoWidth;
            sHeight = videoWidth / targetRatio;
            sX = 0;
            sY = (videoHeight - sHeight) / 2;
        }

        ctx.drawImage(video, sX, sY, sWidth, sHeight, 0, 0, winW, winH);
        ctx.restore();

        if (currentOverlay !== 'none' && loadedOverlayImages[currentOverlay]) {
            const overlayImg = loadedOverlayImages[currentOverlay];
            if (overlayImg && overlayImg.complete && overlayImg.naturalWidth !== 0) {
                ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
            }
        }

    } else {
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
        console.log('currentOverlay:', JSON.stringify(currentOverlay));
        console.log('matched config:', frameConfigs[currentOverlay]);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
    photoPreviewImg.src = dataUrl;
    photoReviewModal.style.display = 'flex';
}

async function launchPhotoBooth() {
    consentDialog.close();
    consentScreen.style.display = 'none';
    cameraBooth.style.display = 'block';

    await startCamera(currentFacingMode);

    overlayModal.style.display = 'flex';
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

frameChoiceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        frameChoiceBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        currentOverlay = btn.getAttribute('data-overlay');
        updateLiveViewfinder();
        if (liveOverlayPreview) {
            if (currentOverlay && currentOverlay !== 'none') {
                liveOverlayPreview.src = currentOverlay;
                liveOverlayPreview.style.display = 'block';
            } else {
                liveOverlayPreview.removeAttribute('src');
                liveOverlayPreview.style.display = 'none';
            }
        }
    });
});

closeOverlayModal.addEventListener('click', () => {
    overlayModal.style.display = 'none';
});

if (openOverlayBtn) {
    openOverlayBtn.addEventListener('click', () => {
        overlayModal.style.display = 'flex';
    });
}
video.addEventListener('loadedmetadata', updateLiveViewfinder);
window.addEventListener('resize', updateLiveViewfinder);
// overlay selection, fix weird mobile bugs

// other todos: make consent form pretty, supabase backend for storing images. I'd like to get finished with the easier stuff early so I can have some fun with the overlays, maybe with AR/filters etc. 