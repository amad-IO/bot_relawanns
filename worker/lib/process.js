// Processing logic for registration jobs
// Adapted from api/process-registration.js for worker environment

const postgres = require('postgres');
const { createClient } = require('@supabase/supabase-js');
const {
  getOrCreateSheet,
  appendToSheet,
  uploadToDrive,
  getOrCreateFolder,
  extractFileName
} = require('../google-oauth');

// Copy google-oauth.js to worker folder first!
// Or create a require path that works

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.BOT_RELAWANNS_TOKEN;
const CHAT_ID = process.env.NOTIFICATION_CHAT_ID;

/**
 * Process a registration job from the queue
 * @param {Object} job - Job data from queue
 */
async function processRegistration(job) {
  const { registrationId, files, eventTitle, eventDate } = job;

  // Initialize clients
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const sql = postgres(DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    // Get registration data from database
    const [registration] = await sql`
      SELECT * FROM registrations WHERE id = ${registrationId}
    `;

    if (!registration) {
      throw new Error(`Registration ${registrationId} not found in database`);
    }

    console.log(`   Registrant: ${registration.name}`);

    // ===== STEP 1: DOWNLOAD FILES FROM SUPABASE =====
    console.log('   ⬇️  Downloading files from Supabase...');

    const fetch = (await import('node-fetch')).default;

    const [paymentBuffer, tiktokBuffer, instagramBuffer] = await Promise.all([
      fetch(files.paymentProof.url).then(r => r.arrayBuffer()),
      fetch(files.tiktokProof.url).then(r => r.arrayBuffer()),
      fetch(files.instagramProof.url).then(r => r.arrayBuffer())
    ]);

    // ===== STEP 2: UPLOAD TO GOOGLE DRIVE (PARALLEL) =====
    console.log('   ☁️  Uploading to Google Drive...');

    // Normalize event date
    let normalizedDate = eventDate;
    if (eventDate && eventDate.includes(',')) {
      const dateMatch = eventDate.match(/(\d+)\s+(\w+)\s+(\d{4})/);
      if (dateMatch) {
        const monthMap = {
          'Januari': 'Jan', 'Februari': 'Feb', 'Maret': 'Mar',
          'April': 'Apr', 'Mei': 'May', 'Juni': 'Jun',
          'Juli': 'Jul', 'Agustus': 'Aug', 'September': 'Sep',
          'Oktober': 'Okt', 'November': 'Nov', 'Desember': 'Des'
        };
        normalizedDate = `${dateMatch[1]} ${monthMap[dateMatch[2]] || dateMatch[2]} ${dateMatch[3]}`;
      }
    }

    // Truncate title
    const truncatedEventTitle = eventTitle.length > 25
      ? eventTitle.substring(0, 25) + '...'
      : eventTitle;

    const folderName = `${truncatedEventTitle} - ${normalizedDate}`.replace(/[/\\:*?"<>|]/g, '');
    const firstName = registration.name.trim().split(' ')[0];

    // Create folder structure
    const eventFolderId = await getOrCreateFolder(folderName);
    const paymentFolderId = await getOrCreateFolder('Bukti Pembayaran', eventFolderId);
    const sosmedFolderId = await getOrCreateFolder('Screenshot Sosmed', eventFolderId);

    // Upload files in parallel
    const [paymentUrl, tiktokUrl, instagramUrl] = await Promise.all([
      uploadToDrive(
        paymentBuffer,
        `payment_${registration.name}_${Date.now()}.${files.paymentProof.filename.split('.').pop()}`,
        'image/jpeg',
        paymentFolderId
      ),
      uploadToDrive(
        tiktokBuffer,
        `tiktok_${firstName}_${Date.now()}.${files.tiktokProof.filename.split('.').pop()}`,
        'image/jpeg',
        sosmedFolderId
      ),
      uploadToDrive(
        instagramBuffer,
        `instagram_${firstName}_${Date.now()}.${files.instagramProof.filename.split('.').pop()}`,
        'image/jpeg',
        sosmedFolderId
      )
    ]);

    console.log('   ✅ Files uploaded to Drive');

    // ===== STEP 3: UPDATE DATABASE WITH DRIVE URLS =====
    console.log('   💾 Updating database...');

    await sql`
      UPDATE registrations
      SET 
        payment_proof_url = ${paymentUrl},
        tiktok_proof_url = ${tiktokUrl},
        instagram_proof_url = ${instagramUrl}
      WHERE id = ${registrationId}
    `;

    // ===== STEP 4: INSERT TO GOOGLE SPREADSHEET =====
    console.log('   📊 Inserting to Spreadsheet...');

    await getOrCreateSheet(folderName);

    const rowData = [
      registration.name,
      registration.email,
      registration.phone,
      registration.age,
      registration.city,
      registration.instagram_username,
      registration.participation_history === 'yes' ? 'Sudah Pernah' : 'Belum Pernah',
      registration.vest_size,
      paymentUrl,
      tiktokUrl,
      instagramUrl
    ];

    await appendToSheet(folderName, rowData);

    // ===== STEP 5: DELETE FILES FROM SUPABASE STORAGE =====
    console.log('   🗑️  Deleting from Supabase...');

    const filesToDelete = [
      extractFileName(files.paymentProof.url),
      extractFileName(files.tiktokProof.url),
      extractFileName(files.instagramProof.url)
    ];

    await supabase.storage
      .from('registrations')
      .remove(filesToDelete);

    // ===== STEP 6: SEND TEL system (ASYNC) =====
    console.log('   📱 Sending Telegram...');

    await sendTelegramNotification({
      name: registration.name,
      email: registration.email,
      phone: registration.phone,
      age: registration.age,
      city: registration.city,
      instagramUsername: registration.instagram_username,
      participationHistory: registration.participation_history === 'yes' ? 'Sudah Pernah' : 'Belum Pernah',
      vestSize: registration.vest_size,
      paymentProofUrl: paymentUrl,
      registrationNumber: 0, // Can calculate from DB if needed
      maxQuota: 100
    });

    await sql.end();

  } catch (error) {
    await sql.end().catch(() => { });
    throw error;
  }
}

// ===== TELEGRAM NOTIFICATION HELPER =====

async function sendTelegramNotification(data, maxRetries = 3) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('   ⚠️  Telegram credentials not configured');
    return;
  }

  const telegramMessage = `🆕 *PENDAFTAR BARU!*

No. Pendaftar: *${data.registrationNumber} / ${data.maxQuota}*
━━━━━━━━━━━━━━━━━
👤 *DATA DIRI*
Nama: ${data.name}
Email: ${data.email}
WA: ${data.phone}
Usia: ${data.age} th | Kota: ${data.city}
IG: [${data.instagramUsername}](https://instagram.com/${data.instagramUsername.replace('@', '')})
History: ${data.participationHistory || '-'}

👕 *ATRIBUT*
Ukuran Vest: *${data.vestSize}*

📎 *LAMPIRAN*
• [Bukti Bayar (Link)](${data.paymentProofUrl})
━━━━━━━━━━━━━━━━━
📅 ${new Date().toLocaleString('id-ID')}`;

  const chatIds = CHAT_ID.split(',').map(id => id.trim()).filter(id => id);
  const fetch = (await import('node-fetch')).default;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await Promise.all(
        chatIds.map(chatId =>
          fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: telegramMessage,
              parse_mode: 'Markdown',
              disable_web_page_preview: false
            })
          })
            .then(res => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
            })
        )
      );

      console.log(`   ✅ Telegram sent (attempt ${attempt}/${maxRetries})`);
      return;

    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`   ❌ All ${maxRetries} Telegram attempts failed`);
        return;
      }

      const backoffDelay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
}

module.exports = {
  processRegistration
};
