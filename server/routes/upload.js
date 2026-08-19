import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { AppError } from '../lib/errors.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { requireApprovedVendor } from '../middleware/vendorApproval.js'

const uploadsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

// Maximum disk space for uploads (500 MB). Prevents a runaway upload from
// filling the server disk.
const MAX_UPLOAD_DIR_SIZE_MB = 500

function getDirSizeMB(dir) {
  try {
    let size = 0
    for (const f of fs.readdirSync(dir)) {
      const stat = fs.statSync(path.join(dir, f))
      if (stat.isFile()) size += stat.size
    }
    return size / (1024 * 1024)
  } catch {
    return 0
  }
}

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
    cb(null, `product-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (!ALLOWED_MIMES.has(file.mimetype) || !ALLOWED_EXTS.has(ext)) {
      return cb(new AppError('Only JPG, PNG or WEBP images are allowed', 400), false)
    }
    cb(null, true)
  },
})

const router = Router()

// Disk space check middleware — runs before multer to prevent filling the disk
function checkDiskSpace(req, res, next) {
  if (getDirSizeMB(uploadsDir) > MAX_UPLOAD_DIR_SIZE_MB) {
    return res.status(507).json({
      message: `Upload directory is full (${MAX_UPLOAD_DIR_SIZE_MB}MB limit). Please contact support.`,
    })
  }
  next()
}

// POST /api/upload - authenticated vendors/admins only, up to 4 images
router.post(
  '/',
  requireAuth,
  requireRole('vendor', 'admin'),
  requireApprovedVendor,
  checkDiskSpace,
  upload.array('images', 4),
  (req, res) => {
    const files = req.files || []
    if (files.length === 0) {
      return res.status(400).json({ message: 'No image was uploaded' })
    }
    res.status(201).json({ paths: files.map((f) => `/uploads/${f.filename}`) })
  }
)

export default router
