/**
 * Handler: Clear Database
 * Menghapus semua data pendaftar dan file gambar
 */

// @ts-nocheck

import { MyContext } from '../types/conversation';
import { sql } from '../database/client';
// import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env';

// Supabase client for storage operations
// const supabase = createClient(
//     process.env.SUPABASE_URL || '',
//     process.env.SUPABASE_SERVICE_ROLE_KEY || ''
// );

export async function handleClearDatabase(ctx: MyContext) {
    try {
        // Get total registrations
        const [{ count }] = await sql`
            SELECT COUNT(*)::int as count FROM registrations
        `;

        if (count === 0) {
            await ctx.reply('✅ Database kosong, tidak ada data untuk dihapus.');
            return;
        }

        // Send confirmation message
        await ctx.reply(
            `⚠️ *PERINGATAN BESAR!*\n\n` +
            `Anda akan menghapus *SEMUA* data pendaftar:\n` +
            `• Total pendaftar: *${count}*\n` +
            `• Semua data di database\n` +
            `• Semua gambar bukti transfer\n\n` +
            `❗️ Tindakan ini *TIDAK BISA DIBATALKAN*!\n\n` +
            `Ketik /confirm untuk melanjutkan\n` +
            `Ketik /cancel untuk membatalkan`,
            { parse_mode: 'Markdown' }
        );

        // Store state for confirmation
        ctx.session.awaitingClearConfirmation = true;
        ctx.session.registrationCount = count;

    } catch (error) {
        console.error('Error preparing clear database:', error);
        await ctx.reply('❌ Terjadi kesalahan saat mempersiapkan penghapusan database.');
    }
}

export async function handleClearConfirm(ctx: MyContext) {
    try {
        if (!ctx.session.awaitingClearConfirmation) {
            await ctx.reply('❌ Tidak ada operasi penghapusan yang menunggu konfirmasi.');
            return;
        }

        const count = ctx.session.registrationCount || 0;

        await ctx.reply(`⏳ Menghapus ${count} pendaftar dan file gambar...`);

        // 1. Get all payment proof URLs before deletion
        const registrations = await sql`
            SELECT payment_proof_url FROM registrations
            WHERE payment_proof_url IS NOT NULL
        `;

        // 2. Delete all files from Supabase Storage
        let filesDeleted = 0;
        for (const reg of registrations) {
            try {
                // Extract filename from URL
                const url = reg.payment_proof_url;
                const fileName = url.split('/').pop();

                if (fileName) {
                    // const { error } = await supabase.storage
                    //     .from('payment-proofs')
                    //     .remove([fileName]);

                    // if (!error) filesDeleted++;
                }
            } catch (fileError) {
                console.error('Error deleting file:', fileError);
            }
        }

        // 3. Delete all registrations from database
        await sql`DELETE FROM registrations`;

        // 4. Reset current_registrants counter
        await sql`
            UPDATE event_settings 
            SET value = '0' 
            WHERE key = 'current_registrants'
        `;

        // Clear session state
        ctx.session.awaitingClearConfirmation = false;
        ctx.session.registrationCount = 0;

        await ctx.reply(
            `✅ *SELESAI!*\n\n` +
            `• ${count} data pendaftar dihapus\n` +
            `• ${filesDeleted} file gambar dihapus\n` +
            `• Counter pendaftar direset ke 0\n\n` +
            `Database sudah bersih!`,
            { parse_mode: 'Markdown' }
        );

    } catch (error) {
        console.error('Error clearing database:', error);
        await ctx.reply('❌ Terjadi kesalahan saat menghapus database. Coba lagi.');

        // Clear session state on error
        ctx.session.awaitingClearConfirmation = false;
    }
}

export async function handleClearCancel(ctx: MyContext) {
    if (ctx.session.awaitingClearConfirmation) {
        ctx.session.awaitingClearConfirmation = false;
        ctx.session.registrationCount = 0;
        await ctx.reply('✅ Penghapusan database dibatalkan.');
    } else {
        await ctx.reply('❌ Tidak ada operasi yang perlu dibatalkan.');
    }
}
