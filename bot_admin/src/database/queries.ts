/**
 * DATABASE QUERIES
 * Semua function untuk interaksi dengan database
 * Clean code: Setiap function punya 1 tanggung jawab saja
 */

import { sql } from './client';

// ============================================
// TYPES
// ============================================

export interface EventSetting {
    id: number;
    key: string;
    value: string;
    updated_at: Date;
    updated_by: number | null;
}

export interface Registration {
    id: number;
    name: string;
    age: number;
    phone: string;
    city: string;
    payment_proof_url: string | null;
    telegram_user_id: number;
    telegram_username: string | null;
    status: 'pending' | 'approved' | 'rejected';
    created_at: Date;
}

// ============================================
// EVENT SETTINGS QUERIES
// ============================================

/**
 * Ambil value setting berdasarkan key
 * @param key - Key setting (contoh: 'registration_status')
 * @returns Value setting atau null jika tidak ada
 */
export async function getSetting(key: string): Promise<string | null> {
    const result = await sql<EventSetting[]>`
    SELECT value FROM event_settings
    WHERE key = ${key}
    LIMIT 1
  `;

    return result[0]?.value || null;
}

/**
 * Update atau insert setting baru
 * @param key - Key setting
 * @param value - Value baru
 * @param updatedBy - Telegram user ID yang update
 */
export async function setSetting(
    key: string,
    value: string,
    updatedBy?: number
): Promise<void> {
    await sql`
    INSERT INTO event_settings (key, value, updated_by)
    VALUES (${key}, ${value}, ${updatedBy || null})
    ON CONFLICT (key)
    DO UPDATE SET
      value = ${value},
      updated_by = ${updatedBy || null},
      updated_at = NOW()
  `;
}

/**
 * Ambil semua settings sekaligus (untuk dashboard)
 * @returns Object dengan semua settings
 */
export async function getAllSettings(): Promise<Record<string, string>> {
    const results = await sql<EventSetting[]>`
    SELECT key, value FROM event_settings
  `;

    // Convert array ke object {key: value}
    const settings: Record<string, string> = {};
    for (const row of results) {
        settings[row.key] = row.value;
    }

    return settings;
}

// ============================================
// REGISTRATION QUERIES
// ============================================

/**
 * Ambil jumlah pendaftar saat ini
 * @returns Jumlah pendaftar
 */
export async function getRegistrantCount(): Promise<number> {
    const result = await sql<[{ count: string }]>`
    SELECT COUNT(*) as count FROM registrations
  `;

    return parseInt(result[0].count);
}

/**
 * Increment jumlah pendaftar (dipanggil dari user bot)
 * @returns Jumlah pendaftar setelah increment
 */
export async function incrementRegistrantCount(): Promise<number> {
    const current = await getRegistrantCount();
    await setSetting('current_registrants', (current + 1).toString());
    return current + 1;
}

/**
 * Ambil daftar pendaftar
 * @param limit - Maksimal data yang diambil
 * @param status - Filter berdasarkan status (optional)
 * @returns Array pendaftar
 */
export async function getRegistrants(
    limit: number = 50,
    status?: 'pending' | 'approved' | 'rejected'
): Promise<Registration[]> {
    if (status) {
        return await sql<Registration[]>`
      SELECT * FROM registrations
      WHERE status = ${status}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    }

    return await sql<Registration[]>`
    SELECT * FROM registrations
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

/**
 * Ambil semua pendaftar untuk export
 * @returns Array semua pendaftar
 */
export async function getAllRegistrants(): Promise<Registration[]> {
    return await sql<Registration[]>`
    SELECT * FROM registrations
    ORDER BY created_at DESC
  `;
}

// ============================================
// ADMIN QUERIES
// ============================================

/**
 * Cek apakah user adalah admin
 * @param telegramUserId - Telegram user ID
 * @returns True jika admin, false jika bukan
 */
export async function checkUserIsAdmin(telegramUserId: number): Promise<boolean> {
    const result = await sql<[{ count: string }]>`
    SELECT COUNT(*) as count FROM admin_users
    WHERE telegram_user_id = ${telegramUserId}
  `;

    return parseInt(result[0].count) > 0;
}

/**
 * Tambah admin baru
 * @param telegramUserId - Telegram user ID
 * @param username - Username Telegram
 * @param fullName - Nama lengkap
 */
export async function addAdmin(
    telegramUserId: number,
    username: string,
    fullName: string
): Promise<void> {
    await sql`
    INSERT INTO admin_users (telegram_user_id, username, full_name)
    VALUES (${telegramUserId}, ${username}, ${fullName})
    ON CONFLICT (telegram_user_id) DO NOTHING
  `;
}

// ============================================
// HELPERS
// ============================================

/**
 * Parse JSON value (untuk requirements yang disimpan sebagai JSON string)
 * @param jsonString - String JSON
 * @returns Parsed object atau array
 */
export function parseJsonSetting(jsonString: string): any {
    try {
        return JSON.parse(jsonString);
    } catch {
        return jsonString; // Return as is jika bukan JSON
    }
}

/**
 * Convert array ke JSON string (untuk save requirements)
 * @param data - Array atau object
 * @returns JSON string
 */
export function stringifyJsonSetting(data: any): string {
    return JSON.stringify(data);
}
