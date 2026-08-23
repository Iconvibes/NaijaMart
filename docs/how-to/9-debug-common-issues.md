# Debug Common Issues

Solutions to frequently encountered problems.

## Server Won't Start

### `FATAL: JWT_SECRET is missing or still the dev default`

The server refuses to start without a proper JWT secret.

**Fix:** Set a strong secret in `.env`:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copy the output into `JWT_SECRET=` in `.env`.

### `EADDRINUSE: port 5000 already in use`

Another process is using the port.

**Fix:**
```bash
# Windows
taskkill //F //IM node.exe

# macOS/Linux
killall node
```

### `MONGO_URI is deprecated`

You're using the old env var name.

**Fix:** Rename `MONGO_URI` to `MONGODB_URI` in `.env`. The old name still works but prints a deprecation warning.

## Frontend Issues

### Blank page / white screen

1. Check browser console for errors
2. Verify the API server is running on port 5000
3. Check that Vite proxy is configured (it should proxy `/api` to `localhost:5000`)

### `401 Unauthorized` on every request

1. Token expired (7-day lifetime) — log in again
2. Token corrupted — clear `localStorage` keys `naijamart_token` and `naijamart_user`
3. `JWT_SECRET` changed — all existing tokens become invalid

### Products not loading

1. Check `GET /api/health` — is the server running?
2. Check `GET /api/products` — is it returning data?
3. If in-memory mode, data is lost on server restart — it gets re-seeded on next startup

### CORS errors in browser console

1. Check `CORS_ORIGINS` in `.env` — must include your frontend origin
2. For local dev: `CORS_ORIGINS=http://localhost:5173`
3. For production: `CORS_ORIGINS=https://yourdomain.com`

### Socket.io not connecting

1. Socket.io uses the same CORS whitelist as the API
2. Check `CORS_ORIGINS` includes your domain
3. Production behind nginx/Cloudflare needs WebSocket upgrade headers

## Data Issues

### All data disappears on restart

You're running in in-memory mode (no `MONGODB_URI` set). This is expected.

**Fix:** Set `MONGODB_URI` in `.env` for persistent storage.

### Seeded data not appearing

1. First run with a new database auto-seeds 5 vendors + catalog products
2. If you cleared the database, restart the server to re-seed
3. Seed data includes demo accounts (admin, vendors)

### Products showing wrong prices

Products are priced from the server-side catalog snapshot, not the client. If a vendor changes a product price, existing orders keep the original price.

## Build Issues

### `npm run build` fails

1. Run `npm install` first to ensure all deps are installed
2. Check for syntax errors in JSX files
3. Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`

### Bundle size warning (>500KB)

The main bundle is ~424KB (gzipped ~113KB). Admin/vendor analytics pages are lazy-loaded into separate chunks. If the warning appears, check that lazy loading is working:

```javascript
// Should be lazy-loaded in App.jsx
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'))
```

### Tests fail after changes

```bash
npm test
```

All 35 tests should pass. If a test fails:
1. Check if the failure is in the escrow/money flow tests (most complex)
2. Ensure store methods have both in-memory and MongoDB branches
3. Check that test data setup matches expected state

## Rate Limiting

### `429 Too many requests`

Rate limits are applied per-route:
- Auth (login/register): 15/minute per IP
- Orders: 5/minute per IP
- Reviews: 10/minute per IP
- AI generation: 5/minute per IP

**Fix:** Wait 60 seconds and try again. Or restart the server to clear rate limit buckets.

## See Also

- [Set Up the Development Environment](1-setup-development-environment.md)
- [Environment Variables Reference](../reference/3-environment-variables.md)
