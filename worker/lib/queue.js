// Queue Helper Module - PostgreSQL-based job queue (replaces Redis)
const postgres = require('postgres');

// Initialize PostgreSQL client (singleton)
let sql = null;

function getClient() {
  if (!sql) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    sql = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }

  return sql;
}

/**
 * Add a registration job to the queue
 * @param {Object} jobData - Job data containing registration info
 * @returns {Promise<string>} Job ID
 */
async function enqueueRegistration(jobData) {
  try {
    const client = getClient();

    const payload = {
      files: jobData.files,
      eventTitle: jobData.eventTitle,
      eventDate: jobData.eventDate,
    };

    const [job] = await client`
      INSERT INTO job_queue (registration_id, payload, status)
      VALUES (
        ${jobData.registrationId},
        ${client.json(payload)},
        'pending'
      )
      RETURNING id, registration_id, created_at
    `;

    console.log(`📋 Job #${job.id} added to queue`);

    return job.id.toString();
  } catch (error) {
    console.error('Failed to enqueue job:', error);
    throw error;
  }
}

/**
 * Get a pending job from the queue (atomic dequeue)
 * Uses FOR UPDATE SKIP LOCKED for concurrent-safe processing
 * @returns {Promise<Object|null>} Job object or null if no pending jobs
 */
async function dequeueRegistration() {
  try {
    const client = getClient();

    const [job] = await client`
      UPDATE job_queue
      SET status = 'processing', started_at = NOW()
      WHERE id = (
        SELECT id FROM job_queue
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `;

    if (!job) {
      return null; // No pending jobs
    }

    // Reconstruct job object to match existing format
    // Safety: handle payload as string or object
    const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
    const result = {
      id: job.id,
      registrationId: job.registration_id,
      files: payload.files,
      eventTitle: payload.eventTitle,
      eventDate: payload.eventDate,
      timestamp: new Date(job.created_at).getTime(),
      retryCount: job.retry_count,
    };

    console.log(`📤 Job #${result.id} dequeued for processing`);

    return result;
  } catch (error) {
    console.error('Failed to dequeue job:', error);
    throw error;
  }
}

/**
 * Mark a job as completed
 * @param {number|string} jobId - Job ID
 */
async function markJobCompleted(jobId) {
  try {
    const client = getClient();

    await client`
      UPDATE job_queue
      SET status = 'completed', completed_at = NOW()
      WHERE id = ${jobId}
    `;

    console.log(`✅ Job #${jobId} marked as completed`);
  } catch (error) {
    console.error('Failed to mark job as completed:', error);
  }
}

/**
 * Mark a job as failed (replaces moveToFailedQueue)
 * @param {Object} job - Failed job object
 * @param {Error} error - Error that caused failure
 */
async function moveToFailedQueue(job, error) {
  try {
    const client = getClient();

    await client`
      UPDATE job_queue
      SET 
        status = 'failed',
        failed_at = NOW(),
        error_message = ${error.message || 'Unknown error'},
        retry_count = retry_count + 1
      WHERE id = ${job.id}
    `;

    console.log(`❌ Job #${job.id} marked as failed`);
  } catch (err) {
    console.error('Failed to mark job as failed:', err);
  }
}

/**
 * Get queue statistics
 * @returns {Promise<Object>} Queue stats
 */
async function getQueueStats() {
  try {
    const client = getClient();

    const [stats] = await client`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM job_queue
    `;

    return {
      pending: parseInt(stats.pending),
      processing: parseInt(stats.processing),
      completed: parseInt(stats.completed),
      failed: parseInt(stats.failed),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Failed to get queue stats:', error);
    return { pending: 0, processing: 0, completed: 0, failed: 0, timestamp: Date.now() };
  }
}

/**
 * Retry a failed job
 * @param {string|number} jobId - Job ID to retry
 */
async function retryFailedJob(jobId) {
  try {
    const client = getClient();

    const [result] = await client`
      UPDATE job_queue
      SET 
        status = 'pending',
        failed_at = NULL,
        error_message = NULL,
        started_at = NULL
      WHERE id = ${jobId} AND status = 'failed'
      RETURNING id
    `;

    if (result) {
      console.log(`🔄 Job #${jobId} moved back to pending for retry`);
      return true;
    }

    console.log(`⚠️ Job #${jobId} not found in failed jobs`);
    return false;
  } catch (error) {
    console.error('Failed to retry job:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
async function closeConnection() {
  if (sql) {
    await sql.end();
    sql = null;
    console.log('🔌 Database connection closed');
  }
}

module.exports = {
  enqueueRegistration,
  dequeueRegistration,
  markJobCompleted,
  moveToFailedQueue,
  getQueueStats,
  retryFailedJob,
  closeConnection,
};
