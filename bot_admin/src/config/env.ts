/**
 * ENVIRONMENT CONFIGURATION
 * File ini mengatur semua environment variables
 */

import { config as loadEnv } from 'dotenv';

// Load .env file
loadEnv();

// Validasi: Pastikan semua env var yang dibutuhkan ada
function validateEnv() {
    const required = ['BOT_TOKEN', 'DATABASE_URL', 'ADMIN_TELEGRAM_IDS'];

    for (const key of required) {
        if (!process.env[key]) {
            throw new Error(`❌ Environment variable ${key} tidak ditemukan!`);
        }
    }
}

validateEnv();

// Export config object
export const config = {
    // Bot token dari @BotFather
    BOT_TOKEN: process.env.BOT_TOKEN!,

    // Database connection string
    DATABASE_URL: process.env.DATABASE_URL!,

    // Daftar admin IDs (convert string "123,456" jadi [123, 456])
    ADMIN_TELEGRAM_IDS: process.env.ADMIN_TELEGRAM_IDS!
        .split(',')
        .map(id => parseInt(id.trim())),

    // Port untuk webhook (optional)
    PORT: parseInt(process.env.PORT || '3000'),
} as const;

// Log (hide sensitive data)
console.log('🔧 Config loaded:');
console.log(`   - Admins: ${config.ADMIN_TELEGRAM_IDS.length} user(s)`);
console.log(`   - Database: ${config.DATABASE_URL.split('@')[1] || 'Connected'}`);
console.log(`   - Port: ${config.PORT}\n`);
