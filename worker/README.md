# Relawanns Queue Worker

Background job processor for registration queue.

## Environment Variables

Create `.env` file with:

```bash
REDIS_URL=rediss://default:...@calm-thrush-58629.upstash.io:6379
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REFRESH_TOKEN=...
GOOGLE_SHEET_ID=...
GOOGLE_DRIVE_FOLDER_ID=...
BOT_RELAWANNS_TOKEN=...
NOTIFICATION_CHAT_ID=...
```

## Docker Deployment

```bash
# Build
docker build -t relawanns-worker .

# Run
docker run -d \
  --name relawanns-queue-worker \
  --restart always \
  --env-file .env \
  --memory="150m" \
  --cpus="0.2" \
  relawanns-worker
```

## docker-compose.yml

```yaml
services:
  queue-worker:
    build: ./worker
    container_name: relawanns-queue-worker
    restart: always
    env_file: .env
    mem_limit: 150m
    cpus: 0.2
```

## Monitoring

```bash
# View logs
docker logs -f relawanns-queue-worker

# Check status
docker ps | grep relawanns-queue-worker

# Resource usage
docker stats relawanns-queue-worker
```
