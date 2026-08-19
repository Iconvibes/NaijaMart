import { Router } from 'express'
import { repo } from '../store.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// POST /api/coupons - vendor creates a coupon
router.post('/', requireAuth, requireRole('vendor'), async (req, res) => {
  const { code, discountType, discountValue, minOrder, maxUses, expiresAt } = req.body || {}

  if (!code || !discountType || !discountValue) {
    return res.status(400).json({ message: 'code, discountType, and discountValue are required' })
  }
  if (!['percent', 'fixed'].includes(discountType)) {
    return res.status(400).json({ message: 'discountType must be "percent" or "fixed"' })
  }
  if (discountType === 'percent' && (discountValue < 1 || discountValue > 90)) {
    return res.status(400).json({ message: 'Percent discount must be between 1 and 90' })
  }

  // Check code uniqueness
  const existing = await repo.findCouponByCode(code)
  if (existing) {
    return res.status(409).json({ message: 'A coupon with this code already exists' })
  }

  const coupon = await repo.createCoupon({
    code: String(code).toUpperCase().trim(),
    vendorId: req.user.id,
    discountType,
    discountValue: Number(discountValue),
    minOrder: minOrder ? Number(minOrder) : 0,
    maxUses: maxUses ? Number(maxUses) : null,
    expiresAt: expiresAt || null,
  })

  res.status(201).json({ coupon })
})

// POST /api/coupons/validate - check and apply a coupon
router.post('/validate', async (req, res) => {
  const { code, subtotal } = req.body || {}
  if (!code) return res.status(400).json({ message: 'Coupon code is required' })

  const coupon = await repo.findCouponByCode(code)
  if (!coupon) return res.status(404).json({ message: 'Invalid coupon code' })
  if (!coupon.active) return res.status(400).json({ message: 'This coupon is no longer active' })
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return res.status(400).json({ message: 'This coupon has expired' })
  }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return res.status(400).json({ message: 'This coupon has reached its usage limit' })
  }
  if (coupon.minOrder && (subtotal || 0) < coupon.minOrder) {
    return res.status(400).json({ message: `Minimum order for this coupon is ₦${coupon.minOrder.toLocaleString()}` })
  }

  // Calculate discount
  let discount = 0
  if (coupon.discountType === 'percent') {
    discount = Math.round((subtotal || 0) * coupon.discountValue / 100)
  } else {
    discount = Math.min(coupon.discountValue, subtotal || 0)
  }

  res.json({ coupon: { code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue }, discount })
})

// GET /api/coupons/vendor - vendor's own coupons
router.get('/vendor', requireAuth, requireRole('vendor'), async (req, res) => {
  const coupons = await repo.findCoupons({ vendorId: req.user.id })
  res.json({ coupons })
})

// PATCH /api/coupons/:id/toggle - toggle coupon active status
router.patch('/:id/toggle', requireAuth, requireRole('vendor'), async (req, res) => {
  const coupon = await repo.findCouponByCode // just to check ownership
  const coupons = await repo.findCoupons({ vendorId: req.user.id })
  const owned = coupons.find((c) => c.id === req.params.id)
  if (!owned) return res.status(404).json({ message: 'Coupon not found' })

  const updated = await repo.toggleCouponActive(req.params.id)
  res.json({ coupon: updated })
})

// POST /api/coupons/platform - admin creates platform-wide coupon
router.post('/platform', requireAuth, requireRole('admin'), async (req, res) => {
  const { code, discountType, discountValue, minOrder, maxUses, expiresAt } = req.body || {}

  if (!code || !discountType || !discountValue) {
    return res.status(400).json({ message: 'code, discountType, and discountValue are required' })
  }

  const existing = await repo.findCouponByCode(code)
  if (existing) {
    return res.status(409).json({ message: 'A coupon with this code already exists' })
  }

  const coupon = await repo.createCoupon({
    code: String(code).toUpperCase().trim(),
    vendorId: null, // platform-wide
    discountType,
    discountValue: Number(discountValue),
    minOrder: minOrder ? Number(minOrder) : 0,
    maxUses: maxUses ? Number(maxUses) : null,
    expiresAt: expiresAt || null,
  })

  res.status(201).json({ coupon })
})

export default router
