FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "console.log('healthy')" || exit 1

# Run worker
CMD ["node", "worker.js"]
