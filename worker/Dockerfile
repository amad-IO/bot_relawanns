FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Health check - verify PostgreSQL connection
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "const postgres = require('postgres'); const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 5 }); sql\`SELECT 1\`.then(() => { sql.end(); process.exit(0); }).catch(() => process.exit(1));" || exit 1

# Run worker
CMD ["node", "worker.js"]
