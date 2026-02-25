// ─── R2 Audio Helpers ──────────────────────────────────────────────────────
// Cloudflare R2 is accessed via its public URL for GET (audio playback),
// and via a server-side Pages Function for PUT (upload).
// No S3 SDK needed on the client side — just URL construction.

const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL ?? '';

/**
 * Build the public URL for a stored audio file given its R2 object key.
 * Example key: "entries/kiteb/standard.mp3"
 */
export function getAudioUrl(objectKey: string): string {
    if (!R2_PUBLIC_URL) {
        console.warn('VITE_R2_PUBLIC_URL is not configured');
        return '';
    }
    return `${R2_PUBLIC_URL}/${objectKey}`;
}

/**
 * Build the object key for an entry's audio file.
 */
export function buildAudioKey(entryId: string, dialect = 'standard'): string {
    return `entries/${entryId}/${dialect}.mp3`;
}

/**
 * Check if an audio file is likely available (basic URL existence check).
 * In production, check the audio_files table in Turso instead.
 */
export async function checkAudioExists(objectKey: string): Promise<boolean> {
    try {
        const url = getAudioUrl(objectKey);
        const res = await fetch(url, { method: 'HEAD' });
        return res.ok;
    } catch {
        return false;
    }
}

// ─── Server-side helpers (called via Pages Functions) ─────────────────────

/**
 * Request audio generation for an entry via the Pages Function.
 * The function will: call Gemini TTS → upload to R2 → return the key.
 */
export async function requestAudioGeneration(
    entryId: string,
    ipa: string,
    dialect = 'standard',
): Promise<{ objectKey: string; url: string }> {
    const res = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_id: entryId, ipa, dialect }),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Audio generation failed: ${err}`);
    }
    const data = await res.json() as { object_key: string };
    return {
        objectKey: data.object_key,
        url: getAudioUrl(data.object_key),
    };
}
