// config.js - Central configuration (all secrets come from environment variables)
require('dotenv').config();

const path = require('path');

function parseIdList(value, fallback) {
    if (!value) return fallback;
    return value
        .split(/[\s,]+/)
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !Number.isNaN(id));
}

const BOT_TOKEN = process.env.BOT_TOKEN || '';

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is not set. Add it in your Render environment variables (or a local .env file).');
    console.error('   The bot cannot start without a token. See .env.example.');
    process.exit(1);
}

module.exports = {
    BOT_TOKEN,
    ADMIN_ID: parseInt(process.env.ADMIN_ID, 10) || 5518489725,
    ADMIN_CHANNEL: parseInt(process.env.ADMIN_CHANNEL, 10) || -1002423451263,
    DB_FILE: process.env.DB_FILE
        ? path.resolve(process.env.DB_FILE)
        : path.join(__dirname, 'database.json'),
    PORT: process.env.PORT || 5000,

    MULTI_FSUB: parseIdList(process.env.MULTI_FSUB, [
        -1001959922658,
        -1002433552221,
        -1002470391435
    ]),

    START_IMG: process.env.START_IMG
        ? process.env.START_IMG.split(/\s+/).filter(Boolean)
        : [
              'https://graph.org/file/2518d4eb8c88f8f669f4c.jpg',
              'https://graph.org/file/d6d9d9b8d2dc779c49572.jpg',
              'https://graph.org/file/4b04eaad1e75e13e6dc08.jpg',
              'https://graph.org/file/05066f124a4ac500f8d91.jpg',
              'https://graph.org/file/2c64ed483c8fcf2bab7dd.jpg'
          ],

    FORCESUB_IMG: process.env.FORCESUB_IMG || 'https://i.ibb.co/ZNC1Hnb/ad3f2c88a8f2.jpg',

    PROCESSING_STICKER:
        process.env.PROCESSING_STICKER ||
        'CAACAgQAAxkDAAEBD89o-ek8xCsshJcVVDNGNlw_9wbAiAACGRAAAudLcFGAbsHU3KNJUzYE',
    WELCOME_STICKER:
        process.env.WELCOME_STICKER ||
        'CAACAgUAAxkBAAIdBGd7qZ7kMBTPT2YAAdnPRDtBSw9jwAACqwQAAr7vuFdHULNVi6H4nB4E',

    // Telegram hard limit for bot uploads via multipart is ~50 MB.
    MAX_UPLOAD_BYTES: 50 * 1024 * 1024,

    // How long an interactive navigation session stays alive.
    SESSION_TTL_MS: 30 * 60 * 1000
};
