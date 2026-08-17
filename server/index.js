import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { connectDb } from './db.js'
import { seedIfEmpty } from './seed.js'
import { AppError } from './lib/errors.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import vendorRoutes from './routes/vendors.js'
import orderRoutes from './routes/orders.js'
import ledgerRoutes from './routes/ledger.js'
import uploadRoutes from './routes/upload.js'

const uploadsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'uploads')

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/vendors', vendorRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/ledger', ledgerRoutes)
app.use('/api/upload', uploadRoutes)

// uploaded product images are served from server/uploads
app.use('/uploads', express.static(uploadsDir))

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

app.listen(PORT, async () => {
  await connectDb()
  await seedIfEmpty()
  console.log(`NaijaMart API running on http://localhost:${PORT}`)
})
