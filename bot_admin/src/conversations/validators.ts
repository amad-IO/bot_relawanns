/**
 * INPUT VALIDATORS
 * Validation functions untuk input admin saat edit event
 * 
 * Setiap validator return object dengan:
 * - valid: boolean (true jika valid)
 * - error?: string (pesan error jika tidak valid)
 */

/**
 * Validate judul event
 * Rules: 3-100 karakter
 */
export const validateTitle = (input: string): { valid: boolean; error?: string } => {
    const trimmed = input.trim();

    if (trimmed.length < 3) {
        return { valid: false, error: 'Judul terlalu pendek. Minimal 3 karakter.' };
    }

    if (trimmed.length > 100) {
        return { valid: false, error: 'Judul terlalu panjang. Maksimal 100 karakter.' };
    }

    return { valid: true };
};

/**
 * Validate lokasi event
 * Rules: 3-50 karakter
 */
export const validateLocation = (input: string): { valid: boolean; error?: string } => {
    const trimmed = input.trim();

    if (trimmed.length < 3) {
        return { valid: false, error: 'Lokasi terlalu pendek. Minimal 3 karakter.' };
    }

    if (trimmed.length > 50) {
        return { valid: false, error: 'Lokasi terlalu panjang. Maksimal 50 karakter.' };
    }

    return { valid: true };
};

/**
 * Validate tanggal event
 * Rules: Format YYYY-MM-DD, harus valid date
 */
export const validateDate = (input: string): { valid: boolean; error?: string } => {
    const trimmed = input.trim();

    // Check format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(trimmed)) {
        return {
            valid: false,
            error: 'Format tanggal salah. Gunakan format YYYY-MM-DD\nContoh: 2025-01-20'
        };
    }

    // Check if valid date
    const date = new Date(trimmed);
    if (isNaN(date.getTime())) {
        return { valid: false, error: 'Tanggal tidak valid.' };
    }

    // Check if date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
        return { valid: false, error: 'Tanggal tidak boleh di masa lalu.' };
    }

    return { valid: true };
};

/**
 * Validate kuota peserta
 * Rules: 1-1000, harus integer
 */
export const validateQuota = (input: string): { valid: boolean; error?: string } => {
    const trimmed = input.trim();
    const quota = parseInt(trimmed, 10);

    if (isNaN(quota)) {
        return { valid: false, error: 'Kuota harus berupa angka.' };
    }

    if (!Number.isInteger(quota)) {
        return { valid: false, error: 'Kuota harus berupa bilangan bulat (tanpa koma/titik).' };
    }

    if (quota < 1) {
        return { valid: false, error: 'Kuota minimal 1 orang.' };
    }

    if (quota > 1000) {
        return { valid: false, error: 'Kuota maksimal 1000 orang.' };
    }

    return { valid: true };
};

/**
 * Validate persyaratan event
 * Rules: Bisa multi-line, akan diconvert ke array
 * Setiap requirement minimal 3 karakter
 */
export const validateRequirements = (input: string): { valid: boolean; error?: string; requirements?: string[] } => {
    const trimmed = input.trim();

    if (trimmed.length === 0) {
        return { valid: false, error: 'Persyaratan tidak boleh kosong.' };
    }

    // Split by newline, filter empty lines
    const requirements = trimmed
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    if (requirements.length === 0) {
        return { valid: false, error: 'Persyaratan tidak boleh kosong.' };
    }

    // Check each requirement minimal 3 chars
    for (const req of requirements) {
        if (req.length < 3) {
            return {
                valid: false,
                error: `Persyaratan "${req}" terlalu pendek. Minimal 3 karakter per item.`
            };
        }
    }

    if (requirements.length > 10) {
        return { valid: false, error: 'Maksimal 10 persyaratan.' };
    }

    return { valid: true, requirements };
};

/**
 * Validate deskripsi event
 * Rules: 10-500 karakter
 */
export const validateDescription = (input: string): { valid: boolean; error?: string } => {
    const trimmed = input.trim();

    if (trimmed.length < 10) {
        return { valid: false, error: 'Deskripsi terlalu pendek. Minimal 10 karakter.' };
    }

    if (trimmed.length > 500) {
        return { valid: false, error: 'Deskripsi terlalu panjang. Maksimal 500 karakter.' };
    }

    return { valid: true };
};

/**
 * Validate kategori event
 * Rules: Harus salah satu dari kategori yang tersedia
 */
export const validateCategory = (input: string): { valid: boolean; error?: string } => {
    const trimmed = input.trim().toLowerCase();
    const validCategories = ['event', 'workshop', 'seminar', 'volunteer', 'charity'];

    if (!validCategories.includes(trimmed)) {
        return {
            valid: false,
            error: `Kategori tidak valid. Pilih salah satu:\n${validCategories.join(', ')}`
        };
    }

    return { valid: true };
};
