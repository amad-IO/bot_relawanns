/**
 * EDIT CONVERSATIONS
 * Conversation handlers untuk edit event settings
 * 
 * Pattern yang digunakan (reusable):
 * 1. Prompt user untuk input
 * 2. Wait for user response
 * 3. Validate input
 * 4. Update database
 * 5. Send confirmation
 * 6. Exit conversation
 */

import { MyConversation, MyContext } from '../types/conversation';
import { setSetting } from '../database/queries';
import {
    validateTitle,
    validateLocation,
    validateDate,
    validateQuota,
    validateRequirements,
    validateDescription,
    validateCategory,
} from './validators';

/**
 * CONVERSATION: Edit Judul Event
 * Example pattern untuk semua edit conversations
 */
export async function editTitleConversation(
    conversation: MyConversation,
    ctx: MyContext
) {
    // Step 1: Prompt user untuk input
    await ctx.reply(
        '📝 *Edit Judul Event*\n\n' +
        'Kirim judul baru untuk event.\n\n' +
        '📌 *Ketentuan:*\n' +
        '• Minimal 3 karakter\n' +
        '• Maksimal 100 karakter\n\n' +
        '❌ Ketik /cancel untuk membatalkan.',
        { parse_mode: 'Markdown' }
    );

    // Step 2: Wait for user response
    const { message } = await conversation.wait();

    // Check for cancel command
    if (message?.text === '/cancel') {
        await ctx.reply('❌ Edit judul dibatalkan.');
        return;
    }

    // Get input
    const newTitle = message?.text?.trim();

    if (!newTitle) {
        await ctx.reply('❌ Input tidak valid. Edit dibatalkan.');
        return;
    }

    // Step 3: Validate input
    const validation = validateTitle(newTitle);
    if (!validation.valid) {
        await ctx.reply(`❌ ${validation.error}\n\nEdit dibatalkan.`);
        return;
    }

    // Step 4: Update database
    try {
        await setSetting('event_title', newTitle);

        // Step 5: Send confirmation
        await ctx.reply(
            `✅ *Judul event berhasil diupdate!*\n\n` +
            `📝 Judul baru:\n${newTitle}\n\n` +
            `Gunakan /dashboard untuk melihat semua perubahan.`,
            { parse_mode: 'Markdown' }
        );

        console.log(`✅ Admin ${ctx.from?.id} updated event title to: ${newTitle}`);
    } catch (error) {
        console.error('Error updating title:', error);
        await ctx.reply(
            '❌ *Terjadi kesalahan saat update judul.*\n\n' +
            'Silakan coba lagi atau hubungi developer.',
            { parse_mode: 'Markdown' }
        );
    }
}

/**
 * CONVERSATION: Edit Lokasi Event
 * Same pattern as editTitleConversation
 */
export async function editLocationConversation(
    conversation: MyConversation,
    ctx: MyContext
) {
    await ctx.reply(
        '📍 *Edit Lokasi Event*\n\n' +
        'Kirim lokasi baru untuk event.\n\n' +
        '📌 *Ketentuan:*\n' +
        '• Minimal 3 karakter\n' +
        '• Maksimal 50 karakter\n\n' +
        '❌ Ketik /cancel untuk membatalkan.',
        { parse_mode: 'Markdown' }
    );

    const { message } = await conversation.wait();

    if (message?.text === '/cancel') {
        await ctx.reply('❌ Edit lokasi dibatalkan.');
        return;
    }

    const newLocation = message?.text?.trim();

    if (!newLocation) {
        await ctx.reply('❌ Input tidak valid. Edit dibatalkan.');
        return;
    }

    const validation = validateLocation(newLocation);
    if (!validation.valid) {
        await ctx.reply(`❌ ${validation.error}\n\nEdit dibatalkan.`);
        return;
    }

    // Show success + maps prompt BEFORE saving
    await ctx.reply(
        `✅ *Lokasi event berhasil diupdate!*\n\n` +
        `📍 Lokasi baru:\n${newLocation}\n\n` +
        `Masukkan link maps nya beri tanda "-" jika tidak ada linknya :`,
        { parse_mode: 'Markdown' }
    );

    // Wait for maps link input
    const { message: mapsMessage } = await conversation.wait();

    if (mapsMessage?.text === '/cancel') {
        await ctx.reply('❌ Edit dibatalkan.');
        return;
    }

    let mapsUrl = mapsMessage?.text?.trim() || '';

    // Check if skip
    if (mapsUrl === '-' || mapsUrl.toLowerCase() === 'skip' || mapsUrl === '') {
        mapsUrl = '';
    }

    // Validate URL if provided
    if (mapsUrl && mapsUrl !== '') {
        if (!mapsUrl.startsWith('http://') && !mapsUrl.startsWith('https://')) {
            mapsUrl = ''; // Invalid, use without maps
        }
    }

    try {
        // NOW save both values
        await setSetting('event_location_name', newLocation);
        await setSetting('event_location_maps', mapsUrl || '#');

        // Final confirmation
        if (mapsUrl && mapsUrl !== '') {
            await ctx.reply('✅ Link maps berhasil ditambahkan!\n\nGunakan /dashboard untuk melihat perubahan.');
        } else {
            await ctx.reply('✅ Lokasi tersimpan tanpa link maps.\n\nGunakan /dashboard untuk melihat perubahan.');
        }

        console.log(`✅ Admin ${ctx.from?.id} updated location: ${newLocation}, maps: ${mapsUrl || 'none'}`);
    } catch (error) {
        console.error('Error updating location:', error);
        await ctx.reply(
            '❌ *Terjadi kesalahan saat update lokasi.*\n\n' +
            'Silakan coba lagi atau hubungi developer.',
            { parse_mode: 'Markdown' }
        );
    }
}

/**
 * CONVERSATION: Edit Tanggal Event
 */
export async function editDateConversation(
    conversation: MyConversation,
    ctx: MyContext
) {
    await ctx.reply(
        '📅 *Edit Tanggal Event*\n\n' +
        'Kirim tanggal baru untuk event.\n\n' +
        '📌 *Format: YYYY-MM-DD*\n' +
        'Contoh: 2025-01-20\n\n' +
        '❌ Ketik /cancel untuk membatalkan.',
        { parse_mode: 'Markdown' }
    );

    const { message } = await conversation.wait();

    if (message?.text === '/cancel') {
        await ctx.reply('❌ Edit tanggal dibatalkan.');
        return;
    }

    const newDate = message?.text?.trim();

    if (!newDate) {
        await ctx.reply('❌ Input tidak valid. Edit dibatalkan.');
        return;
    }

    const validation = validateDate(newDate);
    if (!validation.valid) {
        await ctx.reply(`❌ ${validation.error}\n\nEdit dibatalkan.`);
        return;
    }

    try {
        await setSetting('event_date', newDate);

        await ctx.reply(
            `✅ *Tanggal event berhasil diupdate!*\n\n` +
            `📅 Tanggal baru:\n${newDate}\n\n` +
            `Gunakan /dashboard untuk melihat semua perubahan.`,
            { parse_mode: 'Markdown' }
        );

        console.log(`✅ Admin ${ctx.from?.id} updated date to: ${newDate}`);
    } catch (error) {
        console.error('Error updating date:', error);
        await ctx.reply(
            '❌ *Terjadi kesalahan saat update tanggal.*\n\n' +
            'Silakan coba lagi atau hubungi developer.',
            { parse_mode: 'Markdown' }
        );
    }
}

/**
 * CONVERSATION: Edit Kuota Peserta
 */
export async function editQuotaConversation(
    conversation: MyConversation,
    ctx: MyContext
) {
    await ctx.reply(
        '👥 *Edit Kuota Peserta*\n\n' +
        'Kirim jumlah kuota baru untuk event.\n\n' +
        '📌 *Ketentuan:*\n' +
        '• Minimal 1 orang\n' +
        '• Maksimal 1000 orang\n' +
        '• Harus berupa angka bulat\n\n' +
        '❌ Ketik /cancel untuk membatalkan.',
        { parse_mode: 'Markdown' }
    );

    const { message } = await conversation.wait();

    if (message?.text === '/cancel') {
        await ctx.reply('❌ Edit kuota dibatalkan.');
        return;
    }

    const newQuota = message?.text?.trim();

    if (!newQuota) {
        await ctx.reply('❌ Input tidak valid. Edit dibatalkan.');
        return;
    }

    const validation = validateQuota(newQuota);
    if (!validation.valid) {
        await ctx.reply(`❌ ${validation.error}\n\nEdit dibatalkan.`);
        return;
    }

    try {
        await setSetting('max_quota', newQuota);

        await ctx.reply(
            `✅ *Kuota peserta berhasil diupdate!*\n\n` +
            `👥 Kuota baru:\n${newQuota} orang\n\n` +
            `Gunakan /dashboard untuk melihat semua perubahan.`,
            { parse_mode: 'Markdown' }
        );

        console.log(`✅ Admin ${ctx.from?.id} updated quota to: ${newQuota}`);
    } catch (error) {
        console.error('Error updating quota:', error);
        await ctx.reply(
            '❌ *Terjadi kesalahan saat update kuota.*\n\n' +
            'Silakan coba lagi atau hubungi developer.',
            { parse_mode: 'Markdown' }
        );
    }
}

/**
 * CONVERSATION: Edit Persyaratan
 * Special case: multi-line input
 */
export async function editRequirementsConversation(
    conversation: MyConversation,
    ctx: MyContext
) {
    await ctx.reply(
        '📋 *Edit Persyaratan Event*\n\n' +
        'Kirim persyaratan baru untuk event.\n\n' +
        '📌 *Format:*\n' +
        '• Satu persyaratan per baris\n' +
        '• Minimal 3 karakter per item\n' +
        '• Maksimal 10 persyaratan\n\n' +
        '*Contoh:*\n' +
        'WNI berusia minimal 17 tahun\n' +
        'Memiliki komitmen tinggi\n' +
        'Mampu bekerja dalam tim\n\n' +
        '❌ Ketik /cancel untuk membatalkan.',
        { parse_mode: 'Markdown' }
    );

    const { message } = await conversation.wait();

    if (message?.text === '/cancel') {
        await ctx.reply('❌ Edit persyaratan dibatalkan.');
        return;
    }

    const newRequirements = message?.text?.trim();

    if (!newRequirements) {
        await ctx.reply('❌ Input tidak valid. Edit dibatalkan.');
        return;
    }

    const validation = validateRequirements(newRequirements);
    if (!validation.valid) {
        await ctx.reply(`❌ ${validation.error}\n\nEdit dibatalkan.`);
        return;
    }

    try {
        // Convert array to JSON string for database
        const requirementsArray = validation.requirements!;
        const requirementsJson = JSON.stringify(requirementsArray);

        await setSetting('requirements', requirementsJson);

        const formattedList = requirementsArray.map((req, i) => `${i + 1}. ${req}`).join('\n');

        await ctx.reply(
            `✅ *Persyaratan event berhasil diupdate!*\n\n` +
            `📋 Persyaratan baru:\n${formattedList}\n\n` +
            `Gunakan /dashboard untuk melihat semua perubahan.`,
            { parse_mode: 'Markdown' }
        );

        console.log(`✅ Admin ${ctx.from?.id} updated requirements (${requirementsArray.length} items)`);
    } catch (error) {
        console.error('Error updating requirements:', error);
        await ctx.reply(
            '❌ *Terjadi kesalahan saat update persyaratan.*\n\n' +
            'Silakan coba lagi atau hubungi developer.',
            { parse_mode: 'Markdown' }
        );
    }
}

/**
 * CONVERSATION: Edit Deskripsi
 */
export async function editDescriptionConversation(
    conversation: MyConversation,
    ctx: MyContext
) {
    await ctx.reply(
        '📄 *Edit Deskripsi Event*\n\n' +
        'Kirim deskripsi baru untuk event.\n\n' +
        '📌 *Ketentuan:*\n' +
        '• Minimal 10 karakter\n' +
        '• Maksimal 500 karakter\n' +
        '• Bisa multi-line\n\n' +
        '❌ Ketik /cancel untuk membatalkan.',
        { parse_mode: 'Markdown' }
    );

    const { message } = await conversation.wait();

    if (message?.text === '/cancel') {
        await ctx.reply('❌ Edit deskripsi dibatalkan.');
        return;
    }

    const newDescription = message?.text?.trim();

    if (!newDescription) {
        await ctx.reply('❌ Input tidak valid. Edit dibatalkan.');
        return;
    }

    const validation = validateDescription(newDescription);
    if (!validation.valid) {
        await ctx.reply(`❌ ${validation.error}\n\nEdit dibatalkan.`);
        return;
    }

    try {
        await setSetting('event_description', newDescription);

        // Truncate for display if too long
        const displayDesc = newDescription.length > 100
            ? newDescription.substring(0, 100) + '...'
            : newDescription;

        await ctx.reply(
            `✅ *Deskripsi event berhasil diupdate!*\n\n` +
            `📄 Deskripsi baru:\n${displayDesc}\n\n` +
            `Gunakan /dashboard untuk melihat lengkap.`,
            { parse_mode: 'Markdown' }
        );

        console.log(`✅ Admin ${ctx.from?.id} updated description`);
    } catch (error) {
        console.error('Error updating description:', error);
        await ctx.reply(
            '❌ *Terjadi kesalahan saat update deskripsi.*\n\n' +
            'Silakan coba lagi atau hubungi developer.',
            { parse_mode: 'Markdown' }
        );
    }
}

/**
 * CONVERSATION: Edit Kategori
 */
export async function editCategoryConversation(
    conversation: MyConversation,
    ctx: MyContext
) {
    await ctx.reply(
        '🏷️ *Edit Kategori Event*\n\n' +
        'Kirim kategori baru untuk event.\n\n' +
        '📌 *Pilihan kategori:*\n' +
        '• event\n' +
        '• workshop\n' +
        '• seminar\n' +
        '• volunteer\n' +
        '• charity\n\n' +
        '❌ Ketik /cancel untuk membatalkan.',
        { parse_mode: 'Markdown' }
    );

    const { message } = await conversation.wait();

    if (message?.text === '/cancel') {
        await ctx.reply('❌ Edit kategori dibatalkan.');
        return;
    }

    const newCategory = message?.text?.trim();

    if (!newCategory) {
        await ctx.reply('❌ Input tidak valid. Edit dibatalkan.');
        return;
    }

    const validation = validateCategory(newCategory);
    if (!validation.valid) {
        await ctx.reply(`❌ ${validation.error}\n\nEdit dibatalkan.`);
        return;
    }

    try {
        await setSetting('event_category', newCategory.toLowerCase());

        await ctx.reply(
            `✅ *Kategori event berhasil diupdate!*\n\n` +
            `🏷️ Kategori baru:\n${newCategory}\n\n` +
            `Gunakan /dashboard untuk melihat semua perubahan.`,
            { parse_mode: 'Markdown' }
        );

        console.log(`✅ Admin ${ctx.from?.id} updated category to: ${newCategory}`);
    } catch (error) {
        console.error('Error updating category:', error);
        await ctx.reply(
            '❌ *Terjadi kesalahan saat update kategori.*\n\n' +
            'Silakan coba lagi atau hubungi developer.',
            { parse_mode: 'Markdown' }
        );
    }
}

/**
 * CONVERSATION: Edit Link Drive
 */
export async function editDriveLinkConversation(
    conversation: MyConversation,
    ctx: MyContext
) {
    await ctx.reply(
        '🔗 *Edit Link Drive*\n\n' +
        'Kirim URL Google Drive baru untuk halaman Galeri.\n\n' +
        '📌 *Format:*\n' +
        '• URL lengkap Google Drive\n' +
        '• Contoh: https://drive.google.com/drive/folders/xxx\n\n' +
        '❌ Ketik /cancel untuk membatalkan.',
        { parse_mode: 'Markdown' }
    );

    const { message } = await conversation.wait();

    if (message?.text === '/cancel') {
        await ctx.reply('❌ Edit link drive dibatalkan.');
        return;
    }

    const newLink = message?.text?.trim();

    if (!newLink) {
        await ctx.reply('❌ Input tidak valid. Edit dibatalkan.');
        return;
    }

    // Simple URL validation
    if (!newLink.startsWith('http://') && !newLink.startsWith('https://')) {
        await ctx.reply('❌ Link harus diawali dengan http:// atau https://\n\nEdit dibatalkan.');
        return;
    }

    try {
        await setSetting('link_drive', newLink);

        await ctx.reply(
            `✅ Link Drive berhasil diupdate!\n\n` +
            `🔗 Link baru:\n${newLink}\n\n` +
            `Link akan muncul di halaman Galeri.\n\n` +
            `Gunakan /dashboard untuk melihat semua perubahan.`
        );

        console.log(`✅ Admin ${ctx.from?.id} updated drive link to: ${newLink}`);
    } catch (error) {
        console.error('Error updating drive link:', error);
        await ctx.reply(
            '❌ *Terjadi kesalahan saat update link drive.*\n\n' +
            'Silakan coba lagi atau hubungi developer.',
            { parse_mode: 'Markdown' }
        );
    }
}
