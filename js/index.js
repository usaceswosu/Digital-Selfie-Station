let currentFacingMode = 'environment';
let activeStream = null;

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

      
      startCamera(currentFacingMode);
    }