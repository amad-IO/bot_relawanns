// Queue Worker - Processes background jobs from Redis queue
const { dequeueRegistration, moveToFailedQueue, closeConnection } = require('./lib/queue');
const { processRegistration } = require('./lib/process');

// Telegram error notification
async function sendErrorAlert(error, context = '') {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      console.log('⚠️  Telegram credentials not configured, skipping alert');
      return;
    }

    const message = `🚨 *WORKER ERROR ALERT*\n\n` +
      `*Context:* ${context}\n` +
      `*Error:* ${error.message}\n` +
      `*Code:* ${error.code || 'N/A'}\n` +
      `*Time:* ${new Date().toLocaleString('id-ID')}\n\n` +
      `_Worker will attempt to recover or restart..._`;

    // Support multiple chat IDs (comma-separated)
    const chatIds = CHAT_ID.split(',').map(id => id.trim()).filter(id => id);

    await Promise.all(
      chatIds.map(chatId =>
        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown'
          })
        })
      )
    );

    console.log(`📨 Error alert sent to ${chatIds.length} admin(s)`);
  } catch (err) {
    console.error('Failed to send error alert:', err.message);
  }
}

console.log('🚀 Relawanns Queue Worker Started');
console.log('📡 Monitoring Redis queue...');
console.log('🔗 Redis URL:', process.env.REDIS_URL?.slice(0, 30) + '...\n');

let isShuttingDown = false;

async function runWorker() {
  while (!isShuttingDown) {
    let job = null;

    try {
      // Block and wait for job from queue (2s timeout)
      job = await dequeueRegistration(2);

      if (!job) {
        // No jobs in queue, continue waiting
        continue;
      }

      console.log(`\n📝 Processing registration job #${job.id}`);
      console.log(`   Registrant ID: ${job.registrationId}`);
      console.log(`   Event: ${job.eventTitle} - ${job.eventDate}`);
      console.log(`   Files: ${Object.keys(job.files).length} files to process`);
      console.log(`   Timestamp: ${new Date(job.timestamp).toLocaleString('id-ID')}`);

      // Process the registration job
      const startTime = Date.now();
      await processRegistration(job);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`✅ Job #${job.id} completed successfully in ${duration}s\n`);

    } catch (error) {
      console.error(`\n❌ Error processing job ${job?.id || 'unknown'}:`);
      console.error(`   Error: ${error.message}`);

      if (job) {
        console.log(`   Moving job #${job.id} to failed queue...`);
        await moveToFailedQueue(job, error);
      }

      // Wait 5 seconds before continuing (backoff)
      console.log('   Waiting 5s before retry...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log('👋 Worker shutting down gracefully...');
  await closeConnection();
}

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM signal');
  isShuttingDown = true;
});

process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT signal');
  isShuttingDown = true;
});

process.on('uncaughtException', async (error) => {
  console.error('\n💥 Uncaught Exception:', error);
  console.error('Stack:', error.stack);

  // Send alert to admin
  await sendErrorAlert(error, 'Uncaught Exception');

  // Only restart on critical connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    console.error('🔄 Critical connection error - restarting worker...');
    process.exit(1);
  }

  // For other errors, log and continue
  console.log('⚠️  Worker continuing despite error...\n');
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('\n💥 Unhandled Rejection at:', promise);
  console.error('   Reason:', reason);

  if (reason instanceof Error) {
    console.error('   Stack:', reason.stack);
    // Send alert to admin
    await sendErrorAlert(reason, 'Unhandled Rejection');
  }

  // Log but don't crash - let try/catch in main loop handle it
  console.log('⚠️  Worker continuing...\n');
});

// Start the worker
runWorker().catch(error => {
  console.error('\n💥 Fatal worker error:', error);
  process.exit(1);
});
