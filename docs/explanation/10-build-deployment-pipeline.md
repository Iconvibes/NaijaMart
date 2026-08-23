# Build & Deployment Pipeline

How NaijaMart is built, bundled, and deployed.

## Development Flow

```
npm run dev:full
    │
    ├── Vite dev server (port 5173)
    │   ├── Hot Module Replacement (HMR)
    │   ├── Proxies /api → localhost:5000
    │   └── Proxies /uploads → localhost:5000
    │
    └── Express API server (port 5000)
        ├── Serves API routes
        ├── Serves uploaded images
        └── Connects to MongoDB (or in-memory)
```

## Production Build

```bash
npm run build
```

Vite builds the React app into `dist/`:

```
dist/
├── index.html              # Entry point (1.39 KB)
├── assets/
│   ├── index-*.css         # Tailwind CSS (37 KB, gzip: 7.5 KB)
│   ├── index-*.js          # Main bundle (424 KB, gzip: 113 KB)
│   ├── AdminDashboard-*.js # Lazy-loaded admin dashboard (15 KB)
│   ├── AdminAnalytics-*.js # Lazy-loaded admin analytics (36 KB)
│   ├── VendorAnalytics-*.js# Lazy-loaded vendor analytics (23 KB)
│   └── LineChart-*.js      # Shared Recharts chunk (356 KB)
```

### Code Splitting

Three pages are lazy-loaded via `React.lazy()`:

```jsx
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'))
const VendorAnalytics = lazy(() => import('./pages/vendor/VendorAnalytics'))
```

This pulls Recharts (~356KB) out of the main bundle. Regular customers never download it.

## Production Server

After building, `server/index.js` serves everything:

```
Request flow:
/api/*        → Express route handlers
/uploads/*    → express.static (uploaded images)
/*            → express.static (dist/) + SPA fallback
```

### SPA Fallback

```javascript
// Serve built frontend assets from dist/
app.use(express.static(distDir, { index: false }))

// SPA fallback: non-API requests get index.html
app.get(/^\/(?!api\/|uploads\/).*/, (req, res, next) => {
  res.sendFile(path.join(distDir, 'index.html'), (err) => {
    if (err) next()  // dist doesn't exist yet (dev mode)
  })
})
```

This allows direct URL access to client-side routes (`/shop`, `/login`, `/vendor/orders`) — the browser loads `index.html` and React Router handles routing.

## Docker Deployment

### Multi-Stage Build

```dockerfile
# Stage 1: Build frontend
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -S naijamart && adduser -S naijamart -G naijamart
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server/ ./server/
COPY --from=build /app/dist/ ./dist/
USER naijamart
EXPOSE 5000
HEALTHCHECK CMD wget -qO- http://localhost:5000/api/health || exit 1
CMD ["node", "server/index.js"]
```

**Key decisions:**
- Non-root user (`naijamart`) for security
- Production-only deps (`--omit=dev`)
- Health check built in
- Two-stage build keeps the image small (no dev tools, no source maps)

### Running

```bash
docker build -t naijamart .
docker run -p 5000:5000 \
  -e JWT_SECRET=your-secret \
  -e MONGODB_URI=mongodb://mongo:27017/naijamart \
  -e CORS_ORIGINS=https://yourdomain.com \
  naijamart
```

## Environment Requirements

### Development

| Requirement | Required |
|------------|----------|
| Node.js 20+ | Yes |
| MongoDB | No (in-memory fallback) |
| External API keys | No (services silently skip) |

### Production

| Requirement | Required |
|------------|----------|
| Node.js 20+ | Yes |
| MongoDB | Yes (persistent data) |
| JWT_SECRET | Yes (server won't start without it) |
| CORS_ORIGINS | Yes (defaults to localhost only) |
| External API keys | No (optional enhancements) |

## Graceful Shutdown

```javascript
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

function gracefulShutdown(signal) {
  server.close(async () => {
    await mongoose.connection.close()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000)  // Force kill after 10s
}
```

## Why This Architecture?

1. **Single server** — No separate frontend server needed. Express serves both API and static files.
2. **SPA fallback** — Client-side routing works with direct URL access.
3. **Docker-ready** — Multi-stage build produces a minimal production image.
4. **Optional MongoDB** — Demo mode works without any database setup.
5. **Health check** — Docker and load balancers can verify the app is running.
6. **Graceful shutdown** — No data loss on deployment restarts.
