const { Telegraf, Markup } = require('telegraf');
const { igdl } = require("ruhend-scraper");
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// 🔥 POWERFUL CONFIGURATION
const CONFIG = {
    BOT_TOKEN: process.env.BOT_TOKEN || '7620991709:AAH2qNNm4UVOTxQvheJNiHMNV7KN1f4L0Lo',
    ADMIN_ID: parseInt(process.env.ADMIN_ID) || 5518489725,
    ADMIN_CHANNEL: parseInt(process.env.ADMIN_CHANNEL) || -1002423451263,
    DB_FILE: path.join(__dirname, 'database.json'),
    PORT: process.env.PORT || 5001,
    MULTI_FSUB: process.env.MULTI_FSUB ? process.env.MULTI_FSUB.split(' ').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : [-1001959922658, -1002433552221, -1002470391435],
    START_IMG: process.env.START_IMG ? process.env.START_IMG.split(' ') : [
        'https://graph.org/file/2518d4eb8c88f8f669f4c.jpg',
        'https://graph.org/file/d6d9d9b8d2dc779c49572.jpg',
        'https://graph.org/file/4b04eaad1e75e13e6dc08.jpg',
        'https://graph.org/file/05066f124a4ac500f8d91.jpg',
        'https://graph.org/file/2c64ed483c8fcf2bab7dd.jpg'
    ],
    FORCESUB_IMG: process.env.FORCESUB_IMG || 'https://i.ibb.co/ZNC1Hnb/ad3f2c88a8f2.jpg',
    PROCESSING_STICKER: 'CAACAgQAAxkDAAEBD89o-ek8xCsshJcVVDNGNlw_9wbAiAACGRAAAudLcFGAbsHU3KNJUzYE'
};

// 🎭 POWERFUL REACTIONS
const REACTIONS = ["👀", "😱", "🔥", "😍", "🎉", "🥰", "😇", "⚡", "💥", "✨", "🌟", "🎊", "🤩", "💫", "🦊"];

// 🚀 INITIALIZE BOT
const bot = new Telegraf(CONFIG.BOT_TOKEN);

// 💾 POWERFUL DATABASE SYSTEM
let database = {
    users: new Set(),
    downloads: [],
    stats: {
        totalUsers: 0,
        totalDownloads: 0,
        lastUpdate: Date.now()
    }
};

// ⚡ UTILITY FUNCTIONS
function getRandomReaction() {
    return REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
}

function getRandomStartImage() {
    return CONFIG.START_IMG[Math.floor(Math.random() * CONFIG.START_IMG.length)];
}

// 💾 DATABASE MANAGEMENT
async function loadDatabase() {
    try {
        const data = await fs.readFile(CONFIG.DB_FILE, 'utf8');
        const parsed = JSON.parse(data);
        database.users = new Set(parsed.users || []);
        database.downloads = parsed.downloads || [];
        database.stats = parsed.stats || database.stats;
    } catch (error) {
        console.log('🆕 Creating new database...');
    }
}

async function saveDatabase() {
    try {
        const data = {
            users: Array.from(database.users),
            downloads: database.downloads.slice(-1000),
            stats: database.stats
        };
        await fs.writeFile(CONFIG.DB_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('💥 Database save error:', error);
    }
}

// 👤 USER MANAGEMENT
async function addUser(userId, username) {
    if (!database.users.has(userId)) {
        database.users.add(userId);
        database.stats.totalUsers = database.users.size;
        await saveDatabase();
        
        try {
            await bot.telegram.sendMessage(
                CONFIG.ADMIN_CHANNEL,
                `${getRandomReaction()} *🆕 ɴᴇᴡ ᴜsᴇʀ ʀᴇɢɪsᴛᴇʀᴇᴅ!*\n\n` +
                `👤 *ᴜsᴇʀ ɪᴅ:* \`${userId}\`\n` +
                `📝 *ᴜsᴇʀɴᴀᴍᴇ:* ${username ? '@' + username : 'ɴ/ᴀ'}\n` +
                `📅 *ᴅᴀᴛᴇ:* ${new Date().toLocaleString()}\n` +
                `📊 *ᴛᴏᴛᴀʟ ᴜsᴇʀs:* ${database.stats.totalUsers}`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('💥 Admin notification error:', error);
        }
    }
}

async function logDownload(userId, username, url, caption) {
    const log = {
        userId,
        username,
        url,
        caption: caption || 'ɴ/ᴀ',
        timestamp: Date.now(),
        date: new Date().toLocaleString()
    };
    
    database.downloads.push(log);
    database.stats.totalDownloads++;
    await saveDatabase();
    
    try {
        await bot.telegram.sendMessage(
            CONFIG.ADMIN_CHANNEL,
            `${getRandomReaction()} *📥 ɴᴇᴡ ᴅᴏᴡɴʟᴏᴀᴅ!*\n\n` +
            `👤 *ᴜsᴇʀ:* ${username ? '@' + username : 'ɪᴅ: ' + userId}\n` +
            `🔗 *ʟɪɴᴋ:* ${url}\n` +
            `📝 *ᴄᴀᴘᴛɪᴏɴ:* ${caption ? caption.substring(0, 100) + '...' : 'ɴᴏɴᴇ'}\n` +
            `📅 *ᴛɪᴍᴇ:* ${log.date}\n` +
            `📊 *ᴛᴏᴛᴀʟ ᴅᴏᴡɴʟᴏᴀᴅs:* ${database.stats.totalDownloads}`,
            { parse_mode: 'Markdown' }
        );
    } catch (error) {
        console.error('💥 Download log error:', error);
    }
}

// 🔒 POWERFUL FORCE SUBSCRIPTION SYSTEM
async function checkForceSub(userId) {
    const notJoined = [];
    
    for (const channelId of CONFIG.MULTI_FSUB) {
        try {
            const chatMember = await bot.telegram.getChatMember(channelId, userId);
            if (chatMember.status === 'left' || chatMember.status === 'kicked') {
                try {
                    const chat = await bot.telegram.getChat(channelId);
                    const inviteLink = await bot.telegram.createChatInviteLink(channelId, {
                        creates_join_request: true,
                        member_limit: 1
                    });
                    notJoined.push({
                        title: chat.title,
                        inviteLink: inviteLink.invite_link,
                        channelId: channelId
                    });
                } catch (inviteError) {
                    const chat = await bot.telegram.getChat(channelId);
                    notJoined.push({
                        title: chat.title,
                        inviteLink: `https://t.me/${chat.username || 'c/' + Math.abs(channelId).toString().slice(4)}`,
                        channelId: channelId
                    });
                }
            }
        } catch (error) {
            console.error(`🔍 Channel check error ${channelId}:`, error.message);
            continue;
        }
    }
    
    return notJoined;
}

function createForceSubKeyboard(notJoinedChannels) {
    const buttons = notJoinedChannels.map(channel => [
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
        [
            Markup.button.callback('🚀 ɢᴇᴛ ꜱᴛᴀʀᴛᴇᴅ', 'get_started')
        ]
    ]);
}

function createSuccessKeyboard() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🎯 ɢᴇᴛ ꜱᴛᴀʀᴛᴇᴅ', 'get_started')]
    ]);
}

// 🎯 INSTAGRAM DOWNLOADER CORE
function extractUniqueMedia(mediaData) {
    const uniqueMedia = [];
    const seenUrls = new Set();
    
    for (const media of mediaData) {
        if (!media?.url) continue;
        
        const cleanUrl = media.url.split('?')[0].split('#')[0];
        
        if (!seenUrls.has(cleanUrl)) {
            seenUrls.add(cleanUrl);
            uniqueMedia.push({
                url: media.url,
                thumbnail: media.thumbnail || null,
                cleanUrl: cleanUrl
            });
        }
    }
    
    return uniqueMedia;
}

function isValidInstagramUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    const patterns = [
        /https?:\/\/(www\.)?instagram\.com\/(p|reel|tv|stories)\/[A-Za-z0-9_-]+\/?/i,
        /https?:\/\/(www\.)?instagr\.am\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?/i
    ];
    
    return patterns.some(pattern => pattern.test(url.trim()));
}

function extractCleanInstagramUrl(inputText) {
    const urlMatch = inputText.match(/(https?:\/\/[^\s]+)/);
    if (!urlMatch) return null;
    
    let url = urlMatch[0];
    const cleanMatch = url.match(/(https?:\/\/(www\.)?instagram\.com\/(p|reel|tv|stories)\/[A-Za-z0-9_-]+)/i);
    
    return cleanMatch ? cleanMatch[0] : (isValidInstagramUrl(url) ? url.split('?')[0].split('&')[0] : null);
}

function getMediaType(mediaUrl, originalUrl) {
    if (!mediaUrl) return 'image';
    
    const url = mediaUrl.toLowerCase();
    
    if (/\.(mp4|mov|avi|mkv|webm|3gp)$/i.test(url) || 
        url.includes('/video/') || 
        url.includes('_video_') || 
        url.includes('.mp4') ||
        originalUrl.includes('/reel/') || 
        originalUrl.includes('/tv/')) {
        return 'video';
    }
    
    return 'image';
}

async function downloadFile(url, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            return Buffer.from(response.data);
        } catch (error) {
            if (attempt === retries) throw new Error('Failed to download media file');
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

async function isUrlAccessible(url) {
    try {
        const response = await axios.head(url, { 
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

function beautifyCaption(rawCaption, url) {
    if (!rawCaption) return null;
    
    let caption = rawCaption.trim();
    caption = caption.replace(/\n{3,}/g, '\n\n');
    
    return caption.length > 800 ? caption.substring(0, 800) + '...' : caption;
}

function createMediaKeyboard(url, currentIndex, totalMedia, sessionId) {
    const buttons = [
        [
            Markup.button.url('🔗 ᴏᴘᴇɴ ᴏɴ ɪɴsᴛᴀɢʀᴀᴍ', url),
            Markup.button.callback('📥 ᴅᴏᴡɴʟᴏᴀᴅ ᴀʟʟ', `download_all_${sessionId}`)
        ]
    ];
    
    if (totalMedia > 1) {
        const navButtons = [];
        if (currentIndex > 0) {
            navButtons.push(Markup.button.callback('⏮️ ᴘʀᴇᴠɪᴏᴜs', `prev_${sessionId}_${currentIndex}`));
        }
        navButtons.push(Markup.button.callback(`${currentIndex + 1}/${totalMedia}`, 'noop'));
        if (currentIndex < totalMedia - 1) {
            navButtons.push(Markup.button.callback('⏭️ ɴᴇxᴛ', `next_${sessionId}_${currentIndex}`));
        }
        buttons.push(navButtons);
    }
    
    return Markup.inlineKeyboard(buttons);
}

async function sendMediaGroup(ctx, mediaItems, caption, type = 'photo') {
    try {
        const mediaGroup = mediaItems.map((item, index) => ({
            type: type,
            media: { source: item },
            caption: index === 0 ? caption : undefined,
            parse_mode: index === 0 ? 'Markdown' : undefined
        }));

        await ctx.replyWithMediaGroup(mediaGroup);
        return true;
    } catch (error) {
        console.error('💥 Media group error:', error.message);
        return false;
    }
}

// 🎪 FORCE SUB MESSAGE HANDLER
async function sendForceSubMessage(ctx, notJoinedChannels) {
    const caption = `${getRandomReaction()} *🔒 ᴀᴄᴄᴇss ʀᴇsᴛʀɪᴄᴛᴇᴅ!*\n\n` +
                   `ᴛᴏ ᴜsᴇ ᴛʜɪs ʙᴏᴛ, ᴘʟᴇᴀsᴇ ᴊᴏɪɴ ᴏᴜʀ ᴄʜᴀɴɴᴇʟs ꜰɪʀsᴛ!\n\n` +
                   `✨ *ʙᴇɴᴇꜰɪᴛs:*\n` +
                   `• ʟᴀᴛᴇsᴛ ᴜᴘᴅᴀᴛᴇs\n` +
                   `• ᴇxᴄʟᴜsɪᴠᴇ ᴄᴏɴᴛᴇɴᴛ\n` +
                   `• ᴄᴏᴍᴍᴜɴɪᴛʏ sᴜᴘᴘᴏʀᴛ\n\n` +
                   `ᴊᴏɪɴ ᴀʟʟ ᴄʜᴀɴɴᴇʟs ʙᴇʟᴏᴡ ᴀɴᴅ ᴄʟɪᴄᴋ ᴛʀʏ ᴀɢᴀɪɴ!`;
    
    try {
        await ctx.replyWithPhoto(CONFIG.FORCESUB_IMG, {
            caption: caption,
            parse_mode: 'Markdown',
            reply_markup: createForceSubKeyboard(notJoinedChannels).reply_markup
        });
    } catch (error) {
        await ctx.reply(caption, {
            parse_mode: 'Markdown',
            reply_markup: createForceSubKeyboard(notJoinedChannels).reply_markup
        });
    }
}

// 🚀 POWERFUL INSTAGRAM HANDLER
async function handleInstagramCommand(ctx) {
    try {
        const message = ctx.message;
        const userId = ctx.from.id;
        const username = ctx.from.username;
        
        // 🔒 Force subscription check
        const notJoined = await checkForceSub(userId);
        if (notJoined.length > 0) {
            return await sendForceSubMessage(ctx, notJoined);
        }
        
        await addUser(userId, username);
        
        const text = message.text || message.caption || '';
        
        if (!text) {
            const user = ctx.from.first_name || 'User';
            const caption = `${getRandomReaction()} 🦊 *ʜᴇʟʟᴏ ${user}!*\n\n` +
                "ɪ ᴅᴏᴡɴʟᴏᴀᴅ ɪɴsᴛᴀɢʀᴀᴍ ᴠɪᴅᴇᴏs ᴀɴᴅ ɪᴍᴀɢᴇs ɪɴ ʜᴅ ǫᴜᴀʟɪᴛʏ!\n" +
                "sᴇɴᴅ ᴍᴇ ᴀɴ ɪɢ ʟɪɴᴋ ᴛᴏ ɢᴇᴛ sᴛᴀʀᴛᴇᴅ!\n\n" +
                '🌿 *ᴍᴀɪɴᴛᴀɪɴᴇᴅ ʙʏ:* [ʜᴀᴄᴋᴇʀ_x_ᴏꜰꜰɪᴄɪᴀʟ_𝟽𝟽𝟽](https://t.me/hacker_x_official_777)';

            return await ctx.reply(caption, {
                parse_mode: 'Markdown',
                reply_markup: createMainMenuKeyboard().reply_markup,
                disable_web_page_preview: true
            });
        }

        const instagramUrl = extractCleanInstagramUrl(text);
        
        if (!instagramUrl || !isValidInstagramUrl(instagramUrl)) {
            return await ctx.reply(
                `${getRandomReaction()} *❌ ɪɴᴠᴀʟɪᴅ ɪɴsᴛᴀɢʀᴀᴍ ʟɪɴᴋ!*\n\n` +
                "ᴘʟᴇᴀsᴇ ᴘʀᴏᴠɪᴅᴇ ᴀ ᴠᴀʟɪᴅ ɪɴsᴛᴀɢʀᴀᴍ ᴜʀʟ.\n\n" +
                "*ᴇxᴀᴍᴘʟᴇs:*\n" +
                "• `https://instagram.com/reel/ABC123`\n" +
                "• `https://instagram.com/p/XYZ789`\n" +
                "• `https://instagram.com/stories/username/123`", 
                { parse_mode: 'Markdown' }
            );
        }

        // 🎬 Processing animation
        const processingMsg = await ctx.replyWithSticker(CONFIG.PROCESSING_STICKER);

        try {
            const downloadData = await igdl(instagramUrl);
            
            if (!downloadData?.data || downloadData.data.length === 0) {
                await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
                return await ctx.reply(
                    `${getRandomReaction()} *❌ ɴᴏ ᴍᴇᴅɪᴀ ꜰᴏᴜɴᴅ!*\n\n` +
                    "ᴛʜᴇ ᴘᴏsᴛ ᴍɪɢʜᴛ ʙᴇ ᴘʀɪᴠᴀᴛᴇ, ᴅᴇʟᴇᴛᴇᴅ, ᴏʀ ᴜɴᴀᴠᴀɪʟᴀʙʟᴇ.", 
                    { parse_mode: 'Markdown' }
                );
            }

            await logDownload(userId, username, instagramUrl, downloadData.caption || null);

            const uniqueMedia = extractUniqueMedia(downloadData.data);
            const mediaToDownload = uniqueMedia.slice(0, 10);
            
            if (mediaToDownload.length === 0) {
                await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
                return await ctx.reply(
                    `${getRandomReaction()} *❌ ɴᴏ ᴅᴏᴡɴʟᴏᴀᴅᴀʙʟᴇ ᴍᴇᴅɪᴀ!*\n\n` +
                    "ᴄᴏᴜʟᴅ ɴᴏᴛ ꜰɪɴᴅ ᴠᴀʟɪᴅ ᴍᴇᴅɪᴀ ɪɴ ᴛʜɪs ᴘᴏsᴛ.", 
                    { parse_mode: 'Markdown' }
                );
            }

            await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);

            // 🎯 Session management
            const sessionId = `${userId}_${Date.now()}`;
            userSessions.set(sessionId, {
                media: mediaToDownload,
                url: instagramUrl,
                caption: downloadData.caption || null,
                userId: userId
            });

            setTimeout(() => userSessions.delete(sessionId), 30 * 60 * 1000);

            if (mediaToDownload.length > 1) {
                await ctx.reply(
                    `${getRandomReaction()} *🦊 sᴘɪᴅᴇʏ ᴏꜰꜰɪᴄɪᴀʟ*\n\n` +
                    `📦 *ꜰᴏᴜɴᴅ ${mediaToDownload.length} ᴍᴇᴅɪᴀ ɪᴛᴇᴍs!*\n` +
                    `⚡ *ᴘʀᴏᴄᴇssɪɴɢ ɪɴ ʜᴅ ǫᴜᴀʟɪᴛʏ...*`,
                    { parse_mode: 'Markdown' }
                );
            }

            // 🖼️ Process images and videos
            const images = [];
            const videos = [];

            for (const media of mediaToDownload) {
                const mediaType = getMediaType(media.url, instagramUrl);
                if (mediaType === 'video') videos.push(media);
                else images.push(media);
            }

            let successCount = 0;

            // 📸 Handle images
            if (images.length > 0) {
                const imageBuffers = [];
                
                for (let i = 0; i < images.length; i++) {
                    try {
                        if (await isUrlAccessible(images[i].url)) {
                            const buffer = await downloadFile(images[i].url);
                            imageBuffers.push(buffer);
                        }
                    } catch (error) {
                        console.error(`🖼️ Image ${i + 1} error:`, error.message);
                    }
                }

                if (imageBuffers.length > 0) {
                    const beautifiedCaption = beautifyCaption(downloadData.caption, instagramUrl);
                    const caption = 
    `${getRandomReaction()} 🦊 *sᴘɪᴅᴇʏ ᴏꜰꜰɪᴄɪᴀʟ - ᴘʀᴏ ᴠ3.0*\n\n` +
    `📸 *${imageBuffers.length} ʜᴅ ɪᴍᴀɢᴇ${imageBuffers.length > 1 ? 's' : ''}*` +
    (beautifiedCaption ? `\n\n📝 *ᴄᴀᴘᴛɪᴏɴ:*\n${beautifiedCaption}\n` : '\n') +
    `\n✨ *ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ ɪɴ ʜɪɢʜ ǫᴜᴀʟɪᴛʏ*\n` +
    `💎 *sᴘɪᴅᴇʏ ᴏꜰꜰɪᴄɪᴀʟ - ꜰᴀsᴛ • sᴇᴄᴜʀᴇ • sᴛʏʟɪsʜ*`;

                    if (imageBuffers.length > 1 && imageBuffers.length <= 10) {
                        const sent = await sendMediaGroup(ctx, imageBuffers, caption, 'photo');
                        if (sent) {
                            successCount += imageBuffers.length;
                            await ctx.reply(
                                `${getRandomReaction()} *🧩 ɪɴᴛᴇʀᴀᴄᴛɪᴠᴇ ᴄᴏɴᴛʀᴏʟs:*`,
                                {
                                    parse_mode: 'Markdown',
                                    reply_markup: createMediaKeyboard(instagramUrl, 0, imageBuffers.length, sessionId).reply_markup
                                }
                            );
                        }
                    } else {
                        await ctx.replyWithPhoto(
                            { source: imageBuffers[0] },
                            { 
                                caption: caption, 
                                parse_mode: 'Markdown',
                                reply_markup: createMediaKeyboard(instagramUrl, 0, 1, sessionId).reply_markup
                            }
                        );
                        successCount++;
                    }
                }
            }

            // 🎥 Handle videos
            for (let i = 0; i < videos.length; i++) {
                try {
                    if (await isUrlAccessible(videos[i].url)) {
                        const buffer = await downloadFile(videos[i].url);
                        const beautifiedCaption = beautifyCaption(downloadData.caption, instagramUrl);
                        const caption = 
    `${getRandomReaction()} 🦊 *sᴘɪᴅᴇʏ ᴏꜰꜰɪᴄɪᴀʟ - ᴘʀᴏ ᴠ3.0*\n\n` +
    `🎥 *ʜᴅ ᴠɪᴅᴇᴏ ${i + 1}/${videos.length}*` +
    (beautifiedCaption ? `\n\n📝 *ᴄᴀᴘᴛɪᴏɴ:*\n${beautifiedCaption}\n` : '\n') +
    `\n✨ *ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ ɪɴ ʜɪɢʜ ǫᴜᴀʟɪᴛʏ*\n` +
    `💎 *sᴘɪᴅᴇʏ ᴏꜰꜰɪᴄɪᴀʟ - ꜰᴀsᴛ • sᴇᴄᴜʀᴇ • sᴛʏʟɪsʜ*`;

                        await ctx.replyWithVideo(
                            { source: buffer },
                            { 
                                caption: caption, 
                                parse_mode: 'Markdown',
                                reply_markup: createMediaKeyboard(instagramUrl, i, videos.length, sessionId).reply_markup
                            }
                        );
                        
                        successCount++;
                        
                        // ⏳ Rate limiting
                        if (i < videos.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                } catch (error) {
                    console.error(`🎥 Video ${i + 1} error:`, error.message);
                }
            }

            if (successCount === 0) {
                await ctx.reply(
                    `${getRandomReaction()} *❌ ᴅᴏᴡɴʟᴏᴀᴅ ꜰᴀɪʟᴇᴅ!*\n\n` +
                    "ᴄᴏᴜʟᴅ ɴᴏᴛ ᴅᴏᴡɴʟᴏᴀᴅ ᴍᴇᴅɪᴀ. ᴘʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.", 
                    { parse_mode: 'Markdown' }
                );
            } else {
                await ctx.reply(
                    `${getRandomReaction()} *✅ ᴅᴏᴡɴʟᴏᴀᴅ ᴄᴏᴍᴘʟᴇᴛᴇ!*\n\n` +
                    `*${successCount} ᴍᴇᴅɪᴀ ɪᴛᴇᴍs* sᴜᴄᴄᴇssꜰᴜʟʟʏ ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ!\n\n` +
                    `🦊 *ᴛʜᴀɴᴋs ꜰᴏʀ ᴜsɪɴɢ sᴘɪᴅᴇʏ ᴏꜰꜰɪᴄɪᴀʟ!*`,
                    { parse_mode: 'Markdown' }
                );
            }

        } catch (scraperError) {
            console.error('💥 Scraper error:', scraperError);
            await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
            await ctx.reply(
                `${getRandomReaction()} *❌ ᴅᴏᴡɴʟᴏᴀᴅ ᴇʀʀᴏʀ!*\n\n` +
                "ꜰᴀɪʟᴇᴅ ᴛᴏ ꜰᴇᴛᴄʜ ᴍᴇᴅɪᴀ. ᴘʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ɪɴ ᴀ ꜰᴇᴡ ᴍɪɴᴜᴛᴇs.", 
                { parse_mode: 'Markdown' }
            );
        }

    } catch (error) {
        console.error('💥 Handler error:', error);
        await ctx.reply(
            `${getRandomReaction()} *❌ ᴜɴᴇxᴘᴇᴄᴛᴇᴅ ᴇʀʀᴏʀ!*\n\n` +
            "sᴏᴍᴇᴛʜɪɴɢ ᴡᴇɴᴛ ᴡʀᴏɴɢ. ᴘʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ.\n\n" +
            "🦊 *sᴘɪᴅᴇʏ ᴏꜰꜰɪᴄɪᴀʟ*", 
            { parse_mode: 'Markdown' }
        );
    }
}

// 👑 ADMIN COMMANDS
bot.command('stats', async (ctx) => {
    if (ctx.from.id !== CONFIG.ADMIN_ID) return;
    
    await ctx.reply(
    `${getRandomReaction()} 🦊 *sᴘɪᴅᴇʏ ᴏꜰꜰɪᴄɪᴀʟ - sᴛᴀᴛɪsᴛɪᴄs*\n\n` +
    `👥 *ᴛᴏᴛᴀʟ ᴜsᴇʀs:* ${database.stats.totalUsers}\n` +
    `📥 *ᴛᴏᴛᴀʟ ᴅᴏᴡɴʟᴏᴀᴅs:* ${database.stats.totalDownloads}\n` +
    `🔄 *ᴀᴄᴛɪᴠᴇ sᴇssɪᴏɴs:* ${userSessions.size}\n` +
    `📅 *ʟᴀsᴛ ᴜᴘᴅᴀᴛᴇ:* ${new Date(database.stats.lastUpdate).toLocaleString()}\n\n` +
    `🦊 *sᴘɪᴅᴇʏ ᴏꜰꜰɪᴄɪᴀʟ - ᴀᴅᴍɪɴ ᴘᴀɴᴇʟ*`,
    { parse_mode: 'Markdown' }
);
});

// 🎯 BOT COMMANDS
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    
    // 🔒 Force subscription check
    const notJoined = await checkForceSub(userId);
    if (notJoined.length > 0) {
        return await sendForceSubMessage(ctx, notJoined);
    }
    
    await addUser(ctx.from.id, ctx.from.username);
    
    const user = ctx.from.first_name || 'User';
    await ctx.replyWithPhoto(
        getRandomStartImage(),
        {
            caption: `${getRandomReaction()} 🦊 *ᴡᴇʟᴄᴏᴍᴇ ${user}!*\n\n` +
                    "🎯 *ɪɴsᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ ᴘʀᴏ ᴠ3.0*\n\n" +
                    "✨ *ꜰᴇᴀᴛᴜʀᴇs:*\n" +
                    "• 📸 ᴘʜᴏᴛᴏs & ᴄᴀʀᴏᴜsᴇʟs\n" +
                    "• 🎥 ᴠɪᴅᴇᴏs & ʀᴇᴇʟs\n" +
                    "• 💎 ʜᴅ ǫᴜᴀʟɪᴛʏ\n" +
                    "• 🧩 ɪɴᴛᴇʀᴀᴄᴛɪᴠᴇ ʙᴜᴛᴛᴏɴs\n" +
                    "• 📝 sᴍᴀʀᴛ ᴄᴀᴘᴛɪᴏɴs\n" +
                    "• ⚡ ʟɪɢʜᴛɴɪɴɢ ꜰᴀsᴛ\n\n" +
                    "💥 *sᴍᴀʀᴛᴇʀ • ꜰᴀsᴛᴇʀ • ᴍᴏʀᴇ ᴘᴏᴡᴇʀꜰᴜʟ*",
            parse_mode: 'Markdown',
            reply_markup: createMainMenuKeyboard().reply_markup
        }
    );
});

// 🔄 CALLBACK QUERY HANDLER
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    
    if (data === 'noop') {
        return await ctx.answerCbQuery();
    }
    
    if (data === 'check_force_sub') {
        const userId = ctx.from.id;
        const notJoined = await checkForceSub(userId);
        
        if (notJoined.length > 0) {
            await ctx.editMessageCaption(
                `${getRandomReaction()} *🔒 ᴀᴄᴄᴇss ʀᴇsᴛʀɪᴄᴛᴇᴅ!*\n\n` +
                `ᴛᴏ ᴜsᴇ ᴛʜɪs ʙᴏᴛ, ᴘʟᴇᴀsᴇ ᴊᴏɪɴ ᴏᴜʀ ᴄʜᴀɴɴᴇʟs ꜰɪʀsᴛ!\n\n` +
                `✨ *ʙᴇɴᴇꜰɪᴛs:*\n` +
                `• ʟᴀᴛᴇsᴛ ᴜᴘᴅᴀᴛᴇs\n` +
                `• ᴇxᴄʟᴜsɪᴠᴇ ᴄᴏɴᴛᴇɴᴛ\n` +
                `• ᴄᴏᴍᴍᴜɴɪᴛʏ sᴜᴘᴘᴏʀᴛ\n\n` +
                `ᴊᴏɪɴ ᴀʟʟ ᴄʜᴀɴɴᴇʟs ʙᴇʟᴏᴡ ᴀɴᴅ ᴄʟɪᴄᴋ ᴛʀʏ ᴀɢᴀɪɴ!`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: createForceSubKeyboard(notJoined).reply_markup
                }
            );
            return await ctx.answerCbQuery(
                "ɪ ʟɪᴋᴇ ʏᴏᴜʀ sᴍᴀʀᴛɴᴇss, ʙᴜᴛ ᴅᴏɴ'ᴛ ʙᴇ ᴏᴠᴇʀsᴍᴀʀᴛ 😒\nꜰɪʀsᴛ ᴊᴏɪɴ ᴏᴜʀ ᴄʜᴀɴɴᴇʟs 😒",
                { show_alert: true }
            );
        } else {
            await ctx.reply(
                `${getRandomReaction()} 🦊 *✅ sᴜᴄᴄᴇssꜰᴜʟʟʏ ᴊᴏɪɴᴇᴅ ᴀʟʟ ᴄʜᴀɴɴᴇʟs!*\n\n` +
                `🎉 *ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ sᴘɪᴅᴇʏ ᴏꜰꜰɪᴄɪᴀʟ!*\n\n` +
                `✨ ʏᴏᴜ ɴᴏᴡ ʜᴀᴠᴇ ᴀᴄᴄᴇss ᴛᴏ:\n` +
                `• 📸 ɪɴsᴛᴀɢʀᴀᴍ ᴍᴇᴅɪᴀ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ\n` +
                `• 💎 ʜᴅ ǫᴜᴀʟɪᴛʏ ᴅᴏᴡɴʟᴏᴀᴅs\n` +
                `• ⚡ ꜰᴀsᴛ & sᴇᴄᴜʀᴇ ᴘʀᴏᴄᴇssɪɴɢ\n\n` +
                `🦊 *ᴄʟɪᴄᴋ ᴛʜᴇ ʙᴜᴛᴛᴏɴ ʙᴇʟᴏᴡ ᴛᴏ ɢᴇᴛ sᴛᴀʀᴛᴇᴅ!*`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: createSuccessKeyboard().reply_markup
                }
            );
            return await ctx.answerCbQuery('✅ ᴀᴄᴄᴇss ɢʀᴀɴᴛᴇᴅ! ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ sᴘɪᴅᴇʏ ᴏꜰꜰɪᴄɪᴀʟ!');
        }
    }
    
    // Handle other callback buttons...
    await ctx.answerCbQuery(`${getRandomReaction()} sᴘɪᴅᴇʏ ᴏꜰꜰɪᴄɪᴀʟ ɪs ᴘʀᴏᴄᴇssɪɴɢ...`);
});

// 🎪 MESSAGE HANDLERS
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    
    // 🔒 Force subscription check
    const notJoined = await checkForceSub(ctx.from.id);
    if (notJoined.length > 0) {
        return await sendForceSubMessage(ctx, notJoined);
    }
    
    if (text && (text.includes('instagram.com') || text.includes('instagr.am'))) {
        await handleInstagramCommand(ctx);
    }
});

// 🚀 INITIALIZE BOT
(async () => {
    await loadDatabase();
    
    // 🌐 Web server for deployment
    const express = require('express');
    const app = express();
    
    app.get('/', (req, res) => {
        res.json({ 
            status: '🦊 SPIDEY OFFICIAL is running!',
            version: '3.0 PRO',
            users: database.stats.totalUsers,
            downloads: database.stats.totalDownloads,
            uptime: process.uptime()
        });
    });
    
    app.listen(CONFIG.PORT, () => {
        console.log(`🌐 Web server running on port ${CONFIG.PORT}`);
    });
    
    console.log('🚀 SPIDEY OFFICIAL PRO v3.0 is starting...');
    bot.launch().then(() => {
        console.log('✅ SPIDEY OFFICIAL is now running!');
        console.log('💎 Smarter • Faster • More Powerful');
        console.log(`📊 Loaded ${database.stats.totalUsers} users, ${database.stats.totalDownloads} downloads`);
        console.log(`🔗 Force Sub Channels: ${CONFIG.MULTI_FSUB.length}`);
        console.log(`🖼️ Start Images: ${CONFIG.START_IMG.length}`);
        console.log(`🎭 Reactions: ${REACTIONS.length} emojis`);
    });
})();

// 🛑 GRACEFUL SHUTDOWN
process.once('SIGINT', async () => {
    await saveDatabase();
    bot.stop('SIGINT');
});
process.once('SIGTERM', async () => {
    await saveDatabase();
    bot.stop('SIGTERM');
});

module.exports = bot;