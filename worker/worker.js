// Queue Worker - Processes background jobs from Redis queue
const { dequeueRegistration, moveToFailedQueue, closeConnection } = require('./lib/queue');
const { processRegistration } = require('./lib/process');

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

process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n💥 Unhandled Rejection at:', promise);
  console.error('   Reason:', reason);
  process.exit(1);
});

// Start the worker
runWorker().catch(error => {
  console.error('\n💥 Fatal worker error:', error);
  process.exit(1);
});
