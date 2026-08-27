import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import { connectDb, isMemoryDb } from './db.js'
import { seedIfEmpty } from './seed.js'
import { AppError } from './lib/errors.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import vendorRoutes from './routes/vendors.js'
import orderRoutes from './routes/orders.js'
import ledgerRoutes from './routes/ledger.js'
import uploadRoutes from './routes/upload.js'
import reviewRoutes from './routes/reviews.js'
import notificationRoutes from './routes/notifications.js'
import wishlistRoutes from './routes/wishlist.js'
import followRoutes from './routes/follows.js'
import couponRoutes from './routes/coupons.js'
import withdrawalRoutes from './routes/withdrawals.js'
import analyticsRoutes from './routes/analytics.js'
import aiRoutes from './routes/ai.js'
import { initSocket } from './services/realtime.js'
import { circuits, getDeadLetters } from './lib/resilience.js'

const uploadsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'uploads')

// ─── Validate critical env vars before starting ──────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET || JWT_SECRET === 'naijamart-dev-secret') {
  console.error('\n\x1b[31m⚠  FATAL: JWT_SECRET is missing or still the dev default.\x1b[0m')
  console.error('   Set a strong, unique JWT_SECRET in your .env file.')
  console.error('   Refusing to start to prevent token forgery.\n')
  process.exit(1)
}

// Parse allowed origins from env. Falls back to localhost for development.
// Production: CORS_ORIGINS=https://naijamart.com,https://www.naijamart.com
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173']

const app = express()

// Security headers via helmet (CSP, HSTS, X-Frame-Options, etc.)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind uses inline styles
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'], // product images may be external URLs
      fontSrc: ["'self'"],
      connectSrc: ["'self'", 'ws:', 'wss:'], // Socket.io WebSocket
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // blocks cross-origin images which would break product images
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'deny' },
}))

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, mobile apps)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

// ─── Health check with dependency status ────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const deps = {
    mongodb: { status: 'ok', mode: isMemoryDb() ? 'in-memory' : 'connected' },
    whatsapp: circuits.whatsapp.getStatus(),
    resend: circuits.resend.getStatus(),
    openai: circuits.openai.getStatus(),
    deadLetters: getDeadLetters().length,
  }

  // Check MongoDB connection if using real DB
  if (!isMemoryDb()) {
    try {
      await mongoose.connection.db.admin().ping()
      deps.mongodb.status = 'ok'
    } catch {
      deps.mongodb.status = 'degraded'
    }
  }

  const allHealthy = deps.mongodb.status !== 'degraded' &&
    deps.whatsapp.state !== 'open' &&
    deps.resend.state !== 'open'

  res.status(allHealthy ? 200 : 503).json({
    ok: allHealthy,
    uptime: Math.round(process.uptime()),
    memory: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
    dependencies: deps,
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/vendors', vendorRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/ledger', ledgerRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/wishlist', wishlistRoutes)
app.use('/api/follows', followRoutes)
app.use('/api/coupons', couponRoutes)
app.use('/api/withdrawals', withdrawalRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/ai', aiRoutes)

// uploaded product images are served from server/uploads
app.use('/uploads', express.static(uploadsDir))

// Serve built frontend assets from dist/ (production)
const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
app.use(express.static(distDir, { index: false }))

// SPA fallback: any non-API request that didn't match a static file
// gets index.html so React Router handles the client-side route.
app.get(/^\/(?!api\/|uploads\/).*/, (req, res, next) => {
  res.sendFile(path.join(distDir, 'index.html'), (err) => {
    if (err) next() // dist doesn't exist yet (dev mode) — fall through to 404
  })
})

// API / uploads catch-all for anything still unmatched
app.use((req, res) => res.status(404).json({ message: 'Not found' }))

// Route + multer error handler. Typed errors keep their status; multer upload
// errors stay 400 with their user-facing message; anything else is internal.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message })
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: err.message })
  }
  console.error(err)
  res.status(500).json({ message: 'Something went wrong' })
})

// some environments set PORT=0, which Node reads as "random port" - never allow that
const PORT = Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 5000

const server = app.listen(PORT, async () => {
  await connectDb()
  await seedIfEmpty()
  // Initialize Socket.io for realtime notifications
  initSocket(server)
  console.log(`NaijaMart API running on http://localhost:${PORT}`)
})

// ─── Graceful Shutdown ─────────────────────────────────────────────────────
// On SIGTERM/SIGINT: stop accepting new connections, finish in-flight
// requests, then close the DB connection and exit cleanly.

let isShuttingDown = false

function gracefulShutdown(signal) {
  if (isShuttingDown) return
  isShuttingDown = true
  console.log(`\n${signal} received — shutting down gracefully...`)

  // Stop accepting new connections
  server.close(async () => {
    console.log('HTTP server closed')

    // Close MongoDB connection
    try {
      await mongoose.connection.close()
      console.log('MongoDB connection closed')
    } catch {
      // Already closed or never opened
    }

    console.log('Shutdown complete')
    process.exit(0)
  })

  // Force kill after 10 seconds if something is stuck
  setTimeout(() => {
    console.error('Forced shutdown after timeout')
    process.exit(1)
  }, 10_000).unref()
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Log unhandled rejections instead of crashing
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
  gracefulShutdown('uncaughtException')
})
