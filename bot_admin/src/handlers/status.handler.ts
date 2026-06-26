/**
 * STATUS HANDLER
 * Handler untuk command status pendaftaran:
 * - /status: Lihat status saat ini
 * - /open: Buka pendaftaran
 * - /close: Tutup pendaftaran
 */

import { Context } from 'grammy';
import { getSetting, setSetting, getRegistrantCount } from '../database/queries';

/**
 * Handler: /status
 * Menampilkan status pendaftaran saat ini
 */
export async function handleStatus(ctx: Context) {
    try {
        // Ambil data dari database
        const status = await getSetting('registration_status');
        const currentCount = await getRegistrantCount();
        const maxQuota = await getSetting('max_quota');
        const eventTitle = await getSetting('event_title');

        // Format status
        const isOpen = status === 'open';
        const statusEmoji = isOpen ? '✅' : '❌';
        const statusText = isOpen ? 'DIBUKA' : 'DITUTUP';

        // Hitung persentase kuota
        const percentage = maxQuota ? Math.round((currentCount / parseInt(maxQuota)) * 100) : 0;

        // Kirim pesan
        await ctx.reply(
            `${statusEmoji} *STATUS PENDAFTARAN*\n\n` +
            `Event: ${eventTitle || 'Relawanns'}\n\n` +
            `Status: *${statusText}*\n` +
            `Pendaftar: ${currentCount}/${maxQuota || '∞'} (${percentage}%)\n\n` +
            `📅 Update terakhir: ${new Date().toLocaleString('id-ID')}`,
            { parse_mode: 'Markdown' }
        );
    } catch (error) {
        console.error('Error handleStatus:', error);
        await ctx.reply('❌ Gagal mengambil status. Silakan coba lagi.');
    }
}

/**
 * Handler: /open
 * Buka pendaftaran
 */
export async function handleOpen(ctx: Context) {
    try {
        // Cek status saat ini
        const currentStatus = await getSetting('registration_status');

        if (currentStatus === 'open') {
            await ctx.reply(
                '⚠️ Pendaftaran sudah dalam status *DIBUKA*.',
                { parse_mode: 'Markdown' }
            );
            return;
        }

        // Update status di database
        const userId = ctx.from?.id;
        await setSetting('registration_status', 'open', userId);

        // Get event info
        const eventTitle = await getSetting('event_title');
        const maxQuota = await getSetting('max_quota');
        const currentCount = await getRegistrantCount();

        // Kirim konfirmasi
        await ctx.reply(
            `✅ *PENDAFTARAN DIBUKA*\n\n` +
            `Event: ${eventTitle}\n` +
            `Kuota: ${maxQuota || 'Unlimited'} peserta\n` +
            `Terdaftar: ${currentCount}\n\n` +
            `Pendaftar baru sekarang bisa mendaftar via user bot! 🎉`,
            { parse_mode: 'Markdown' }
        );

        console.log(`✅ Pendaftaran dibuka oleh admin ${userId}`);
    } catch (error) {
        console.error('Error handleOpen:', error);
        await ctx.reply('❌ Gagal membuka pendaftaran. Silakan coba lagi.');
    }
}

/**
 * Handler: /close
 * Tutup pendaftaran (manual)
 */
export async function handleClose(ctx: Context) {
    try {
        // Cek status saat ini
        const currentStatus = await getSetting('registration_status');

        if (currentStatus === 'closed') {
            await ctx.reply(
                '⚠️ Pendaftaran sudah dalam status *DITUTUP*.',
                { parse_mode: 'Markdown' }
            );
            return;
        }

        // Update status di database
        const userId = ctx.from?.id;
        await setSetting('registration_status', 'closed', userId);

        // Get stats
        const currentCount = await getRegistrantCount();
        const maxQuota = await getSetting('max_quota');

        // Kirim konfirmasi
        await ctx.reply(
            `❌ *PENDAFTARAN DITUTUP*\n\n` +
            `Total pendaftar: ${currentCount}/${maxQuota || '∞'}\n\n` +
            `Pendaftar baru tidak bisa mendaftar sampai pendaftaran dibuka kembali.`,
            { parse_mode: 'Markdown' }
        );

        console.log(`❌ Pendaftaran ditutup oleh admin ${userId}`);
    } catch (error) {
        console.error('Error handleClose:', error);
        await ctx.reply('❌ Gagal menutup pendaftaran. Silakan coba lagi.');
    }
}

/**
 * Auto-close pendaftaran saat quota penuh
 * Function ini dipanggil dari user bot setiap ada pendaftar baru
 */
export async function checkAndAutoClose(): Promise<boolean> {
    try {
        const currentCount = await getRegistrantCount();
        const maxQuota = await getSetting('max_quota');
        const status = await getSetting('registration_status');

        // Jika quota sudah penuh dan status masih open
        if (maxQuota && currentCount >= parseInt(maxQuota) && status === 'open') {
            // Auto-close
            await setSetting('registration_status', 'closed');

            console.log(`🔒 Auto-close: Quota penuh (${currentCount}/${maxQuota})`);
            return true; // Return true untuk notifikasi admin
        }

        return false;
    } catch (error) {
        console.error('Error checkAndAutoClose:', error);
        return false;
    }
}

/**
 * Handler: Toggle Maintenance Mode
 * Aktifkan/nonaktifkan mode maintenance di halaman /daftar
 */
export async function handleMaintenanceToggle(ctx: Context) {
    try {
        const userId = ctx.from?.id;

        // Cek status maintenance saat ini
        const currentMode = await getSetting('maintenance_mode');
        const isCurrentlyActive = currentMode === 'true';

        // Toggle
        const newMode = isCurrentlyActive ? 'false' : 'true';
        await setSetting('maintenance_mode', newMode, userId);

        if (newMode === 'true') {
            await ctx.reply(
                `🚧 *MAINTENANCE MODE DIAKTIFKAN*\n\n` +
                `Halaman pendaftaran sekarang menampilkan halaman maintenance.\n` +
                `Pendaftar tidak bisa mengakses form pendaftaran.\n\n` +
                `Untuk menonaktifkan, tekan tombol Maintenance Mode lagi.`,
                { parse_mode: 'Markdown' }
            );
        } else {
            await ctx.reply(
                `✅ *MAINTENANCE MODE DINONAKTIFKAN*\n\n` +
                `Halaman pendaftaran kembali normal.\n` +
                `Pendaftar bisa mengakses form pendaftaran.`,
                { parse_mode: 'Markdown' }
            );
        }

        console.log(`🚧 Maintenance mode ${newMode === 'true' ? 'diaktifkan' : 'dinonaktifkan'} oleh admin ${userId}`);
    } catch (error) {
        console.error('Error handleMaintenanceToggle:', error);
        await ctx.reply('❌ Gagal mengubah maintenance mode. Silakan coba lagi.');
    }
}

