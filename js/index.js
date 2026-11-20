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
const rotateBtn = document.getElementById('rotateBtn');
const boothStage = document.getElementById('boothStage');

const frameConfigs = {
    'assets/frame1.png': { x: 0.09, y: 0.125, width: 0.85, height: 0.875 },
    'assets/frame2.png': { x: 0.09, y: 0.125, width: 0.85, height: 0.875 },
    'assets/frame3.png': { x: 0.09, y: 0.125, width: 0.85, height: 0.875 },
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
let manualRotation = 0;
let activeRotation = 0;

function getDeviceOrientationRotation() {
    if (screen.orientation && typeof screen.orientation.angle === 'number') {
        const angle = ((screen.orientation.angle % 360) + 360) % 360;
        return angle;
    }
    if (window.matchMedia && window.matchMedia('(orientation: landscape)').matches) {
        return 90;
    }
    return 0;
}

function getEffectiveRotation() {
    return (manualRotation + getDeviceOrientationRotation()) % 360;
}

function applyBoothRotation() {
    if (!boothStage || !cameraBooth) return;

    activeRotation = getEffectiveRotation();

    const rect = cameraBooth.getBoundingClientRect();  
    const vw = rect.width || window.innerWidth;
    const vh = rect.height || window.innerHeight;
    const isSideways = activeRotation % 180 !== 0;

    if (isSideways) {
        boothStage.style.width = `${vh}px`;
        boothStage.style.height = `${vw}px`;
        const fitScale = Math.min(vw / vh, vh / vw);
        boothStage.style.transform = `translate(-50%, -50%) rotate(${activeRotation}deg) scale(${fitScale})`;
    } else {
        boothStage.style.width = `${vw}px`;
        boothStage.style.height = `${vh}px`;
        boothStage.style.transform = `translate(-50%, -50%) rotate(${activeRotation}deg) scale(1)`;
    }

    updateLiveViewfinder();
}

function syncOrientation() {
    requestAnimationFrame(() => {
        applyBoothRotation();
        setTimeout(applyBoothRotation, 150);
    });
}

if (rotateBtn) {
    rotateBtn.addEventListener('click', () => {
        manualRotation = (manualRotation + 90) % 360;
        applyBoothRotation();
    });
}

window.addEventListener('resize', syncOrientation);
window.addEventListener('orientationchange', syncOrientation);
if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', syncOrientation);
}

function updateLiveViewfinder() {
    const config = frameConfigs[currentOverlay];

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

async function preview() {
    if (!video.srcObject) return;

    activeRotation = getEffectiveRotation();
    const isSideways = activeRotation % 180 !== 0;

    const videoWidth = video.videoWidth || 1280;
    const videoHeight = video.videoHeight || 720;

    const stageWidth = boothStage ? boothStage.offsetWidth : (video.getBoundingClientRect().width || window.innerWidth);
    const stageHeight = boothStage ? boothStage.offsetHeight : (video.getBoundingClientRect().height || window.innerHeight);

    canvas.width = (isSideways ? stageHeight : stageWidth) * 2;
    canvas.height = (isSideways ? stageWidth : stageHeight) * 2;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const config = frameConfigs[currentOverlay];

    function drawOrientedVideo(dx, dy, dw, dh) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(dx, dy, dw, dh);
        ctx.clip();

        ctx.translate(dx + dw / 2, dy + dh / 2);
        if (currentFacingMode === 'user') {
            ctx.scale(-1, 1);
        }

        const drawW = dw;
        const drawH = dh;

        const videoRatio = videoWidth / videoHeight;
        const targetRatio = drawW / drawH;

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

        ctx.drawImage(video, sX, sY, sWidth, sHeight, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
    }

    if (config) {
        const winX = config.x * canvas.width;
        const winY = config.y * canvas.height;
        const winW = config.width * canvas.width;
        const winH = config.height * canvas.height;

        drawOrientedVideo(winX, winY, winW, winH);

        if (currentOverlay && currentOverlay !== 'none' && loadedOverlayImages[currentOverlay]) {
            const overlayImg = loadedOverlayImages[currentOverlay];
            if (overlayImg && overlayImg.complete && overlayImg.naturalWidth !== 0) {
                ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
            }
        }
    } else {
        drawOrientedVideo(0, 0, canvas.width, canvas.height);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
    photoPreviewImg.src = dataUrl;
    photoReviewModal.style.display = 'flex';
}

async function launchPhotoBooth() {
    consentDialog.close();
    consentScreen.style.display = 'none';
    cameraBooth.style.display = 'block';
    syncOrientation();
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