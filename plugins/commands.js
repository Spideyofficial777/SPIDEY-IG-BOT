// plugins/commands.js - /start, /stats, and all callback buttons

const CONFIG = require('../config');
const {
    getRandomReaction,
    getRandomItem,
    escapeMarkdown
} = require('../automation/utils');
const { database, addUser } = require('../automation/database');
const { checkForceSub, sendForceSubMessage } = require('./forcesub');
const {
    createMainMenuKeyboard,
    createBackKeyboard
} = require('./keyboards');
const { getSession, deliverAllMedia } = require('./media');

function startText(firstName) {
    return (
        `${getRandomReaction()} *ᴡᴇʟᴄᴏᴍᴇ, ${escapeMarkdown(firstName)}!*\n\n` +
        `🦊 *sᴘɪᴅᴇʏ ᴏꜰꜰɪᴄɪᴀʟ - ᴘʀᴏ ᴠ3.1*\n\n` +
        `📥 *ɪ ᴄᴀɴ ᴅᴏᴡɴʟᴏᴀᴅ:*\n` +
        `• ʀᴇᴇʟs & ᴠɪᴅᴇᴏs\n` +
        `• ᴘʜᴏᴛᴏs & ᴄᴀʀᴏᴜsᴇʟs (ᴀʟʟ sʟɪᴅᴇs!)\n` +
        `• sᴛᴏʀɪᴇs & ɪɢᴛᴠ\n\n` +
        `✨ *ᴊᴜsᴛ sᴇɴᴅ ᴍᴇ ᴀɴ ɪɴsᴛᴀɢʀᴀᴍ ʟɪɴᴋ!*\n\n` +
        `💎 *ꜰᴀsᴛ • sᴇᴄᴜʀᴇ • sᴛʏʟɪsʜ*`
    );
}

function registerCommands(bot) {
    // /start
    bot.start(async (ctx) => {
        const userId = ctx.from.id;
        const username = ctx.from.username || null;
        const firstName = ctx.from.first_name || 'User';

        const notJoined = await checkForceSub(bot, userId);
        if (notJoined.length > 0) return sendForceSubMessage(ctx, notJoined);

        await addUser(bot, userId, username, firstName);

        try {
            await ctx.replyWithSticker(CONFIG.WELCOME_STICKER);
        } catch (_) {
            /* sticker optional */
        }

        const image = getRandomItem(CONFIG.START_IMG);
        try {
            await ctx.replyWithPhoto(image, {
                caption: startText(firstName),
                parse_mode: 'Markdown',
                reply_markup: createMainMenuKeyboard().reply_markup
            });
        } catch (_) {
            await ctx.reply(startText(firstName), {
                parse_mode: 'Markdown',
                reply_markup: createMainMenuKeyboard().reply_markup
            });
        }
    });

    // /stats (admin only)
    bot.command('stats', async (ctx) => {
        if (ctx.from.id !== CONFIG.ADMIN_ID) return;
        await ctx.reply(
            `${getRandomReaction()} *📊 ʙᴏᴛ sᴛᴀᴛɪsᴛɪᴄs*\n\n` +
                `👥 *ᴛᴏᴛᴀʟ ᴜsᴇʀs:* ${database.stats.totalUsers}\n` +
                `📥 *ᴛᴏᴛᴀʟ ᴅᴏᴡɴʟᴏᴀᴅs:* ${database.stats.totalDownloads}\n` +
                `⏱️ *ᴜᴘᴛɪᴍᴇ:* ${Math.floor(process.uptime() / 60)} ᴍɪɴ`,
            { parse_mode: 'Markdown' }
        );
    });

    registerCallbacks(bot);
}

const INFO_PAGES = {
    about:
        `ℹ️ *ᴀʙᴏᴜᴛ sᴘɪᴅᴇʏ ᴏꜰꜰɪᴄɪᴀʟ*\n\n` +
        `ᴀ ꜰᴀsᴛ, ꜰʀᴇᴇ ɪɴsᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ ᴛʜᴀᴛ ɢʀᴀʙs ʀᴇᴇʟs, ᴠɪᴅᴇᴏs, ᴘʜᴏᴛᴏs ᴀɴᴅ ᴡʜᴏʟᴇ ᴄᴀʀᴏᴜsᴇʟs ɪɴ ʜᴅ.\n\n` +
        `🦊 *ᴠᴇʀsɪᴏɴ:* 3.1 ᴘʀᴏ`,
    help:
        `📖 *ʜᴏᴡ ᴛᴏ ᴜsᴇ*\n\n` +
        `1️⃣ ᴄᴏᴘʏ ᴀɴ ɪɴsᴛᴀɢʀᴀᴍ ᴘᴏsᴛ / ʀᴇᴇʟ ʟɪɴᴋ\n` +
        `2️⃣ sᴇɴᴅ ɪᴛ ᴛᴏ ᴍᴇ\n` +
        `3️⃣ ʀᴇᴄᴇɪᴠᴇ ᴀʟʟ ᴍᴇᴅɪᴀ ɪɴ ʜᴅ\n\n` +
        `ᴄᴀʀᴏᴜsᴇʟ ᴘᴏsᴛs? ʏᴏᴜ ɢᴇᴛ *ᴇᴠᴇʀʏ* sʟɪᴅᴇ.`,
    support:
        `🆘 *sᴜᴘᴘᴏʀᴛ*\n\n` +
        `ɴᴇᴇᴅ ʜᴇʟᴘ ᴏʀ ꜰᴏᴜɴᴅ ᴀ ʙᴜɢ? ᴄᴏɴᴛᴀᴄᴛ ᴛʜᴇ ᴀᴅᴍɪɴ ᴛʜʀᴏᴜɢʜ ᴏᴜʀ ꜰᴏʀᴄᴇ-sᴜʙ ᴄʜᴀɴɴᴇʟs.`,
    premium:
        `💎 *ᴘʀᴇᴍɪᴜᴍ*\n\n` +
        `ᴀʟʟ ꜰᴇᴀᴛᴜʀᴇs ᴀʀᴇ ᴄᴜʀʀᴇɴᴛʟʏ ꜰʀᴇᴇ! sᴛᴀʏ ᴛᴜɴᴇᴅ ꜰᴏʀ ᴘʀᴇᴍɪᴜᴍ ᴘᴇʀᴋs.`,
    get_started:
        `🚀 *ɢᴇᴛ sᴛᴀʀᴛᴇᴅ*\n\n` +
        `ᴊᴜsᴛ sᴇɴᴅ ᴍᴇ ᴀɴʏ ɪɴsᴛᴀɢʀᴀᴍ ʟɪɴᴋ ʀɪɢʜᴛ ɴᴏᴡ ᴀɴᴅ ɪ'ʟʟ ᴅᴏ ᴛʜᴇ ʀᴇsᴛ!`
};

function registerCallbacks(bot) {
    // Info pages
    for (const key of Object.keys(INFO_PAGES)) {
        bot.action(key, async (ctx) => {
            await ctx.answerCbQuery();
            try {
                await ctx.editMessageCaption(INFO_PAGES[key], {
                    parse_mode: 'Markdown',
                    reply_markup: createBackKeyboard().reply_markup
                });
            } catch (_) {
                await ctx.reply(INFO_PAGES[key], {
                    parse_mode: 'Markdown',
                    reply_markup: createBackKeyboard().reply_markup
                });
            }
        });
    }

    bot.action('back_to_menu', async (ctx) => {
        await ctx.answerCbQuery();
        const firstName = ctx.from.first_name || 'User';
        try {
            await ctx.editMessageCaption(startText(firstName), {
                parse_mode: 'Markdown',
                reply_markup: createMainMenuKeyboard().reply_markup
            });
        } catch (_) {
            await ctx.reply(startText(firstName), {
                parse_mode: 'Markdown',
                reply_markup: createMainMenuKeyboard().reply_markup
            });
        }
    });

    // Force-sub re-check
    bot.action('check_force_sub', async (ctx) => {
        const notJoined = await checkForceSub(bot, ctx.from.id);
        if (notJoined.length > 0) {
            return ctx.answerCbQuery('❌ Please join all channels first!', {
                show_alert: true
            });
        }
        await ctx.answerCbQuery('✅ Verified! You can use the bot now.', {
            show_alert: true
        });
        try {
            await ctx.deleteMessage();
        } catch (_) {
            /* ignore */
        }
    });

    // Resend an entire carousel from a stored session.
    bot.action(/^sendall_(.+)$/, async (ctx) => {
        await ctx.answerCbQuery('📥 Resending all media...');
        const session = getSession(ctx.match[1]);
        if (!session) {
            return ctx.reply('⚠️ This session expired. Please resend the link.');
        }
        await deliverAllMedia(ctx, session);
    });

    // Navigation between slides (buttons now actually work).
    bot.action(/^nav_(.+)_(\d+)$/, async (ctx) => {
        await ctx.answerCbQuery();
        const session = getSession(ctx.match[1]);
        if (!session) {
            return ctx.reply('⚠️ This session expired. Please resend the link.');
        }
        // Re-deliver the whole set (simplest reliable UX across mixed media).
        await ctx.reply(
            `${getRandomReaction()} 🔁 *ʀᴇsᴇɴᴅɪɴɢ ᴀʟʟ ${session.media.length} sʟɪᴅᴇs...*`,
            { parse_mode: 'Markdown' }
        );
        await deliverAllMedia(ctx, session);
    });

    bot.action('noop', (ctx) => ctx.answerCbQuery());
}

module.exports = { registerCommands, startText };
