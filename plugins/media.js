// plugins/media.js - Deliver Instagram media (images + videos, carousels)

const { getRandomReaction, escapeMarkdown, sleep } = require('../automation/utils');
const { getMediaType, downloadFile } = require('../ig/downloader');
const { beautifyCaption } = require('../ig/caption');
const { createMediaKeyboard } = require('./keyboards');
const CONFIG = require('../config');

// sessionId -> { media, url, caption, userId, createdAt }
const userSessions = new Map();

function createSession(userId, media, url, caption) {
    const sessionId = `${userId}_${Date.now()}`;
    userSessions.set(sessionId, {
        media,
        url,
        caption: caption || null,
        userId,
        createdAt: Date.now()
    });
    setTimeout(() => userSessions.delete(sessionId), CONFIG.SESSION_TTL_MS);
    return sessionId;
}

function getSession(sessionId) {
    return userSessions.get(sessionId);
}

function buildCaption(caption, label) {
    const beautified = beautifyCaption(caption);
    return (
        `${getRandomReaction()} 🦊 *sᴘɪᴅᴇʏ ᴏꜰꜰɪᴄɪᴀʟ - ᴘʀᴏ ᴠ3.1*\n\n` +
        `${label}` +
        (beautified ? `\n\n📝 *ᴄᴀᴘᴛɪᴏɴ:*\n${escapeMarkdown(beautified)}\n` : '\n') +
        `\n✨ *ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ ɪɴ ʜɪɢʜ ǫᴜᴀʟɪᴛʏ*\n` +
        `💎 *sᴘɪᴅᴇʏ ᴏꜰꜰɪᴄɪᴀʟ - ꜰᴀsᴛ • sᴇᴄᴜʀᴇ • sᴛʏʟɪsʜ*`
    );
}

/**
 * Split an array into chunks of a given size (Telegram media groups max = 10).
 */
function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

/**
 * Deliver ALL media for a post — this is the core of the carousel fix.
 *
 * BUG 4: previously images and videos were split into two separate flows and
 * only the FIRST media group / first video kept its caption, while >10-item
 * carousels were truncated with slice(0, 10) and navigation buttons did
 * nothing. Now we:
 *   - keep every unique slide (already deduped upstream),
 *   - send photos in batched albums of 10,
 *   - send each video individually (Telegram can't album-mix reliably),
 *   - preserve original slide order,
 *   - fall back to a direct link for any video Telegram won't accept (>50MB).
 *
 * Returns { successCount, failCount, tooLarge:[urls] }.
 */
async function deliverAllMedia(ctx, session) {
    const { media, url, caption } = session;
    let successCount = 0;
    let failCount = 0;
    const tooLarge = [];

    // Classify while preserving order.
    const classified = media.map((m) => ({
        ...m,
        kind: getMediaType(m, url)
    }));

    const images = classified.filter((m) => m.kind === 'image');
    const videos = classified.filter((m) => m.kind === 'video');

    // ---- Images: batched albums of up to 10 ----
    if (images.length > 0) {
        const buffers = [];
        for (let i = 0; i < images.length; i++) {
            try {
                const buffer = await downloadFile(images[i].url);
                buffers.push(buffer);
            } catch (error) {
                failCount++;
                console.error(`🖼️ Image ${i + 1} failed:`, error.message);
            }
        }

        if (buffers.length === 1) {
            await ctx.replyWithPhoto(
                { source: buffers[0] },
                {
                    caption: buildCaption(caption, `📸 *ʜᴅ ɪᴍᴀɢᴇ*`),
                    parse_mode: 'Markdown',
                    reply_markup: createMediaKeyboard(url, 0, media.length, `${session.userId}`)
                        .reply_markup
                }
            );
            successCount++;
        } else if (buffers.length > 1) {
            const batches = chunk(buffers, 10);
            for (let b = 0; b < batches.length; b++) {
                const group = batches[b].map((buf, idx) => ({
                    type: 'photo',
                    media: { source: buf },
                    caption:
                        idx === 0 && b === 0
                            ? buildCaption(
                                  caption,
                                  `📸 *${buffers.length} ʜᴅ ɪᴍᴀɢᴇs*`
                              )
                            : undefined,
                    parse_mode: idx === 0 && b === 0 ? 'Markdown' : undefined
                }));
                try {
                    await ctx.replyWithMediaGroup(group);
                    successCount += batches[b].length;
                } catch (error) {
                    failCount += batches[b].length;
                    console.error('💥 Album batch failed:', error.message);
                }
                if (b < batches.length - 1) await sleep(1200);
            }
        }
    }

    // ---- Videos: one at a time ----
    for (let i = 0; i < videos.length; i++) {
        try {
            const buffer = await downloadFile(videos[i].url);
            await ctx.replyWithVideo(
                { source: buffer },
                {
                    caption: buildCaption(
                        caption,
                        `🎥 *ʜᴅ ᴠɪᴅᴇᴏ ${i + 1}/${videos.length}*`
                    ),
                    parse_mode: 'Markdown',
                    supports_streaming: true,
                    reply_markup: createMediaKeyboard(url, i, media.length, `${session.userId}`)
                        .reply_markup
                }
            );
            successCount++;
        } catch (error) {
            if (error.code === 'MEDIA_TOO_LARGE') {
                // Too big to upload — hand the user a direct download link instead
                // of crashing (this was a common video-crash trigger).
                tooLarge.push(videos[i].url);
                await ctx.reply(
                    `${getRandomReaction()} *🎥 ᴠɪᴅᴇᴏ ${i + 1} ɪs ᴛᴏᴏ ʟᴀʀɢᴇ ᴛᴏ sᴇɴᴅ ᴅɪʀᴇᴄᴛʟʏ.*\n\n` +
                        `ᴛᴀᴘ ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ ɪɴ ʜᴅ:\n${videos[i].url}`,
                    { parse_mode: 'Markdown', disable_web_page_preview: false }
                );
            } else {
                failCount++;
                console.error(`🎥 Video ${i + 1} failed:`, error.message);
            }
        }
        if (i < videos.length - 1) await sleep(1000);
    }

    return { successCount, failCount, tooLarge };
}

module.exports = {
    userSessions,
    createSession,
    getSession,
    deliverAllMedia
};
