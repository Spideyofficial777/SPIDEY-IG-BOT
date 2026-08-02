// index.js - SPIDEY OFFICIAL Instagram Downloader (entry point)
//
// Modular layout:
//   ig/         -> Instagram core (downloader, caption resolver)
//   plugins/    -> Telegram-facing features (handlers, commands, keyboards,
//                  force-sub, media delivery)
//   automation/ -> infrastructure (database, web server, shared utils)

const { Telegraf } = require('telegraf');
const CONFIG = require('./config');

const { loadDatabase, saveDatabase } = require('./automation/database');
const { startServer } = require('./automation/server');
const { registerCommands } = require('./plugins/commands');
const { handleInstagramCommand } = require('./plugins/handlers');
const { checkForceSub, sendForceSubMessage } = require('./plugins/forcesub');

const bot = new Telegraf(CONFIG.BOT_TOKEN, { handlerTimeout: 9_000_000 });

// -------------------------------------------------------------------------
// GLOBAL SAFETY NETS (BUG 2)
// A single unhandled rejection inside a handler used to take the whole
// process down (Render then restarted it, dropping in-flight downloads).
// These catch-alls keep the bot alive and log the real cause.
// -------------------------------------------------------------------------
bot.catch((err, ctx) => {
    console.error(`💥 Unhandled bot error for update ${ctx?.update?.update_id}:`, err);
});

process.on('unhandledRejection', (reason) => {
    console.error('💥 Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught exception:', err);
});

// -------------------------------------------------------------------------
// COMMANDS & CALLBACKS
// -------------------------------------------------------------------------
registerCommands(bot);

// -------------------------------------------------------------------------
// MESSAGE ROUTING
// A single message handler covers both text messages and media captions that
// contain an Instagram link, so we never double-process an update.
// -------------------------------------------------------------------------
bot.on('message', async (ctx) => {
    const content = ctx.message?.text || ctx.message?.caption || '';
    if (!content) return;

    if (content.includes('instagram.com') || content.includes('instagr.am')) {
        await handleInstagramCommand(bot, ctx);
    }
});

// -------------------------------------------------------------------------
// BOOTSTRAP
// -------------------------------------------------------------------------
(async () => {
    await loadDatabase();
    startServer();

    console.log('🚀 SPIDEY OFFICIAL PRO v3.1 is starting...');
    bot
        .launch()
        .then(() => {
            console.log('✅ SPIDEY OFFICIAL is now running!');
            console.log(`🔗 Force-sub channels: ${CONFIG.MULTI_FSUB.length}`);
        })
        .catch((err) => {
            console.error('💥 Failed to launch bot:', err.message);
            process.exit(1);
        });
})();

// -------------------------------------------------------------------------
// GRACEFUL SHUTDOWN
// -------------------------------------------------------------------------
async function shutdown(signal) {
    console.log(`🛑 ${signal} received, shutting down...`);
    await saveDatabase();
    bot.stop(signal);
    process.exit(0);
}
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

module.exports = bot;
