# Deploy to Production with Docker

How to build and run NaijaMart in production using Docker.

## Prerequisites

- Docker installed
- A MongoDB instance (Atlas or self-hosted)
- A domain name (for CORS and WebSocket configuration)

## Steps

### 1. Build the Docker image

```bash
docker build -t naijamart .
```

This runs a multi-stage build:
- **Stage 1** (`build`): Installs all deps, runs `npm run build` to produce `dist/`
- **Stage 2** (`production`): Installs production-only deps, copies `server/` and `dist/`, runs as non-root user `naijamart`

### 2. Run the container

```bash
docker run -d \
  --name naijamart \
  -p 5000:5000 \
  -e JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))") \
  -e MONGODB_URI=mongodb://mongo:27017/naijamart \
  -e CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com \
  -e NODE_ENV=production \
  naijamart
```

### 3. Verify

```bash
curl http://localhost:5000/api/health
```

Should return `{"ok":true, ...}` with dependency status.

The frontend is served from `dist/` at `http://localhost:5000/` with SPA fallback for client-side routes.

### 4. (Optional) Docker Compose

```yaml
version: '3.8'
services:
  mongo:
    image: mongo:7
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - JWT_SECRET=your-secret-here
      - MONGODB_URI=mongodb://mongo:27017/naijamart
      - CORS_ORIGINS=https://yourdomain.com
      - NODE_ENV=production
    depends_on:
      - mongo
    restart: unless-stopped

volumes:
  mongo_data:
```

```bash
docker compose up -d
```

## Production Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes** | Strong random secret. Server won't start without it. |
| `MONGODB_URI` | **Yes** | MongoDB connection string |
| `CORS_ORIGINS` | **Yes** | Comma-separated allowed origins |
| `PORT` | No | Defaults to `5000` |
| `WHATSAPP_TOKEN` | No | WhatsApp Business API token |
| `WHATSAPP_PHONE_NUMBER_ID` | No | WhatsApp phone number ID |
| `RESEND_API_KEY` | No | Resend email API key |
| `EMAIL_FROM` | No | Sender email address |
| `OPENAI_API_KEY` | No | OpenAI API key for product generation |

## Health Check

The container includes a Docker health check that hits `/api/health` every 30 seconds. The endpoint reports:
- MongoDB connection status
- Circuit breaker states (WhatsApp, Resend, OpenAI)
- Dead letter queue size
- Memory usage and uptime

## Graceful Shutdown

The server handles `SIGTERM` and `SIGINT`:
1. Stops accepting new connections
2. Finishes in-flight requests
3. Closes MongoDB connection
4. Exits cleanly

Force kill after 10 seconds if stuck.

## See Also

- [Environment Variables Reference](../reference/3-environment-variables.md)
- [Architecture Overview](../explanation/1-architecture-overview.md)
