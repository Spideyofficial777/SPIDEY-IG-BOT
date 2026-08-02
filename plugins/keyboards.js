// plugins/keyboards.js - All inline keyboard builders

const { Markup } = require('telegraf');

function createForceSubKeyboard(notJoinedChannels) {
    const buttons = notJoinedChannels.map((channel) => [
        Markup.button.url(`🎗️ ᴊᴏɪɴ ${channel.title}`, channel.inviteLink)
    ]);
    buttons.push([Markup.button.callback('♻️ ᴛʀʏ ᴀɢᴀɪɴ ♻️', 'check_force_sub')]);
    return Markup.inlineKeyboard(buttons);
}

function createMainMenuKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('ℹ️ ᴀʙᴏᴜᴛ', 'about'),
            Markup.button.callback('📖 ʜᴇʟᴘ', 'help')
        ],
        [
            Markup.button.callback('🆘 ꜱᴜᴘᴘᴏʀᴛ', 'support'),
            Markup.button.callback('💎 ᴘʀᴇᴍɪᴜᴍ', 'premium')
        ],
        [Markup.button.callback('🚀 ɢᴇᴛ ꜱᴛᴀʀᴛᴇᴅ', 'get_started')]
    ]);
}

function createBackKeyboard() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ ʙᴀᴄᴋ', 'back_to_menu')]
    ]);
}

/**
 * Keyboard shown under a delivered media item. Navigation buttons carry the
 * session id + index so the callback handler can resend the right slide.
 */
function createMediaKeyboard(url, currentIndex, totalMedia, sessionId) {
    const buttons = [
        [Markup.button.url('🔗 ᴏᴘᴇɴ ᴏɴ ɪɴsᴛᴀɢʀᴀᴍ', url)]
    ];

    if (totalMedia > 1) {
        const navButtons = [];
        if (currentIndex > 0) {
            navButtons.push(
                Markup.button.callback('⏮️ ᴘʀᴇᴠ', `nav_${sessionId}_${currentIndex - 1}`)
            );
        }
        navButtons.push(
            Markup.button.callback(`${currentIndex + 1}/${totalMedia}`, 'noop')
        );
        if (currentIndex < totalMedia - 1) {
            navButtons.push(
                Markup.button.callback('⏭️ ɴᴇxᴛ', `nav_${sessionId}_${currentIndex + 1}`)
            );
        }
        buttons.push(navButtons);
        buttons.push([
            Markup.button.callback('📥 ʀᴇsᴇɴᴅ ᴀʟʟ', `sendall_${sessionId}`)
        ]);
    }

    return Markup.inlineKeyboard(buttons);
}

module.exports = {
    createForceSubKeyboard,
    createMainMenuKeyboard,
    createBackKeyboard,
    createMediaKeyboard
};
