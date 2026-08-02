// plugins/handlers.js - Instagram download flow orchestration

const CONFIG = require('../config');
const {
    getRandomReaction,
    escapeMarkdown,
    safeDeleteMessage
} = require('../automation/utils');
const { addUser, logDownload } = require('../automation/database');
const {
    isValidInstagramUrl,
    extractCleanInstagramUrl,
    fetchInstagramMedia
} = require('../ig/downloader');
const { resolveCaption } = require('../ig/caption');
const { checkForceSub, sendForceSubMessage } = require('./forcesub');
const { createMainMenuKeyboard } = require('./keyboards');
const { createSession, deliverAllMedia } = require('./media');

/**
 * Main Instagram handler. Every failure path deletes the processing sticker
 * and replies with a friendly message — nothing here is allowed to throw out
 * of the function (the global bot.catch is the final safety net).
 */
async function handleInstagramCommand(bot, ctx) {
    const userId = ctx.from.id;
    const username = ctx.from.username || null;
    const firstName = ctx.from.first_name || 'User';

    // Force-sub gate.
    const notJoined = await checkForceSub(bot, userId);
    if (notJoined.length > 0) {
        return sendForceSubMessage(ctx, notJoined);
    }

    await addUser(bot, userId, username, firstName);

    const text = ctx.message?.text || ctx.message?.caption || '';
    const instagramUrl = extractCleanInstagramUrl(text);

    if (!instagramUrl || !isValidInstagramUrl(instagramUrl)) {
        return ctx.reply(
            `${getRandomReaction()} *❌ ɪɴᴠᴀʟɪᴅ ɪɴsᴛᴀɢʀᴀᴍ ʟɪɴᴋ!*\n\n` +
                'ᴘʟᴇᴀsᴇ ᴘʀᴏᴠɪᴅᴇ ᴀ ᴠᴀʟɪᴅ ɪɴsᴛᴀɢʀᴀᴍ ᴜʀʟ.\n\n' +
                '*ᴇxᴀᴍᴘʟᴇs:*\n' +
                '• `https://instagram.com/reel/ABC123`\n' +
                '• `https://instagram.com/p/XYZ789`',
            { parse_mode: 'Markdown' }
        );
    }

    let processingMsg;
    try {
        processingMsg = await ctx.replyWithSticker(CONFIG.PROCESSING_STICKER);
    } catch (_) {
        processingMsg = null;
    }

    try {
        const { media, caption: scraperCaption } = await fetchInstagramMedia(
            instagramUrl
        );

        if (!media || media.length === 0) {
            await safeDeleteMessage(ctx, processingMsg?.message_id);
            return ctx.reply(
                `${getRandomReaction()} *❌ ɴᴏ ᴍᴇᴅɪᴀ ꜰᴏᴜɴᴅ!*\n\n` +
                    'ᴛʜᴇ ᴘᴏsᴛ ᴍɪɢʜᴛ ʙᴇ ᴘʀɪᴠᴀᴛᴇ, ᴅᴇʟᴇᴛᴇᴅ, ᴏʀ ᴜɴᴀᴠᴀɪʟᴀʙʟᴇ.',
                { parse_mode: 'Markdown' }
            );
        }

        // Resolve the real caption (scraper first, IG embed fallback).
        const caption = await resolveCaption(scraperCaption, instagramUrl);

        await logDownload(bot, userId, username, instagramUrl, caption, media.length);

        await safeDeleteMessage(ctx, processingMsg?.message_id);

        const session = createSession(userId, media, instagramUrl, caption);
        const sessionData = { media, url: instagramUrl, caption, userId };

        if (media.length > 1) {
            await ctx.reply(
                `${getRandomReaction()} *🦊 sᴘɪᴅᴇʏ ᴏꜰꜰɪᴄɪᴀʟ*\n\n` +
                    `📦 *ꜰᴏᴜɴᴅ ${media.length} ᴍᴇᴅɪᴀ ɪᴛᴇᴍs!*\n` +
                    `⚡ *ᴘʀᴏᴄᴇssɪɴɢ ᴀʟʟ sʟɪᴅᴇs ɪɴ ʜᴅ...*`,
                { parse_mode: 'Markdown' }
            );
        }

        const { successCount, tooLarge } = await deliverAllMedia(ctx, sessionData);

        if (successCount === 0 && tooLarge.length === 0) {
            await ctx.reply(
                `${getRandomReaction()} *❌ ᴅᴏᴡɴʟᴏᴀᴅ ꜰᴀɪʟᴇᴅ!*\n\n` +
                    'ᴄᴏᴜʟᴅ ɴᴏᴛ ᴅᴏᴡɴʟᴏᴀᴅ ᴍᴇᴅɪᴀ. ᴘʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.',
                { parse_mode: 'Markdown' }
            );
        } else {
            await ctx.reply(
                `${getRandomReaction()} *✅ ᴅᴏᴡɴʟᴏᴀᴅ ᴄᴏᴍᴘʟᴇᴛᴇ!*\n\n` +
                    `*${successCount} ᴍᴇᴅɪᴀ ɪᴛᴇᴍ${successCount === 1 ? '' : 's'}* sᴜᴄᴄᴇssꜰᴜʟʟʏ sᴇɴᴛ!\n\n` +
                    `🦊 *ᴛʜᴀɴᴋs ꜰᴏʀ ᴜsɪɴɢ sᴘɪᴅᴇʏ ᴏꜰꜰɪᴄɪᴀʟ!*`,
                { parse_mode: 'Markdown' }
            );
        }
    } catch (scraperError) {
        console.error('💥 Scraper/handler error:', scraperError.message);
        await safeDeleteMessage(ctx, processingMsg?.message_id);
        await ctx.reply(
            `${getRandomReaction()} *❌ ᴅᴏᴡɴʟᴏᴀᴅ ᴇʀʀᴏʀ!*\n\n` +
                'ꜰᴀɪʟᴇᴅ ᴛᴏ ꜰᴇᴛᴄʜ ᴍᴇᴅɪᴀ. ᴘʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ɪɴ ᴀ ꜰᴇᴡ ᴍɪɴᴜᴛᴇs.',
            { parse_mode: 'Markdown' }
        );
    }
}

module.exports = { handleInstagramCommand };
