// @ts-nocheck
/**
 * MAIN ENTRY POINT - Azure Deployment
 * Starts HTTP server + Telegram bot simultaneously
 */

import http from 'http';

// 1. START HTTP SERVER (Required for Azure)
const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'healthy',
        bot: 'Relawanns Admin Bot',
        timestamp: new Date().toISOString()
    }));
});

server.listen(PORT, () => {
    console.log(`✅ HTTP Server started on port ${PORT}`);
    console.log(`🤖 Starting Telegram bot...`);
});

// 2. START TELEGRAM BOT
import('./bot.js').then(() => {
    console.log('✅ Bot module loaded successfully');
}).catch((err) => {
    console.error('❌ Failed to load bot:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('⚠️ Shutting down...');
    server.close(() => process.exit(0));
});
