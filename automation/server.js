// automation/server.js - Keep-alive web server for Render / hosting health checks

const express = require('express');
const CONFIG = require('../config');
const { database } = require('./database');

function startServer() {
    const app = express();

    app.get('/', (req, res) => {
        res.json({
            status: '🦊 SPIDEY OFFICIAL is running!',
            version: '3.1 PRO',
            users: database.stats.totalUsers,
            downloads: database.stats.totalDownloads,
            uptime: process.uptime()
        });
    });

    // Lightweight endpoint you can point an uptime pinger at (e.g. UptimeRobot)
    // so Render's free tier does not sleep the service.
    app.get('/health', (req, res) => res.status(200).send('OK'));

    return app.listen(CONFIG.PORT, () => {
        console.log(`🌐 Web server running on port ${CONFIG.PORT}`);
    });
}

module.exports = { startServer };
