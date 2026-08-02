// ig/downloader.js - Instagram media resolution & downloading

const axios = require('axios');
const { igdl } = require('ruhend-scraper');
const CONFIG = require('../config');

const BROWSER_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function isValidInstagramUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const patterns = [
        /https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|tv|stories)\/[A-Za-z0-9_.\-/]+/i,
        /https?:\/\/(www\.)?instagr\.am\/(p|reel|tv)\/[A-Za-z0-9_-]+/i
    ];
    return patterns.some((pattern) => pattern.test(url.trim()));
}

/**
 * Pull the first Instagram URL out of arbitrary message text and normalize it
 * (strip tracking query params, keep the path).
 */
function extractCleanInstagramUrl(inputText) {
    if (!inputText) return null;
    const urlMatch = inputText.match(/(https?:\/\/[^\s]+)/);
    if (!urlMatch) return null;

    const url = urlMatch[0];
    const cleanMatch = url.match(
        /(https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|tv|stories)\/[A-Za-z0-9_.\-/]+?)(?:[/?#]|$)/i
    );
    if (cleanMatch) return cleanMatch[1];

    return isValidInstagramUrl(url) ? url.split('?')[0].split('#')[0] : null;
}

/**
 * BUG 4 ROOT CAUSE: the old dedup keyed only on the URL path (before "?").
 * Instagram carousel items are served from the SAME CDN path with DIFFERENT
 * query signatures, so multiple distinct slides collapsed into one and the
 * rest of the carousel silently vanished. We now dedup on the full URL and
 * only fall back to the path when the scraper genuinely repeats an item.
 * Order is preserved so slide 1..N arrive in the right sequence.
 */
function extractUniqueMedia(mediaData) {
    const uniqueMedia = [];
    const seenFull = new Set();

    for (const media of mediaData) {
        const rawUrl = media?.url || media?.videoUrl || media?.imageUrl;
        if (!rawUrl) continue;

        if (seenFull.has(rawUrl)) continue;
        seenFull.add(rawUrl);

        uniqueMedia.push({
            url: rawUrl,
            thumbnail: media.thumbnail || media.thumb || null,
            // Trust an explicit type hint from the scraper when present.
            typeHint:
                media.type ||
                (media.videoUrl ? 'video' : media.imageUrl ? 'image' : null)
        });
    }

    return uniqueMedia;
}

/**
 * Decide whether a media item is a video or an image. We prefer an explicit
 * hint from the scraper, then look at the URL, then fall back to the post type.
 */
function getMediaType(media, originalUrl) {
    if (media.typeHint === 'video' || media.typeHint === 'image') {
        return media.typeHint;
    }

    const url = (media.url || '').toLowerCase();
    if (
        /\.(mp4|mov|avi|mkv|webm|3gp)(\?|$)/i.test(url) ||
        url.includes('/video/') ||
        url.includes('_video_') ||
        url.includes('.mp4')
    ) {
        return 'video';
    }

    // A reel/tv link with a single item is virtually always a video.
    if (
        (originalUrl.includes('/reel/') ||
            originalUrl.includes('/reels/') ||
            originalUrl.includes('/tv/')) &&
        !/\.(jpg|jpeg|png|webp|heic)(\?|$)/i.test(url)
    ) {
        return 'video';
    }

    return 'image';
}

/**
 * Download a remote file into a Buffer with retries and a size guard.
 *
 * BUG 2 (part) ROOT CAUSE: unbounded downloads of large reels could exhaust
 * memory or produce a buffer Telegram refuses (>50 MB), and the throw was not
 * always caught. We cap the response size and surface a typed error so the
 * caller can gracefully offer a direct link instead of crashing.
 */
async function downloadFile(url, { retries = 3 } = {}) {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios({
                method: 'GET',
                url,
                responseType: 'arraybuffer',
                timeout: 60000,
                maxContentLength: CONFIG.MAX_UPLOAD_BYTES,
                maxBodyLength: CONFIG.MAX_UPLOAD_BYTES,
                headers: {
                    'User-Agent': BROWSER_UA,
                    Accept: '*/*',
                    Referer: 'https://www.instagram.com/'
                }
            });
            return Buffer.from(response.data);
        } catch (error) {
            lastError = error;
            const tooBig =
                error.code === 'ERR_FR_MAX_CONTENT_LENGTH_EXCEEDED' ||
                /maxContentLength/i.test(error.message || '');
            if (tooBig) {
                const err = new Error('MEDIA_TOO_LARGE');
                err.code = 'MEDIA_TOO_LARGE';
                throw err;
            }
            if (attempt < retries) {
                await new Promise((r) => setTimeout(r, 1000 * attempt));
            }
        }
    }
    throw lastError || new Error('Failed to download media file');
}

/**
 * Resolve an Instagram URL to a normalized media list using the scraper.
 * Returns { media: [...], caption: string|null }.
 * Throws only on a genuine scraper failure; "no media" resolves to [].
 */
async function fetchInstagramMedia(url) {
    const downloadData = await igdl(url);
    const items = downloadData?.data || [];
    const media = extractUniqueMedia(items);
    return {
        media,
        caption:
            typeof downloadData?.caption === 'string'
                ? downloadData.caption
                : null
    };
}

module.exports = {
    BROWSER_UA,
    isValidInstagramUrl,
    extractCleanInstagramUrl,
    extractUniqueMedia,
    getMediaType,
    downloadFile,
    fetchInstagramMedia
};
