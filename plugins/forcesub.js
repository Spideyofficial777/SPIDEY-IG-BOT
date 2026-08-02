// plugins/forcesub.js - Force-subscription gate

const CONFIG = require('../config');
const { getRandomReaction } = require('../automation/utils');
const { createForceSubKeyboard } = require('./keyboards');

/**
 * Return the list of configured channels the user has NOT joined yet.
 *
 * Fixes vs. original:
 *  - Treats 'restricted' as joined (still a member) and, when we created a
 *    join-request invite, a user with a *pending* request should not be nagged
 *    forever — Telegram reports them as 'left' until approved, so we surface a
 *    join-request link rather than a member-limit link that used to error.
 *  - If the bot is not an admin/member of a gate channel we SKIP it instead of
 *    hard-failing, so a misconfigured channel can't lock everyone out.
 */
async function checkForceSub(bot, userId) {
    const notJoined = [];

    for (const channelId of CONFIG.MULTI_FSUB) {
        let member;
        try {
            member = await bot.telegram.getChatMember(channelId, userId);
        } catch (error) {
            const desc = (error.description || error.message || '').toLowerCase();
            if (
                desc.includes('user not found') ||
                desc.includes('member list is inaccessible')
            ) {
                // Can't verify membership; treat as not joined so we still gate.
            } else {
                console.error(`🔍 Channel check error ${channelId}:`, error.message);
                // Bot likely isn't in the channel — skip so we don't lock users out.
                continue;
            }
        }

        const status = member?.status;
        const isMember =
            status === 'member' ||
            status === 'administrator' ||
            status === 'creator' ||
            status === 'restricted';

        if (isMember) continue;

        // Build a join link for this channel.
        try {
            const chat = await bot.telegram.getChat(channelId);
            let inviteLink;

            if (chat.username) {
                inviteLink = `https://t.me/${chat.username}`;
            } else {
                try {
                    const invite = await bot.telegram.createChatInviteLink(channelId, {
                        creates_join_request: true
                    });
                    inviteLink = invite.invite_link;
                } catch (inviteError) {
                    inviteLink = `https://t.me/c/${Math.abs(channelId)
                        .toString()
                        .slice(3)}`;
                }
            }

            notJoined.push({
                title: chat.title || 'Channel',
                inviteLink,
                channelId
            });
        } catch (error) {
            console.error(`🔗 Channel info error for ${channelId}:`, error.message);
            // Can't fetch channel info — skip rather than block the user forever.
            continue;
        }
    }

    return notJoined;
}

const FORCE_SUB_TEXT =
    `🔒 *ᴀᴄᴄᴇss ʀᴇsᴛʀɪᴄᴛᴇᴅ!*\n\n` +
    `ᴛᴏ ᴜsᴇ ᴛʜɪs ʙᴏᴛ, ᴘʟᴇᴀsᴇ ᴊᴏɪɴ ᴏᴜʀ ᴄʜᴀɴɴᴇʟs ꜰɪʀsᴛ!\n\n` +
    `✨ *ʙᴇɴᴇꜰɪᴛs:*\n` +
    `• ʟᴀᴛᴇsᴛ ᴜᴘᴅᴀᴛᴇs\n` +
    `• ᴇxᴄʟᴜsɪᴠᴇ ᴄᴏɴᴛᴇɴᴛ\n` +
    `• ᴄᴏᴍᴍᴜɴɪᴛʏ sᴜᴘᴘᴏʀᴛ\n\n` +
    `ᴊᴏɪɴ ᴀʟʟ ᴄʜᴀɴɴᴇʟs ʙᴇʟᴏᴡ ᴀɴᴅ ᴄʟɪᴄᴋ ᴛʀʏ ᴀɢᴀɪɴ!`;

async function sendForceSubMessage(ctx, notJoinedChannels) {
    const caption = `${getRandomReaction()} ${FORCE_SUB_TEXT}`;
    const keyboard = createForceSubKeyboard(notJoinedChannels).reply_markup;

    try {
        await ctx.replyWithPhoto(CONFIG.FORCESUB_IMG, {
            caption,
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
    } catch (error) {
        await ctx.reply(caption, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
}

module.exports = { checkForceSub, sendForceSubMessage, FORCE_SUB_TEXT };
