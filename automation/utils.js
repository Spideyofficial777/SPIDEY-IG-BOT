// automation/utils.js - Shared helpers (reactions, formatting, safe Markdown)

const REACTIONS = [
    '👀', '😱', '🔥', '😍', '🎉', '🥰', '😇', '⚡',
    '💥', '✨', '🌟', '🎊', '🤩', '💫', '🦊'
];

function getRandomReaction() {
    return REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
}

function getRandomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
}

/**
 * Escape text for Telegram's legacy Markdown (parse_mode: 'Markdown').
 *
 * BUG 1 ROOT CAUSE: usernames and captions frequently contain characters
 * like _ * ` [ that Telegram's Markdown parser treats as formatting. When
 * they are unbalanced (e.g. a username "john_doe" or a caption with a stray
 * "*"), Telegram rejects the whole sendMessage call with:
 *   "Bad Request: can't parse entities"
 * ...which previously bubbled up and crashed the handler. Escaping the four
 * reserved characters makes any user-supplied text safe to embed.
 */
function escapeMarkdown(text) {
    if (text === null || text === undefined) return '';
    return String(text).replace(/([_*`\[])/g, '\\$1');
}

/**
 * Escape text so it can be safely embedded inside an HTML-parsed message.
 * We use HTML mode for anything that mixes our own bold markup with
 * user-supplied content, because it is far more forgiving than Markdown.
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function truncate(text, max) {
    if (!text) return '';
    const str = String(text);
    return str.length > max ? str.slice(0, max) + '…' : str;
}

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Best-effort message delete that never throws (message may already be gone).
 */
async function safeDeleteMessage(ctx, messageId) {
    if (!messageId) return;
    try {
        await ctx.telegram.deleteMessage(ctx.chat.id, messageId);
    } catch (_) {
        /* already deleted or not allowed — ignore */
    }
}

module.exports = {
    REACTIONS,
    getRandomReaction,
    getRandomItem,
    escapeMarkdown,
    escapeHtml,
    truncate,
    sleep,
    safeDeleteMessage
};
