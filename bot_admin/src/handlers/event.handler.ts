/**
 * EVENT HANDLER
 * Handler untuk edit konfigurasi event:
 * - Edit judul
 * - Edit lokasi (+ Google Maps)  
 * - Edit tanggal
 * - Edit deskripsi
 * - Edit kategori
 * - Edit quota
 * - Edit persyaratan
 */

import { Context } from 'grammy';
import { getSetting, setSetting, parseJsonSetting, stringifyJsonSetting } from '../database/queries';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale/id';

// ============================================
// EDIT TITLE
// ============================================

export async function handleEditTitle(ctx: Context) {
    const currentTitle = await getSetting('event_title');

    await ctx.reply(
        `📝 *Edit Judul Event*\n\n` +
        `Judul saat ini:\n${currentTitle}\n\n` +
        `Kirim judul baru atau /cancel untuk batal:`,
        { parse_mode: 'Markdown' }
    );

    // TODO: Implement conversation handler
    // Untuk sementara, user akan kirim message berikutnya dan kita tangkap
}

// ============================================
// EDIT LOCATION
// ============================================

export async function handleEditLocation(ctx: Context) {
    const currentLocation = await getSetting('event_location_name');
    const currentMaps = await getSetting('event_location_maps');

    await ctx.reply(
        `📍 *Edit Lokasi Event*\n\n` +
        `Lokasi saat ini: ${currentLocation}\n` +
        `Maps: ${currentMaps}\n\n` +
        `Kirim lokasi baru dalam format:\n` +
        `\`Nama Kota | Google Maps Link\`\n\n` +
        `Contoh:\n` +
        `\`Jakarta | https://maps.google.com/?q=Jakarta\`\n\n` +
        `Atau /cancel untuk batal:`,
        { parse_mode: 'Markdown' }
    );
}

// ============================================
// EDIT DATE
// ============================================

export async function handleEditDate(ctx: Context) {
    const currentDate = await getSetting('event_date');

    // Format tanggal untuk display
    let formattedDate = currentDate || 'Belum diset';
    if (currentDate) {
        try {
            const date = new Date(currentDate);
            formattedDate = format(date, 'EEEE, dd MMMM yyyy', { locale: localeId });
        } catch { }
    }

    await ctx.reply(
        `📅 *Edit Tanggal Event*\n\n` +
        `Tanggal saat ini:\n${formattedDate} (${currentDate})\n\n` +
        `Kirim tanggal baru dalam format:\n` +
        `\`YYYY-MM-DD\`\n\n` +
        `Contoh:\n` +
        `\`2025-02-15\`\n\n` +
        `Atau /cancel untuk batal:`,
        { parse_mode: 'Markdown' }
    );
}

// ============================================
// EDIT DESCRIPTION
// ============================================

export async function handleEditDescription(ctx: Context) {
    const currentDesc = await getSetting('event_description');

    await ctx.reply(
        `📄 *Edit Deskripsi Event*\n\n` +
        `Deskripsi saat ini:\n${currentDesc}\n\n` +
        `Kirim deskripsi baru (bisa multi-line) atau /cancel untuk batal:`,
        { parse_mode: 'Markdown' }
    );
}

// ============================================
// EDIT CATEGORY
// ============================================

export async function handleEditCategory(ctx: Context) {
    const currentCategory = await getSetting('event_category');

    await ctx.reply(
        `🏷️ *Edit Kategori Event*\n\n` +
        `Kategori saat ini: ${currentCategory}\n\n` +
        `Kirim kategori baru atau /cancel untuk batal:\n\n` +
        `Contoh: Event, Workshop, Sosialisasi, Training`,
        { parse_mode: 'Markdown' }
    );
}

// ============================================
// EDIT QUOTA
// ============================================

export async function handleEditQuota(ctx: Context) {
    const currentQuota = await getSetting('max_quota');
    const currentCount = await getSetting('current_registrants') || '0';

    await ctx.reply(
        `👥 *Edit Kuota Pendaftar*\n\n` +
        `Kuota saat ini: ${currentQuota} orang\n` +
        `Terdaftar: ${currentCount} orang\n\n` +
        `Kirim jumlah kuota baru (angka) atau /cancel untuk batal:\n\n` +
        `Contoh: 50`,
        { parse_mode: 'Markdown' }
    );
}

// ============================================
// EDIT REQUIREMENTS
// ============================================

export async function handleEditRequirements(ctx: Context) {
    const currentReqString = await getSetting('requirements') || '[]';
    const currentReq = parseJsonSetting(currentReqString);

    // Format current requirements
    let formattedReq = 'Belum ada persyaratan';
    if (Array.isArray(currentReq) && currentReq.length > 0) {
        formattedReq = currentReq.map((req, i) => `${i + 1}. ${req}`).join('\n');
    }

    await ctx.reply(
        `📋 *Edit Persyaratan Pendaftaran*\n\n` +
        `Persyaratan saat ini:\n${formattedReq}\n\n` +
        `Kirim persyaratan baru (pisahkan dengan enter/newline):\n\n` +
        `Contoh:\n` +
        `\`WNI berusia minimal 17 tahun\n` +
        `Memiliki komitmen tinggi\n` +
        `Biaya pendaftaran Rp. 99.000\`\n\n` +
        `Atau /cancel untuk batal:`,
        { parse_mode: 'Markdown' }
    );
}

// ============================================
// EDIT DRIVE LINK
// ============================================

export async function handleEditDriveLink(ctx: Context) {
    const currentLink = await getSetting('link_drive') || 'https://drive.google.com';

    await ctx.reply(
        `🔗 *Edit Link Google Drive*\n\n` +
        `Link saat ini:\n${currentLink}\n\n` +
        `Link ini akan muncul di halaman Galeri.`,
        { parse_mode: 'Markdown' }
    );
}

// ============================================
// MESSAGE HANDLER (Untuk Terima Input)
// ============================================

/**
 * Handler untuk terima input dari user
 * Ini akan dipanggil ketika user kirim message setelah /edit_xxx
 */
export async function handleEditInput(ctx: Context, editType: string) {
    const text = ctx.message?.text;

    if (!text) {
        await ctx.reply('❌ Input tidak valid. Silakan coba lagi.');
        return;
    }

    // Cancel
    if (text === '/cancel') {
        await ctx.reply('✅ Edit dibatalkan.');
        return;
    }

    const userId = ctx.from?.id;

    try {
        switch (editType) {
            case 'title':
                await setSetting('event_title', text, userId);
                await ctx.reply(`✅ Judul berhasil diupdate!\n\nJudul baru:\n${text}`);
                break;

            case 'location':
                // Parse "City | Maps URL"
                const parts = text.split('|').map(p => p.trim());
                if (parts.length !== 2) {
                    await ctx.reply('❌ Format salah! Gunakan: Nama Kota | Google Maps Link');
                    return;
                }

                await setSetting('event_location_name', parts[0], userId);
                await setSetting('event_location_maps', parts[1], userId);
                await ctx.reply(
                    `✅ Lokasi berhasil diupdate!\n\n` +
                    `Lokasi: ${parts[0]}\n` +
                    `Maps: ${parts[1]}`
                );
                break;

            case 'date':
                // Validate date format (YYYY-MM-DD)
                if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
                    await ctx.reply('❌ Format tanggal salah! Gunakan: YYYY-MM-DD (contoh: 2025-02-15)');
                    return;
                }

                await setSetting('event_date', text, userId);

                // Format untuk display
                const date = new Date(text);
                const formatted = format(date, 'EEEE, dd MMMM yyyy', { locale: localeId });

                await ctx.reply(
                    `✅ Tanggal berhasil diupdate!\n\n` +
                    `Tanggal baru: ${formatted}`
                );
                break;

            case 'description':
                await setSetting('event_description', text, userId);
                await ctx.reply(`✅ Deskripsi berhasil diupdate!`);
                break;

            case 'category':
                await setSetting('event_category', text, userId);
                await ctx.reply(`✅ Kategori berhasil diupdate!\n\nKategori baru: ${text}`);
                break;

            case 'quota':
                // Validate number
                const quota = parseInt(text);
                if (isNaN(quota) || quota < 1) {
                    await ctx.reply('❌ Kuota harus berupa angka positif!');
                    return;
                }

                await setSetting('max_quota', text, userId);
                await ctx.reply(`✅ Kuota berhasil diupdate!\n\nKuota baru: ${quota} orang`);
                break;

            case 'requirements':
                // Split by newline
                const requirements = text
                    .split('\n')
                    .map(r => r.trim())
                    .filter(r => r.length > 0);

                // Save as JSON array
                const reqJson = stringifyJsonSetting(requirements);
                await setSetting('requirements', reqJson, userId);

                const formatted_req = requirements.map((r, i) => `${i + 1}. ${r}`).join('\n');
                await ctx.reply(
                    `✅ Persyaratan berhasil diupdate!\n\n` +
                    `Persyaratan baru:\n${formatted_req}`
                );
                break;

            default:
                await ctx.reply('❌ Tipe edit tidak dikenali.');
        }

        console.log(`✏️  Admin ${userId} edit ${editType}: ${text.substring(0, 50)}...`);
    } catch (error) {
        console.error(`Error handleEditInput (${editType}):`, error);
        await ctx.reply('❌ Gagal menyimpan perubahan. Silakan coba lagi.');
    }
}
