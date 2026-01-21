/**
 * RELAWANNS ADMIN BOT (Relawanns_control)
 * Bot untuk mengelola pendaftaran event Relawanns
 * 
 * Author: Relawanns Team
 * Tech Stack: TypeScript + Grammy + PostgreSQL
 */

// @ts-nocheck

import { Bot, Context, InlineKeyboard, session } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { config } from './config/env';
import { isAdmin } from './middleware/auth.middleware';
import { MyContext } from './types/conversation';
import * as statusHandler from './handlers/status.handler';
import * as eventHandler from './handlers/event.handler';
import * as monitoringHandler from './handlers/monitoring.handler';
import * as clearHandler from './handlers/clear.handler';
import {
    editTitleConversation,
    editLocationConversation,
    editDateConversation,
    editQuotaConversation,
    editRequirementsConversation,
    editDescriptionConversation,
    editCategoryConversation,
    editDriveLinkConversation,
} from './conversations/edit.conversation';

// ============================================
// 1. BOT INITIALIZATION
// ============================================

const bot = new Bot<MyContext>(config.BOT_TOKEN);

// Session untuk simpan conversation state
// @ts-ignore - Type compatibility between session and conversations
bot.use(session({ initial: () => ({}) }));

// Install conversations plugin
// @ts-ignore - Type compatibility issue with Grammy and conversations plugin
bot.use(conversations());

// Register all edit conversations
// @ts-ignore - Type compatibility with conversation builders
bot.use(createConversation(editTitleConversation));
// @ts-ignore
bot.use(createConversation(editLocationConversation));
// @ts-ignore
bot.use(createConversation(editDateConversation));
// @ts-ignore
bot.use(createConversation(editQuotaConversation));
// @ts-ignore
bot.use(createConversation(editRequirementsConversation));
// @ts-ignore
bot.use(createConversation(editDescriptionConversation));
// @ts-ignore
bot.use(createConversation(editCategoryConversation));
// @ts-ignore
bot.use(createConversation(editDriveLinkConversation));

console.log('🤖 Relawanns_control bot sedang starting...');

// ============================================
// 2. MIDDLEWARE: Admin Authentication
// ============================================

// Semua command harus melalui middleware ini
bot.use(isAdmin);

// ============================================
// 3. COMMAND: /start
// ============================================

bot.command('start', async (ctx) => {
    const keyboard = new InlineKeyboard()
        .text('📊 Dashboard', 'dashboard')
        .row()
        .text('✅ Buka Pendaftaran', 'open_registration')
        .text('❌ Tutup Pendaftaran', 'close_registration')
        .row()
        .text('📝 Edit Event', 'menu_edit_event')
        .text('👥 Lihat Pendaftar', 'view_registrants')
        .row()
        .text('📤 Export Data', 'export_data');

    await ctx.reply(
        `🎉 *Selamat datang di Relawanns Control Bot!*\n\n` +
        `Bot ini membantu Anda mengelola pendaftaran event secara mudah dan cepat.\n\n` +
        `Silakan pilih menu di bawah atau gunakan command:`,
        {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
        }
    );
});

// ============================================
// 4. COMMAND: Status Pendaftaran
// ============================================

// Lihat status pendaftaran saat ini
bot.command('status', statusHandler.handleStatus);

// Buka pendaftaran
bot.command('open', statusHandler.handleOpen);

// Tutup pendaftaran
bot.command('close', statusHandler.handleClose);

// ============================================
// 5. COMMAND: Dashboard
// ============================================

bot.command('dashboard', monitoringHandler.handleDashboard);

// ============================================
// 6. COMMAND: Edit Event
// ============================================

bot.command('edit_title', eventHandler.handleEditTitle);
bot.command('edit_location', eventHandler.handleEditLocation);
bot.command('edit_date', eventHandler.handleEditDate);
bot.command('edit_description', eventHandler.handleEditDescription);
bot.command('edit_category', eventHandler.handleEditCategory);
bot.command('edit_quota', eventHandler.handleEditQuota);
bot.command('edit_requirements', eventHandler.handleEditRequirements);
bot.command('edit_drive_link', eventHandler.handleEditDriveLink);

// ============================================
// 7. COMMAND: Monitoring
// ============================================

bot.command('registrants', monitoringHandler.handleViewRegistrants);
// bot.command('export', monitoringHandler.handleExport); // Removed: use inline button only

// ============================================
// 8. COMMAND: Clear Database
// ============================================

bot.command('clear', isAdmin, clearHandler.handleClearDatabase);
bot.command('confirm', isAdmin, clearHandler.handleClearConfirm);

// Cancel conversation (exit dari edit apapun atau cancel clear)
bot.command('cancel', async (ctx) => {
    // Check if canceling clear operation
    if (ctx.session?.awaitingClearConfirmation) {
        await clearHandler.handleClearCancel(ctx);
        return;
    }
    await ctx.reply('❌ Operasi dibatalkan.\n\nKirim /start untuk menu utama.');
    // Exit akan otomatis karena tidak ada conversation.enter()
});

// ============================================
// TEST ERROR COMMAND (for testing notifications)
// ============================================

bot.command('test_error', async (ctx) => {
    await ctx.reply('🧪 Testing error notification system...\n\nGenerating test error in 2 seconds...');

    setTimeout(() => {
        // Deliberately throw an error to test notification
        throw new Error('Test error from Bot Admin - This is a test!');
    }, 2000);
});

// ============================================
// 8. INLINE KEYBOARD CALLBACKS
// ============================================

// Dashboard
bot.callbackQuery('dashboard', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch { }
    await monitoringHandler.handleDashboard(ctx);
});

// Buka/Tutup pendaftaran
bot.callbackQuery('open_registration', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch { }
    await statusHandler.handleOpen(ctx);
});

bot.callbackQuery('close_registration', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch { }
    await statusHandler.handleClose(ctx);
});

// Menu edit event
bot.callbackQuery('menu_edit_event', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch { }

    const keyboard = new InlineKeyboard()
        .text('📝 Edit Judul', 'edit_title')
        .row()
        .text('📍 Edit Lokasi', 'edit_location')
        .text('📅 Edit Tanggal', 'edit_date')
        .row()
        .text('📄 Edit Deskripsi', 'edit_description')
        .row()
        .text('🏷️ Edit Kategori', 'edit_category')
        .text('👥 Edit Kuota', 'edit_quota')
        .row()
        .text('📋 Edit Persyaratan', 'edit_requirements')
        .row()
        .text('🔗 Edit Link Drive', 'edit_drive_link')
        .row()
        .text('« Kembali', 'back_to_main');

    await ctx.editMessageText(
        '📝 *Menu Edit Event*\n\nPilih data yang ingin diubah:',
        {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
        }
    );
});

// ============================================
// EDIT CONVERSATIONS - Callback Handlers
// ============================================

// Edit Judul
bot.callbackQuery('edit_title', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch { }
    await ctx.conversation.enter('editTitleConversation');
});

// Edit Lokasi
bot.callbackQuery('edit_location', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch { }
    await ctx.conversation.enter('editLocationConversation');
});

// Edit Tanggal
bot.callbackQuery('edit_date', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch { }
    await ctx.conversation.enter('editDateConversation');
});

// Edit Kuota
bot.callbackQuery('edit_quota', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch { }
    await ctx.conversation.enter('editQuotaConversation');
});

// Edit Persyaratan
bot.callbackQuery('edit_requirements', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch { }
    await ctx.conversation.enter('editRequirementsConversation');
});

// Edit Deskripsi
bot.callbackQuery('edit_description', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch { }
    await ctx.conversation.enter('editDescriptionConversation');
});

// Edit Kategori
bot.callbackQuery('edit_category', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch { }
    await ctx.conversation.enter('editCategoryConversation');
});

// Edit Link Drive
bot.callbackQuery('edit_drive_link', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch { }
    await ctx.conversation.enter('editDriveLinkConversation');
});


// View registrants
bot.callbackQuery('view_registrants', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch { }
    await monitoringHandler.handleViewRegistrants(ctx);
});

// Export data
bot.callbackQuery('export_data', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch { }
    await monitoringHandler.handleExport(ctx);
});

// Back to main menu
bot.callbackQuery('back_to_main', async (ctx) => {
    try { await ctx.answerCallbackQuery(); } catch { }

    const keyboard = new InlineKeyboard()
        .text('📊 Dashboard', 'dashboard')
        .row()
        .text('✅ Buka Pendaftaran', 'open_registration')
        .text('❌ Tutup Pendaftaran', 'close_registration')
        .row()
        .text('📝 Edit Event', 'menu_edit_event')
        .text('👥 Lihat Pendaftar', 'view_registrants')
        .row()
        .text('📤 Export Data', 'export_data');

    await ctx.editMessageText(
        '🏠 *Menu Utama*\n\nPilih aksi yang ingin dilakukan:',
        {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
        }
    );
});

// ============================================
// ERROR NOTIFICATION SYSTEM
// ============================================

// Function to send error notification to admin
async function sendErrorNotification(errorMessage: string, errorDetails: any) {
    try {
        const message =
            `🚨 *BOT ADMIN ERROR!*\n\n` +
            `⚠️ Bot mengalami masalah:\n\n` +
            `📝 Error: ${errorMessage}\n` +
            `🕒 Waktu: ${new Date().toLocaleString('id-ID')}\n\n` +
            `💬 Detail:\n\`\`\`\n${JSON.stringify(errorDetails, null, 2).substring(0, 500)}\n\`\`\`\n\n` +
            `⚡ Bot akan mencoba restart otomatis...`;

        // Use first admin ID from array
        const adminId = config.ADMIN_TELEGRAM_IDS[0];
        await bot.api.sendMessage(adminId, message, { parse_mode: 'Markdown' });
        console.log('📤 Error notification sent to admin');
    } catch (notifError) {
        console.error('Failed to send error notification:', notifError);
    }
}

// ============================================
// 9. ERROR HANDLING
// ============================================

bot.catch(async (err) => {
    const ctx = err.ctx;
    console.error(`❌ Error saat memproses update ${ctx.update.update_id}:`);
    console.error(err.error);

    // Send notification to admin
    await sendErrorNotification('Grammy Bot Error - Bot Admin', {
        updateId: ctx.update.update_id,
        error: err.error.message,
        stack: err.error.stack?.substring(0, 200)
    });

    // Kirim pesan error ke user (jangan expose detail teknis)
    ctx.reply(
        '❌ Maaf, terjadi kesalahan saat memproses permintaan Anda.\n' +
        'Silakan coba lagi atau hubungi developer.'
    );
});

// ============================================
// PROCESS ERROR HANDLERS
// ============================================

// Uncaught Exception (Critical errors)
process.on('uncaughtException', async (error) => {
    console.error('💥 Uncaught Exception in Bot Admin:', error);
    await sendErrorNotification('Uncaught Exception - Bot Admin', {
        error: error.message,
        stack: error.stack?.substring(0, 200)
    });
    // Give time for notification to send
    await new Promise(resolve => setTimeout(resolve, 2000));
    process.exit(1); // Exit to allow restart
});

// Unhandled Promise Rejection
process.on('unhandledRejection', async (reason: any) => {
    console.error('❌ Unhandled Rejection in Bot Admin:', reason);
    await sendErrorNotification('Unhandled Promise Rejection - Bot Admin', {
        reason: reason?.message || String(reason),
        stack: reason?.stack?.substring(0, 200)
    });
});

// ============================================
// 10. START BOT
// ============================================

// Graceful shutdown
process.once('SIGINT', () => {
    console.log('\n⚠️  Bot sedang shutdown...');
    bot.stop();
});

process.once('SIGTERM', () => {
    console.log('\n⚠️  Bot sedang shutdown...');
    bot.stop();
});

// Start polling
bot.start({
    onStart: async (botInfo) => {
        console.log(`✅ Bot @${botInfo.username} berhasil berjalan!`);
        console.log(`📝 Bot ID: ${botInfo.id}`);
        console.log(`🚀 Ready to receive commands...\n`);

        // Send startup notification to admin
        try {
            const adminId = config.ADMIN_TELEGRAM_IDS[0];
            await bot.api.sendMessage(
                adminId,
                `✅ *Bot Admin Online!*\n\n` +
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

