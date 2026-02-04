FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Health check - verify Redis connection
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "const Redis = require('ioredis'); const redis = new Redis(process.env.REDIS_URL); redis.ping().then(() => { redis.quit(); process.exit(0); }).catch(() => process.exit(1));" || exit 1

# Run worker
CMD ["node", "worker.js"]
