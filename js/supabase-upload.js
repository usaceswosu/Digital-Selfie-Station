// Copy your project URL and publishable key from Supabase's Connect dialog.
// This key is public. Storage policies must control upload permissions.
const SUPABASE_PROJECT_URL = 'https://yqnoqmylhpphtdmsvmfc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_B4NWyzDQk4Rwe-No64dKFA_X46p9KDT';
const SUPABASE_PHOTO_BUCKET = 'selfies';

let photoStorageClient;

window.uploadSelfieToSupabase = async function ({ canvas, consentGranted }) {
    if (consentGranted !== true) {
        return null;
    }

    if (SUPABASE_PROJECT_URL.includes('YOUR_PROJECT_ID') ||
        SUPABASE_PUBLISHABLE_KEY === 'YOUR_PUBLISHABLE_KEY') {
        throw new Error('Add your Supabase project URL and publishable key to supabase-upload.js.');
    }

    if (!window.supabase) {
        throw new Error('Supabase could not load. Check your connection and try again.');
    }

    if (!(canvas instanceof HTMLCanvasElement) || !canvas.width || !canvas.height) {
        throw new Error('Take a photo before submitting.');
    }

    if (!photoStorageClient) {
        photoStorageClient = window.supabase.createClient(
            SUPABASE_PROJECT_URL,
            SUPABASE_PUBLISHABLE_KEY
        );
    }

    const photo = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Could not prepare the photo. Try taking it again.'));
            }
        }, 'image/jpeg', 0.9);
    });

    const { data, error } = await photoStorageClient.storage
        .from(SUPABASE_PHOTO_BUCKET)
        .upload(`${crypto.randomUUID()}.jpg`, photo, {
            contentType: 'image/jpeg',
            upsert: false
        });

    if (error) {
        throw error;
    }

    return data.path;
};
