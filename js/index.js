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
    'assets/frame1.png': { x: 0.5, y: 0.14, width: 0.69, height: 0.4 }, // Canton Lake
    'assets/frame2.png': { x: 0.155, y: 0.14, width: 0.69, height: 0.65 }, // Fort Supply Lake
    'assets/frame3.png': { x: 0.155, y: 0.14, width: 0.69, height: 0.65 }, // Keystone Lake
    'assets/frame4.png': { x: 0.155, y: 0.14, width: 0.69, height: 0.65 }, // RFH Visitor Center
    'assets/frame5.png': { x: 0.155, y: 0.14, width: 0.69, height: 0.65 }  // Mount Corpsmore
};

let capturedBlob = null;

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

        ctx.save();
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

closeOverlayModal.addEventListener('click', () => {
    overlayModal.style.display = 'none';
});
 // overlay selection, fix weird mobile bugs

// other todos: make consent form pretty, supabase backend for storing images. I'd like to get finished with the easier stuff early so I can have some fun with the overlays, maybe with AR/filters etc. 