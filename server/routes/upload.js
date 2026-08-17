import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { AppError } from '../lib/errors.js'

const uploadsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
    cb(null, `product-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
    cb(ok ? null : new AppError('Only JPG, PNG or WEBP images are allowed', 400), ok)
  },
})

const router = Router()

// POST /api/upload - accepts up to 4 images, returns their public paths
router.post('/', upload.array('images', 4), (req, res) => {
  const files = req.files || []
  if (files.length === 0) {
    return res.status(400).json({ message: 'No image was uploaded' })
  }
  res.status(201).json({ paths: files.map((f) => `/uploads/${f.filename}`) })
})

export default router
