/**
 * DATABASE CLIENT
 * Setup koneksi ke PostgreSQL (Supabase)
 */

import postgres from 'postgres';
import { config } from '../config/env';

// Setup koneksi database dengan connection pooling
export const sql = postgres(config.DATABASE_URL, {
    // Connection pooling untuk performance
    max: 10, // Maksimal 10 koneksi concurrent
    idle_timeout: 20, // Timeout 20 detik untuk idle connections
    connect_timeout: 10, // Timeout 10 detik untuk connect

    // Error handling
    onnotice: () => { }, // Ignore notices
});

/**
 * Test koneksi database
 */
export async function testConnection() {
    try {
        const result = await sql`SELECT NOW() as time`;
        console.log('✅ Database connected:', result[0].time);
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}

/**
 * Helper: Execute query dengan error handling
 */
export async function query<T = any>(
    sqlQuery: TemplateStringsArray,
    ...values: any[]
): Promise<T[]> {
    try {
        // @ts-ignore - Type assertion for postgres library result
        return await sql(sqlQuery, ...values) as T[];
    } catch (error) {
        console.error('❌ Query error:', error);
        throw error;
    }
}

// Test koneksi saat pertama kali import
testConnection();
