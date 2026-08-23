# Environment Variables Reference

Every environment variable recognized by NaijaMart.

## Required

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for signing JWT tokens. **Server refuses to start** if missing or set to `naijamart-dev-secret`. Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` | `a3f8b2c1...` (64 hex chars) |

## Optional — Database

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | Falls back to in-memory | MongoDB connection string. If empty or unreachable, the app runs with an in-memory store (data lost on restart). |
| `MONGO_URI` | — | **Deprecated.** Legacy name for `MONGODB_URI`. Still works but prints a deprecation warning. |

## Optional — Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Server listen port. Set to `0` or leave empty → defaults to 5000. |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173` | Comma-separated allowed origins for CORS + WebSocket connections. In production, set to your domain(s). |

## Optional — External Services

| Variable | Default | Description |
|----------|---------|-------------|
| `WHATSAPP_TOKEN` | — | WhatsApp Business API token. If empty, WhatsApp notifications are logged to console with a `wa.me` link. |
| `WHATSAPP_PHONE_NUMBER_ID` | — | WhatsApp Cloud API phone number ID. |
| `RESEND_API_KEY` | — | Resend API key for email delivery. If empty, emails are silently skipped. |
| `EMAIL_FROM` | `NaijaMart <noreply@naijamart.com>` | Sender email address for Resend. Must be from a verified domain in production. |
| `OPENAI_API_KEY` | — | OpenAI API key for AI product generation. If empty, the endpoint returns 503. |

## Environment File

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

**Security notes:**
- Never commit `.env` to version control (it's in `.gitignore`)
- The server validates `JWT_SECRET` at startup and refuses to run with insecure values
- All external service keys are optional — the app works without them
