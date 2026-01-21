/**
 * BOT RELAWANNS
 * Bot untuk terima notifikasi pendaftaran dan export data
 */

import { Bot, InputFile, InlineKeyboard } from 'grammy';
import postgres from 'postgres';
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

config();

// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const DATABASE_URL = process.env.DATABASE_URL || '';
const ADMIN_ID = parseInt(process.env.ADMIN_TELEGRAM_ID || '0');

// Database client
const sql = postgres(DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
});

// Bot initialization
const bot = new Bot(BOT_TOKEN);

// ============================================
// MIDDLEWARE: Admin Only
// ============================================

const isAdmin = (ctx: any, next: () => Promise<void>) => {
    if (ctx.from?.id === ADMIN_ID) {
        return next();
    }
    return ctx.reply('❌ Anda tidak memiliki akses ke command ini.');
};

// ============================================
// COMMAND: /start
// ============================================

bot.command('start', async (ctx) => {
    const keyboard = new InlineKeyboard()
        .text('📊 Dashboard', 'dashboard')
        .row()
        .text('✅ Buka Pendaftaran', 'open')
        .text('❌ Tutup Pendaftaran', 'close')
        .row()
        .text('📥 Export Excel', 'recap');

    await ctx.reply(
        '🤖 *Bot Relawanns*\n\n' +
        'Selamat datang di Bot Monitoring Pendaftaran Event!\n\n' +
        '✨ Menggunakan bot ini, Anda dapat:\n' +
        '• Melihat dashboard event\n' +
        '• Membuka/menutup pendaftaran\n' +
        '• Export data pendaftar ke Excel\n\n' +
        '👇 Pilih menu di bawah ini:',
        {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        }
    );
});

// ============================================
// COMMAND: /dashboard
// ============================================

bot.command('dashboard', isAdmin, async (ctx) => {
    await handleDashboard(ctx);
});

async function handleDashboard(ctx: any) {
    try {
        // Get event settings
        const settings = await sql`
            SELECT key, value FROM event_settings
        `;

        const data: Record<string, string> = {};
        settings.forEach(row => {
            data[row.key] = row.value;
        });

        const isOpen = data.registration_status === 'open';
        const statusIcon = isOpen ? '✅' : '❌';
        const statusText = isOpen ? 'Dibuka' : 'Ditutup';

        const message = `📊 *DASHBOARD EVENT*\n\n` +
            `📝 *Judul:* ${data.event_title || 'Belum diset'}\n` +
            `📍 *Lokasi:* ${data.event_location_name || 'Belum diset'}\n` +
            `📅 *Tanggal:* ${data.event_date || 'Belum diset'}\n` +
            `👥 *Kuota:* ${data.current_registrants || '0'}/${data.max_quota || '0'}\n` +
            `🏷️ *Kategori:* ${data.event_category || 'Belum diset'}\n\n` +
            `📢 *Status Pendaftaran:* ${statusIcon} ${statusText}`;

        const keyboard = new InlineKeyboard()
            .text('🔄 Refresh', 'dashboard')
            .row()
            .text('🏠 Menu Utama', 'start');

        await ctx.reply(message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        await ctx.reply('❌ Gagal mengambil data dashboard.');
    }
}

// ============================================
// COMMAND: /open
// ============================================

bot.command('open', isAdmin, async (ctx) => {
    await handleOpen(ctx);
});

async function handleOpen(ctx: any) {
    try {
        await sql`
            UPDATE event_settings 
            SET value = 'open' 
            WHERE key = 'registration_status'
        `;

        const keyboard = new InlineKeyboard()
            .text('📊 Lihat Dashboard', 'dashboard')
            .row()
            .text('🏠 Menu Utama', 'start');

        await ctx.reply(
            '✅ *Pendaftaran Dibuka!*\n\n' +
            '🎉 Sekarang orang bisa mendaftar ke event.\n' +
            '📝 Notifikasi akan masuk otomatis saat ada pendaftar baru.',
            {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            }
        );

    } catch (error) {
        console.error('Open error:', error);
        await ctx.reply('❌ Gagal membuka pendaftaran.');
    }
}

// ============================================
// COMMAND: /close
// ============================================

bot.command('close', isAdmin, async (ctx) => {
    await handleClose(ctx);
});

async function handleClose(ctx: any) {
    try {
        await sql`
            UPDATE event_settings 
            SET value = 'closed' 
            WHERE key = 'registration_status'
        `;

        const keyboard = new InlineKeyboard()
            .text('📊 Lihat Dashboard', 'dashboard')
            .row()
            .text('🏠 Menu Utama', 'start');

        await ctx.reply(
            '❌ *Pendaftaran Ditutup!*\n\n' +
            '🔒 Sekarang orang tidak bisa mendaftar.\n' +
            '📊 Anda masih bisa export data yang sudah ada.',
            {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            }
        );

    } catch (error) {
        console.error('Close error:', error);
        await ctx.reply('❌ Gagal menutup pendaftaran.');
    }
}

// ============================================
// COMMAND: /recap - Export Excel
// ============================================

bot.command('recap', isAdmin, async (ctx) => {
    await handleRecap(ctx);
});

async function handleRecap(ctx: any) {
    try {
        await ctx.reply('⏳ Generating Excel file...');

        // Get all registrations
        const registrations = await sql`
            SELECT 
                registration_number,
                name,
                email,
                phone,
                age,
                city,
                payment_proof_url,
                created_at
            FROM registrations
            ORDER BY registration_number ASC
        `;

        if (registrations.length === 0) {
            const keyboard = new InlineKeyboard()
                .text('🏠 Menu Utama', 'start');

            await ctx.reply('⚠️ Tidak ada data pendaftar untuk di-export.', {
                reply_markup: keyboard
            });
            return;
        }

        // Get max quota
        const [{ value: maxQuota }] = await sql`
            SELECT value FROM event_settings WHERE key = 'max_quota'
        `;

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Pendaftar');

        // Add headers
        worksheet.columns = [
            { header: 'No', key: 'no', width: 5 },
            { header: 'No Pendaftar', key: 'reg_number', width: 12 },
            { header: 'Nama Lengkap', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'No. WhatsApp', key: 'phone', width: 15 },
            { header: 'Usia', key: 'age', width: 8 },
            { header: 'Kota Domisili', key: 'city', width: 20 },
            { header: 'Bukti Transfer (URL)', key: 'payment_url', width: 50 },
            { header: 'Waktu Daftar', key: 'created_at', width: 20 },
        ];

        // Style header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFdc2626' }
        };
        worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

        // Add data rows
        registrations.forEach((reg, index) => {
            worksheet.addRow({
                no: index + 1,
                reg_number: `${reg.registration_number}/${maxQuota}`,
                name: reg.name,
                email: reg.email,
                phone: reg.phone,
                age: reg.age,
                city: reg.city,
                payment_url: reg.payment_proof_url || '',
                created_at: reg.created_at ? new Date(reg.created_at).toLocaleString('id-ID') : ''
            });
        });

        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `registrations_${timestamp}.xlsx`;
        const filePath = path.join(__dirname, '..', filename);

        // Write file
        await workbook.xlsx.writeFile(filePath);

        // Send file using InputFile
        const keyboard = new InlineKeyboard()
            .text('🔄 Export Lagi', 'recap')
            .row()
            .text('📊 Dashboard', 'dashboard')
            .text('🏠 Menu Utama', 'start');

        await ctx.replyWithDocument(
            new InputFile(filePath, filename),
            {
                caption: `📊 *Data Pendaftar*\n\nTotal: ${registrations.length} orang\nGenerated: ${new Date().toLocaleString('id-ID')}`,
                parse_mode: 'Markdown',
                reply_markup: keyboard
            }
        );

        // Delete temp file
        fs.unlinkSync(filePath);

        await ctx.reply('✅ Export selesai!');

    } catch (error) {
        console.error('Recap error:', error);
        await ctx.reply('❌ Gagal meng-export data.');
    }
}

// ============================================
// CALLBACK QUERY HANDLERS
// ============================================

bot.callbackQuery('start', async (ctx) => {
    await ctx.answerCallbackQuery();

    const keyboard = new InlineKeyboard()
        .text('📊 Lihat Dashboard', 'dashboard')
        .row()
        .text('🟢 Buka Pendaftaran', 'open')
        .text('🔴 Tutup Pendaftaran', 'close')
        .row()
        .text('📥 Export ke Excel', 'recap');

    await ctx.editMessageText(
        '👋✨ *Hai! Saya Bot Relawanns!* 🤖\n\n' +
        '╔══════════════════════════════╗\n' +
        '   🎯 *YOUR EVENT COMPANION*\n' +
        '╚══════════════════════════════╝\n\n' +
        'Saya akan bantu Anda:\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '📊 Monitor event real-time\n' +
        '🔔 Notif setiap ada pendaftar baru\n' +
        '📥 Export data jadi Excel instant\n' +
        '⚙️ Kontrol status pendaftaran\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '🚀 Siap? Pilih menu di bawah ya!',
        {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        }
    );
});

bot.callbackQuery('dashboard', isAdmin, async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleDashboard(ctx);
});

bot.callbackQuery('open', isAdmin, async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleOpen(ctx);
});

bot.callbackQuery('close', isAdmin, async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleClose(ctx);
});

bot.callbackQuery('recap', isAdmin, async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleRecap(ctx);
});

// ============================================
// ERROR NOTIFICATION SYSTEM
// ============================================

// Function to send error notification to admin
async function sendErrorNotification(errorMessage: string, errorDetails: any) {
    try {
        const message =
            `🚨 *BOT RELAWANNS ERROR!*\n\n` +
            `⚠️ Bot mengalami masalah:\n\n` +
            `📝 Error: ${errorMessage}\n` +
            `🕒 Waktu: ${new Date().toLocaleString('id-ID')}\n\n` +
            `💬 Detail:\n\`\`\`\n${JSON.stringify(errorDetails, null, 2).substring(0, 500)}\n\`\`\`\n\n` +
            `⚡ Bot akan mencoba restart otomatis...`;

        await bot.api.sendMessage(ADMIN_ID, message, { parse_mode: 'Markdown' });
        console.log('📤 Error notification sent to admin');
    } catch (notifError) {
        console.error('Failed to send error notification:', notifError);
    }
}

// ============================================
// ERROR HANDLER
// ============================================

bot.catch(async (err) => {
    console.error('🚨 Bot Relawanns error:', err);
    await sendErrorNotification('Grammy Bot Error', {
        error: err.message,
        stack: err.stack?.substring(0, 200)
    });
});

// ============================================
// PROCESS ERROR HANDLERS
// ============================================

// Uncaught Exception (Critical errors)
process.on('uncaughtException', async (error) => {
    console.error('💥 Uncaught Exception in Bot Relawanns:', error);
    await sendErrorNotification('Uncaught Exception - Bot Relawanns', {
        error: error.message,
        stack: error.stack?.substring(0, 200)
    });
    // Give time for notification to send
    await new Promise(resolve => setTimeout(resolve, 2000));
    process.exit(1); // Exit to allow restart
});

// Unhandled Promise Rejection
process.on('unhandledRejection', async (reason: any) => {
    console.error('❌ Unhandled Rejection in Bot Relawanns:', reason);
    await sendErrorNotification('Unhandled Promise Rejection - Bot Relawanns', {
        reason: reason?.message || String(reason),
        stack: reason?.stack?.substring(0, 200)
    });
});

// ============================================
// START BOT
// ============================================

bot.start({
    onStart: async (botInfo) => {
        console.log(`✅ Bot Relawanns started: @${botInfo.username}`);
        console.log(`📊 Ready to receive notifications and export data`);

        // Send startup notification to admin
        try {
            await bot.api.sendMessage(
                ADMIN_ID,
                `✅ *Bot Relawanns Online!*\n\n` +
                `🤖 @${botInfo.username}\n` +
                `🕒 ${new Date().toLocaleString('id-ID')}\n\n` +
                `Status: Ready to work! 🚀`,
                { parse_mode: 'Markdown' }
            );
        } catch (e) {
            console.error('Failed to send startup notification');
        }
    },
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());

