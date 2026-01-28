// Queue Helper Module - Redis wrapper for job queue
const Redis = require('ioredis');

const QUEUE_NAME = 'registration-queue';
const FAILED_QUEUE_NAME = 'registration-failed-queue';

// Initialize Redis client
let redis = null;

function getRedisClient() {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is not set');
    }

    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        console.error('Redis connection error:', err.message);
        return true;
      }
    });

    redis.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redis.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
    });
  }

  return redis;
}

/**
 * Add a registration job to the queue
 * @param {Object} jobData - Job data containing registration info
 * @returns {Promise<string>} Job ID
 */
async function enqueueRegistration(jobData) {
  try {
    const client = getRedisClient();

    const job = {
      id: jobData.registrationId,
      registrationId: jobData.registrationId,
      files: jobData.files,
      eventTitle: jobData.eventTitle,
      eventDate: jobData.eventDate,
      timestamp: Date.now(),
      retryCount: 0
    };

    // Push to queue (left push, worker will right pop - FIFO)
    await client.lpush(QUEUE_NAME, JSON.stringify(job));

    console.log(`📋 Job #${job.id} added to queue`);

    return job.id.toString();
  } catch (error) {
    console.error('Failed to enqueue job:', error);
    throw error;
  }
}

/**
 * Get a job from the queue (blocking pop)
 * Worker will call this continuously
 * @param {number} timeout - Timeout in seconds (0 = wait forever)
 * @returns {Promise<Object|null>} Job object or null if timeout
 */
async function dequeueRegistration(timeout = 2) {
  try {
    const client = getRedisClient();

    // BRPOP = Blocking Right Pop (waits for data)
    const result = await client.brpop(QUEUE_NAME, timeout);

    if (!result) {
      return null; // Timeout, no jobs
    }

    const [queueName, jobString] = result;
    const job = JSON.parse(jobString);

    console.log(`📤 Job #${job.id} dequeued for processing`);

    return job;
  } catch (error) {
    console.error('Failed to dequeue job:', error);
    throw error;
  }
}

/**
 * Move failed job to failed queue for later inspection
 * @param {Object} job - Failed job object
 * @param {Error} error - Error that caused failure
 */
async function moveToFailedQueue(job, error) {
  try {
    const client = getRedisClient();

    const failedJob = {
      ...job,
      failedAt: Date.now(),
      error: {
        message: error.message,
        stack: error.stack
      }
    };

    await client.lpush(FAILED_QUEUE_NAME, JSON.stringify(failedJob));

    console.log(`❌ Job #${job.id} moved to failed queue`);
  } catch (err) {
    console.error('Failed to move job to failed queue:', err);
  }
}

/**
 * Get queue statistics
 * @returns {Promise<Object>} Queue stats
 */
async function getQueueStats() {
  try {
    const client = getRedisClient();

    const [pendingCount, failedCount] = await Promise.all([
      client.llen(QUEUE_NAME),
      client.llen(FAILED_QUEUE_NAME)
    ]);

    return {
      pending: pendingCount,
      failed: failedCount,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Failed to get queue stats:', error);
    return { pending: 0, failed: 0, timestamp: Date.now() };
  }
}

/**
 * Retry a failed job
 * @param {string} jobId - Job ID to retry
 */
async function retryFailedJob(jobId) {
  try {
    const client = getRedisClient();

    // Get all failed jobs
    const failedJobs = await client.lrange(FAILED_QUEUE_NAME, 0, -1);

    for (let i = 0; i < failedJobs.length; i++) {
      const job = JSON.parse(failedJobs[i]);

      if (job.id === jobId) {
        // Remove from failed queue
        await client.lrem(FAILED_QUEUE_NAME, 1, failedJobs[i]);

        // Reset retry count and add back to main queue
        job.retryCount = (job.retryCount || 0) + 1;
        delete job.failedAt;
        delete job.error;

        await client.lpush(QUEUE_NAME, JSON.stringify(job));

        console.log(`🔄 Job #${jobId} moved back to queue for retry`);
        return true;
      }
    }

    console.log(`⚠️ Job #${jobId} not found in failed queue`);
    return false;
  } catch (error) {
    console.error('Failed to retry job:', error);
    throw error;
  }
}

/**
 * Close Redis connection
 */
async function closeConnection() {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log('🔌 Redis connection closed');
  }
}

module.exports = {
  enqueueRegistration,
  dequeueRegistration,
  moveToFailedQueue,
  getQueueStats,
  retryFailedJob,
  closeConnection
};
