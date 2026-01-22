/**
 * MONITORING HANDLER
 * Handler untuk monitoring dan export data:
 * - /dashboard: Lihat ringkasan semua settings
 * - /registrants: Lihat daftar pendaftar
 * - /export: Export data pendaftar ke Excel dengan gambar
 */

import { Context } from 'grammy';
import { InputFile } from 'grammy/types';
import {
    getAllSettings,
    getRegistrants,
    getAllRegistrants,
    getRegistrantCount,
    parseJsonSetting
} from '../database/queries';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale/id';
import ExcelJS from 'exceljs';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// DASHBOARD
// ============================================

export async function handleDashboard(ctx: Context) {
    try {
        // Ambil semua settings
        const settings = await getAllSettings();
        const currentCount = await getRegistrantCount();

        // Parse data
        const status = settings.registration_status || 'closed';
        const isOpen = status === 'open';
        const statusEmoji = isOpen ? '✅' : '❌';
        const statusText = isOpen ? 'DIBUKA' : 'DITUTUP';

        const title = settings.event_title || 'Relawanns Event';
        const location = settings.event_location_name || 'Belum diset';
        const mapsUrl = settings.event_location_maps || '#';
        const category = settings.event_category || 'Event';
        const date = settings.event_date || 'Belum diset';
        const maxQuota = settings.max_quota || '0';
        const description = settings.event_description || 'Belum ada deskripsi';

        // Parse requirements (stored as JSON string)
        let requirementsList = 'Belum diset';
        try {
            console.log('Raw event_requirements:', settings.requirements);
            const reqArray = parseJsonSetting(settings.requirements || '[]');
            console.log('Parsed requirements array:', reqArray);
            if (Array.isArray(reqArray) && reqArray.length > 0) {
                requirementsList = reqArray.map((req: string, i: number) => `${i + 1}. ${req}`).join('\n');
                console.log('Formatted requirements list:', requirementsList);
            }
        } catch (e) {
            console.error('Error parsing requirements:', e);
        }

        const message = `📊 *DASHBOARD ADMIN*\n\n` +
            `📝 *Judul Event:*\n${title}\n\n` +
            `📍 *Lokasi:*\n${location}\n\n` +
            `📅 *Tanggal Pelaksanaan:*\n${date}\n\n` +
            `🏷️ *Kategori:*\n${category}\n\n` +
            `👥 *Kuota:*\n${currentCount}/${maxQuota}\n\n` +
            `${statusEmoji} *Status:*\n${statusText}\n\n` +
            `📖 *Deskripsi Acara:*\n${description}\n\n` +
            `📋 *Persyaratan:*\n${requirementsList}`;

        await ctx.reply(message, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Error handleDashboard:', error);
        await ctx.reply('❌ Gagal mengambil dashboard. Silakan coba lagi.');
    }
}

// ============================================
// VIEW REGISTRANTS (Paginated)
// ============================================

export async function handleViewRegistrants(ctx: Context) {
    try {
        const registrants = await getRegistrants(10);

        if (registrants.length === 0) {
            await ctx.reply('📭 Belum ada pendaftar.');
            return;
        }

        // Format list
        let message = `👥 *DAFTAR PENDAFTAR* (10 terakhir)\\n\\n`;

        registrants.forEach((reg: any, index: number) => {
            const num = index + 1;
            const regTime = reg.created_at
                ? format(new Date(reg.created_at), 'dd MMM yyyy, HH:mm', { locale: localeId })
                : 'N/A';

            message += `*${num}. ${reg.name}*\\n`;
            message += `📧 ${reg.email || 'N/A'}\\n`;
            message += `📱 ${reg.phone}\\n`;
            message += `🎂 ${reg.age} tahun\\n`;
            message += `🏙️ ${reg.city}\\n`;
            message += `⏰ ${regTime}\\n\\n`;
        });

        const totalCount = await getRegistrantCount();
        message += `\\n📊 Total: ${totalCount} pendaftar`;

        await ctx.reply(message, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Error handleViewRegistrants:', error);
        await ctx.reply('❌ Gagal mengambil data pendaftar. Silakan coba lagi.');
    }
}

// ============================================
// EXPORT DATA WITH IMAGES (WITHOUT REGISTRATION NUMBER)
// ============================================

export async function handleExport(ctx: Context) {
    try {
        const registrants = await getAllRegistrants();

        if (registrants.length === 0) {
            await ctx.reply('📭 Belum ada data untuk diexport.');
            return;
        }

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Pendaftar');

        // Define columns (WITHOUT registration number as requested)
        worksheet.columns = [
            { header: 'No', key: 'no', width: 5 },
            { header: 'Nama Lengkap', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'No. WhatsApp', key: 'phone', width: 16 },
            { header: 'Usia', key: 'age', width: 6 },
            { header: 'Kota Domisili', key: 'city', width: 20 },
            { header: 'Bukti Transfer', key: 'payment', width: 30 },
            { header: 'Waktu Daftar', key: 'created_at', width: 20 },
        ];

        // Style header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFdc2626' } // Red color
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 25;

        // Add data rows with images
        let currentRow = 2;

        for (let i = 0; i < registrants.length; i++) {
            const reg: any = registrants[i];

            // Row data (without registration number)
            worksheet.addRow({
                no: i + 1,
                name: reg.name || '-',
                email: reg.email || '-',
                phone: reg.phone || '-',
                age: reg.age || '-',
                city: reg.city || '-',
                payment: reg.payment_proof_url ? 'Lihat gambar di kolom' : 'Tidak ada',
                created_at: reg.created_at ? format(new Date(reg.created_at), 'dd MMM yyyy HH:mm', { locale: localeId }) : '-'
            });

            const currentRowObj = worksheet.getRow(currentRow);
            currentRowObj.alignment = { vertical: 'top', wrapText: true };

            // Add image if exists
            if (reg.payment_proof_url) {
                try {
                    // Download image from Supabase
                    const response = await axios.get(reg.payment_proof_url, {
                        responseType: 'arraybuffer',
                        timeout: 10000 // 10 second timeout
                    });

                    const imageBuffer = Buffer.from(response.data) as Buffer;

                    // Add image to workbook
                    const imageId = workbook.addImage({
                        buffer: imageBuffer as any,
                        extension: 'png',
                    });

                    // Embed image in cell (column G = index 6)
                    worksheet.addImage(imageId, {
                        tl: { col: 6, row: currentRow - 1 }, // top-left corner
                        ext: { width: 150, height: 150 } // image size
                    });

                    // Make row taller to fit image
                    currentRowObj.height = 115;
                } catch (imageError) {
                    console.error(`Failed to load image for registrant ${i + 1}:`, imageError);
                    // Continue without image
                }
            }

            currentRow++;
        }

        // Auto-filter
        worksheet.autoFilter = {
            from: 'A1',
            to: 'H1'
        };

        // Auto-fit columns (except image column)
        worksheet.columns.forEach((column, index) => {
            if (index !== 6) { // Not the payment column (G = index 6)
                let maxLength = 10;
                column.eachCell?.({ includeEmpty: false }, (cell) => {
                    const cellValue = cell.value ? cell.value.toString() : '';
                    maxLength = Math.max(maxLength, cellValue.length);
                });
                column.width = Math.min(maxLength + 2, 50);
            }
        });

        // Get event date for filename
        const settings = await getAllSettings();
        const eventDate = settings.event_date;
        const fileName = `Pendaftar_${eventDate ? format(new Date(eventDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}.xlsx`;

        // Save to temp file
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const filePath = path.join(tempDir, fileName);
        await workbook.xlsx.writeFile(filePath);

        // Send file with simplified caption
        await ctx.replyWithDocument(
            new InputFile(filePath, fileName),
            {
                caption: `✅ *Export Selesai!*\n\n📊 Total data: ${registrants.length} pendaftar\n🕒 ${new Date().toLocaleString('id-ID')}`,
                parse_mode: 'Markdown'
            }
        );

        // Delete temp file
        fs.unlinkSync(filePath);

        console.log(`📤 Admin ${ctx.from?.id} export ${registrants.length} data with images`);
    } catch (error) {
        console.error('Error handleExport:', error);
        await ctx.reply('❌ Gagal export data. Silakan coba lagi.');
    }
}

// ============================================
// HELPERS (kept for backward compatibility)
// ============================================

function generateCSV(registrants: any[]): string {
    // Header
    const header = 'No,Nama,Email,Phone,Usia,Kota,Payment URL,Waktu Daftar';

    // Rows
    const rows = registrants.map((reg, index) => {
        return [
            index + 1,
            `"${reg.name}"`,
            `"${reg.email || 'N/A'}"`,
            `"${reg.phone}"`,
            reg.age,
            `"${reg.city}"`,
            `"${reg.payment_proof_url || 'N/A'}"`,
            reg.created_at ? format(new Date(reg.created_at), 'dd/MM/yyyy HH:mm') : 'N/A'
        ].join(',');
    });

    return [header, ...rows].join('\n');
}


