# Set Up the Development Environment

How to prepare your local machine for NaijaMart development.

## Prerequisites

- **Node.js 20+** (LTS recommended) — `node --version` to verify
- **npm** (comes with Node)
- **MongoDB** (optional) — the app runs fully without it using an in-memory store

## Steps

### 1. Clone and install

```bash
git clone <repo-url> naijamart
cd naijamart
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set these **required** values:

| Variable | What to set |
|----------|------------|
| `JWT_SECRET` | A strong random string. Generate one: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `CORS_ORIGINS` | `http://localhost:5173` for local dev |

Everything else is optional for development. See [Environment Variables Reference](../reference/3-environment-variables.md) for all options.

**The server will refuse to start** if `JWT_SECRET` is missing or still set to `naijamart-dev-secret`.

### 3. Start development servers

```bash
npm run dev:full
```

This runs two processes concurrently:
- **API server** on `http://localhost:5000`
- **Vite dev server** on `http://localhost:5173` (proxies `/api` and `/uploads` to port 5000)

### 4. Verify it works

Open `http://localhost:5173`. You should see the NaijaMart storefront with seeded products.

**Demo accounts** (seeded automatically):

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@naijamart.com` | `admin123` |
| Vendor | `admin@naijamart.com` (any vendor email from seed) | `vendor123` |

### 5. (Optional) Connect MongoDB

If you want persistent data:

1. Install and start MongoDB locally, or use a cloud instance (MongoDB Atlas)
2. Set `MONGODB_URI` in `.env`:
   ```
   MONGODB_URI=mongodb://127.0.0.1:27017/naijamart
   ```
3. Restart the server. On first run with a new database, seed data is created automatically.

Without MongoDB, all data is in-memory and lost on server restart.

## Troubleshooting

**Port 5000 already in use:**
```bash
# Windows
taskkill //F //IM node.exe
# macOS/Linux
killall node
```

**`JWT_SECRET` error on startup:**
Set a real value in `.env`, not the placeholder from `.env.example`.

**MongoDB connection warning:**
This is normal if you don't have MongoDB running. The app falls back to in-memory mode.
