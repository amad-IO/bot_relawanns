/**
 * ADMIN AUTHENTICATION MIDDLEWARE
 * Middleware ini memastikan hanya admin yang bisa akses bot
 */

import { Context, NextFunction } from 'grammy';
import { config } from '../config/env';
import { checkUserIsAdmin } from '../database/queries';

/**
 * Middleware: Cek apakah user adalah admin
 * Jika bukan admin, kirim pesan unauthorized dan stop
 */
export async function isAdmin(ctx: Context, next: NextFunction) {
    // Ambil user ID dari context
    const userId = ctx.from?.id;
    const username = ctx.from?.username || 'unknown';

    // Jika tidak ada user ID (edge case), tolak
    if (!userId) {
        console.warn('⚠️  Request tanpa user ID');
        return;
    }

    // Cek 1: Apakah ada di env var (quick check)
    const isAdminInEnv = config.ADMIN_TELEGRAM_IDS.includes(userId);

    // Cek 2: Apakah ada di database (lebih reliable)
    const isAdminInDb = await checkUserIsAdmin(userId);

    // Jika bukan admin
    if (!isAdminInEnv && !isAdminInDb) {
        console.warn(`⛔ Unauthorized access attempt: ${userId} (@${username})`);

        await ctx.reply(
            '⛔ *Akses Ditolak*\n\n' +
            'Anda tidak memiliki izin untuk menggunakan bot ini.\n' +
            'Hubungi admin Relawanns jika Anda merasa ini adalah kesalahan.',
            { parse_mode: 'Markdown' }
        );

        return; // Stop di sini, jangan lanjut ke next()
    }

    // Log admin activity (untuk audit)
    const command = ctx.message?.text || ctx.callbackQuery?.data || 'unknown';
    console.log(`✅ Admin action: @${username} (${userId}) → ${command}`);

    // Lanjutkan ke handler berikutnya
    await next();
}

/**
 * Helper: Get admin info for display
 */
export async function getAdminInfo(userId: number) {
    return {
        id: userId,
        isAuthorized: config.ADMIN_TELEGRAM_IDS.includes(userId),
    };
}
