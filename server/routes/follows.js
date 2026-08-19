import { Router } from 'express'
import { repo } from '../store.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// POST /api/follows/:vendorId - toggle follow
router.post('/:vendorId', requireAuth, async (req, res) => {
  const vendor = await repo.findUserById(req.params.vendorId)
  if (!vendor || vendor.role !== 'vendor') {
    return res.status(404).json({ message: 'Vendor not found' })
  }
  const result = await repo.toggleFollow(req.user.id, req.params.vendorId)
  res.json(result)
})

// GET /api/follows - customer's followed vendors
router.get('/', requireAuth, async (req, res) => {
  const follows = await repo.findFollowing(req.user.id)
  // Enrich with vendor data
  const vendors = []
  for (const f of follows) {
    const vendor = await repo.findUserById(f.vendorId)
    if (vendor) {
      vendors.push({
        id: vendor.id,
        name: vendor.name,
        logo: vendor.logo,
        slug: vendor.slug,
      })
    }
  }
  res.json({ vendors })
})

export default router
