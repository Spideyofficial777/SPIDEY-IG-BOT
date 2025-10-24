// config.js - Environment Configuration
require('dotenv').config();

module.exports = {
    BOT_TOKEN: process.env.BOT_TOKEN || '7620991709:AAH2qNNm4UVOTxQvheJNiHMNV7KN1f4L0Lo',
    ADMIN_ID: parseInt(process.env.ADMIN_ID) || 5518489725,
    ADMIN_CHANNEL: parseInt(process.env.ADMIN_CHANNEL) || -1002423451263,
    DB_FILE: process.env.DB_FILE || 'database.json',
    PORT: process.env.PORT || 5000,
    MULTI_FSUB: process.env.MULTI_FSUB ? 
        process.env.MULTI_FSUB.split(' ').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : 
        [-1001959922658, -1002433552221, -1002470391435],
    START_IMG: process.env.START_IMG ? 
        process.env.START_IMG.split(' ') : [
            'https://graph.org/file/2518d4eb8c88f8f669f4c.jpg',
            'https://graph.org/file/d6d9d9b8d2dc779c49572.jpg',
            'https://graph.org/file/4b04eaad1e75e13e6dc08.jpg',
            'https://graph.org/file/05066f124a4ac500f8d91.jpg',
            'https://graph.org/file/2c64ed483c8fcf2bab7dd.jpg'
        ],
    FORCESUB_IMG: process.env.FORCESUB_IMG || 'https://i.ibb.co/ZNC1Hnb/ad3f2c88a8f2.jpg'
};
