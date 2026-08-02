// automation/database.js - JSON-file persistence + admin notifications

const fs = require('fs').promises;
const CONFIG = require('../config');
const { getRandomReaction, escapeMarkdown, truncate } = require('./utils');

const database = {
    users: new Set(),
    downloads: [],
    stats: {
        totalUsers: 0,
        totalDownloads: 0,
        lastUpdate: Date.now()
    }
};

async function loadDatabase() {
    try {
        const data = await fs.readFile(CONFIG.DB_FILE, 'utf8');
        const parsed = JSON.parse(data);
        database.users = new Set(parsed.users || []);
        database.downloads = parsed.downloads || [];
        database.stats = parsed.stats || database.stats;
        database.stats.totalUsers = database.users.size;
    } catch (error) {
        console.log('🆕 No existing database found, creating a fresh one...');
    }
    return database;
}

async function saveDatabase() {
    try {
        const data = {
            users: Array.from(database.users),
            downloads: database.downloads.slice(-1000),
            stats: { ...database.stats, lastUpdate: Date.now() }
        };
        await fs.writeFile(CONFIG.DB_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('💥 Database save error:', error.message);
    }
}

/**
 * Register a user. `bot` is passed in so this module stays decoupled from
 * the Telegraf instance. Admin notification failures never bubble up.
 */
async function addUser(bot, userId, username, firstName) {
    if (database.users.has(userId)) return;

    database.users.add(userId);
    database.stats.totalUsers = database.users.size;
    await saveDatabase();

    try {
        await bot.telegram.sendMessage(
            CONFIG.ADMIN_CHANNEL,
            `${getRandomReaction()} *🆕 New user registered!*\n\n` +
                `👤 *User ID:* \`${userId}\`\n` +
                `📝 *Username:* ${username ? '@' + escapeMarkdown(username) : 'N/A'}\n` +
                `🙍 *Name:* ${escapeMarkdown(firstName || 'Unknown')}\n` +
                `📅 *Date:* ${escapeMarkdown(new Date().toLocaleString())}\n` +
                `📊 *Total users:* ${database.stats.totalUsers}`,
            { parse_mode: 'Markdown' }
        );
    } catch (error) {
        console.error('💥 Admin (new user) notification failed:', error.message);
    }
}

async function logDownload(bot, userId, username, url, caption, mediaCount) {
    const log = {
        userId,
        username: username || null,
        url,
        caption: caption || 'N/A',
        mediaCount: mediaCount || 0,
        timestamp: Date.now(),
        date: new Date().toLocaleString()
    };

    database.downloads.push(log);
    database.stats.totalDownloads += 1;
    await saveDatabase();

    try {
        await bot.telegram.sendMessage(
            CONFIG.ADMIN_CHANNEL,
            `${getRandomReaction()} *📥 New download!*\n\n` +
                `👤 *User:* ${username ? '@' + escapeMarkdown(username) : 'ID: ' + userId}\n` +
                `🔗 *Link:* ${escapeMarkdown(url)}\n` +
                `🧩 *Items:* ${mediaCount || 0}\n` +
                `📝 *Caption:* ${caption ? escapeMarkdown(truncate(caption, 100)) : 'None'}\n` +
                `📅 *Time:* ${escapeMarkdown(log.date)}\n` +
                `📊 *Total downloads:* ${database.stats.totalDownloads}`,
            { parse_mode: 'Markdown', disable_web_page_preview: true }
        );
    } catch (error) {
        console.error('💥 Admin (download) notification failed:', error.message);
    }
}

module.exports = {
    database,
    loadDatabase,
    saveDatabase,
    addUser,
    logDownload
};
