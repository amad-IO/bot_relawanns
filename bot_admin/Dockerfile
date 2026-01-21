# Dockerfile for Bot Admin
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port (optional, for health check)
EXPOSE 3000

# Start bot
CMD ["node", "dist/bot.js"]
