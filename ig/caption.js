// ig/caption.js - Reliable Instagram caption resolution
//
// BUG 3 ROOT CAUSE: ruhend-scraper's igdl() frequently returns media URLs
// with NO caption (or an empty string), so the bot showed "no caption" even
// when the post clearly had one. Instagram exposes the real caption on its
// public embed page (no login required):
//     https://www.instagram.com/<p|reel|tv>/<shortcode>/embed/captioned/
// We fetch that page and extract the caption from the embedded JSON, falling
// back to scraping the visible caption element. The scraper's own caption is
// still preferred when present.

const axios = require('axios');

const BROWSER_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Decode the common HTML entities and JSON unicode escapes that show up in
 * captions pulled from raw HTML.
 */
function decodeEntities(text) {
    if (!text) return '';
    return text
        .replace(/\\u([\dA-Fa-f]{4})/g, (_, hex) =>
            String.fromCharCode(parseInt(hex, 16))
        )
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\//g, '/')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '') // strip any remaining tags
        .trim();
}

/**
 * Extract the shortcode (post id) from any Instagram URL form.
 */
function extractShortcode(url) {
    if (!url) return null;
    const match = url.match(
        /instagram\.com\/(?:p|reel|reels|tv|stories\/[^/]+)\/([A-Za-z0-9_-]+)/i
    );
    return match ? match[1] : null;
}

function parseCaptionFromHtml(html) {
    if (!html) return null;

    // 1) The embed JSON blob carries the caption under "edge_media_to_caption"
    //    or a plain "caption" field depending on the response shape.
    const edgeMatch = html.match(
        /"edge_media_to_caption":\s*{\s*"edges":\s*\[\s*{\s*"node":\s*{\s*"text":\s*"((?:[^"\\]|\\.)*)"/
    );
    if (edgeMatch && edgeMatch[1]) {
        const decoded = decodeEntities(edgeMatch[1]);
        if (decoded) return decoded;
    }

    const captionField = html.match(/"caption":\s*"((?:[^"\\]|\\.)*)"/);
    if (captionField && captionField[1]) {
        const decoded = decodeEntities(captionField[1]);
        if (decoded) return decoded;
    }

    // 2) Fall back to the visible caption element rendered on the embed page.
    const captionDiv = html.match(
        /<div[^>]*class="[^"]*Caption[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    );
    if (captionDiv && captionDiv[1]) {
        // The visible caption starts with the username in a bold/anchor tag;
        // strip that leading handle so we return just the caption body.
        let text = decodeEntities(captionDiv[1]);
        text = text.replace(/^\s*\S+\s{2,}/, '').trim();
        if (text) return text;
    }

    return null;
}

/**
 * Fetch the caption straight from Instagram's public embed page.
 * Returns null on any failure — callers must treat caption as optional.
 */
async function fetchCaptionFromEmbed(url) {
    const shortcode = extractShortcode(url);
    if (!shortcode) return null;

    const endpoints = [
        `https://www.instagram.com/p/${shortcode}/embed/captioned/`,
        `https://www.instagram.com/reel/${shortcode}/embed/captioned/`
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await axios.get(endpoint, {
                timeout: 15000,
                maxRedirects: 5,
                headers: {
                    'User-Agent': BROWSER_UA,
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                validateStatus: (s) => s >= 200 && s < 400
            });
            const caption = parseCaptionFromHtml(response.data);
            if (caption) return caption;
        } catch (_) {
            // Try the next endpoint form
        }
    }

    return null;
}

/**
 * Resolve the best available caption:
 *   1. Whatever the scraper already gave us (fast path).
 *   2. Instagram's public embed page (reliable fallback).
 */
async function resolveCaption(scraperCaption, url) {
    const fromScraper =
        typeof scraperCaption === 'string' ? scraperCaption.trim() : '';
    if (fromScraper) return fromScraper;

    try {
        return await fetchCaptionFromEmbed(url);
    } catch (_) {
        return null;
    }
}

/**
 * Format a caption for display: normalize excessive blank lines and cap length
 * so Telegram's 1024-char media-caption limit is never exceeded.
 */
function beautifyCaption(rawCaption) {
    if (!rawCaption) return null;
    let caption = String(rawCaption).trim().replace(/\n{3,}/g, '\n\n');
    if (caption.length > 800) {
        caption = caption.slice(0, 800).trim() + '…';
    }
    return caption || null;
}

module.exports = {
    extractShortcode,
    decodeEntities,
    parseCaptionFromHtml,
    fetchCaptionFromEmbed,
    resolveCaption,
    beautifyCaption
};
