import { Router } from 'express'
import { repo } from '../store.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// GET /api/vendors - public list of marketplace sellers
router.get('/', async (req, res) => {
  const vendors = await repo.findVendors()
  const approved = vendors.filter((v) => v.vendorStatus === 'approved')
  res.json(approved.map((v) => ({ id: v.id, name: v.name, logo: v.logo, slug: v.slug })))
})

// GET /api/vendors/:slug - public storefront page data
router.get('/:slug', async (req, res) => {
  const vendor = await repo.findUserBySlug(req.params.slug)
  if (!vendor || vendor.role !== 'vendor') {
    return res.status(404).json({ message: 'Vendor not found' })
  }
  // Only show approved vendors publicly
  if (vendor.vendorStatus !== 'approved') {
    return res.status(404).json({ message: 'Vendor not found' })
  }

  const products = await repo.findProducts({ vendorId: vendor.id, approved: true })
  const reviews = await repo.findReviews({ vendorId: vendor.id, sort: 'newest' })
  const followerCount = await repo.countFollowers(vendor.id)

  res.json({
    vendor: {
      id: vendor.id,
      name: vendor.name,
      logo: vendor.logo,
      banner: vendor.banner,
      bio: vendor.bio,
      slug: vendor.slug,
      rating: vendor.rating || 4.0,
      totalProducts: products.total || products.length,
      followerCount,
      createdAt: vendor.createdAt,
    },
    products: products.products || products,
    reviews: reviews.slice(0, 10),
  })
})

// PATCH /api/vendors/:id/approve - admin only: approve a vendor application
router.patch('/:id/approve', requireAuth, requireRole('admin'), async (req, res) => {
  const vendor = await repo.findUserById(req.params.id)
  if (!vendor) return res.status(404).json({ message: 'Vendor not found' })
  if (vendor.role !== 'vendor') return res.status(400).json({ message: 'This user is not a vendor' })

  const updated = await repo.updateUser(req.params.id, { vendorStatus: 'approved' })

  // Notify the vendor
  await repo.createNotification({
    userId: req.params.id,
    type: 'vendor_approved',
    message: 'Your vendor application has been approved! You can now start listing products.',
    link: '/vendor/products',
  })

  res.json({ vendor: updated })
})

// PATCH /api/vendors/:id/reject - admin only: reject a vendor application
router.patch('/:id/reject', requireAuth, requireRole('admin'), async (req, res) => {
  const vendor = await repo.findUserById(req.params.id)
  if (!vendor) return res.status(404).json({ message: 'Vendor not found' })
  if (vendor.role !== 'vendor') return res.status(400).json({ message: 'This user is not a vendor' })

  const updated = await repo.updateUser(req.params.id, { vendorStatus: 'rejected' })

  await repo.createNotification({
    userId: req.params.id,
    type: 'vendor_rejected',
    message: 'Your vendor application was not approved. Please contact support for details.',
  })

  res.json({ vendor: updated })
})

export default router
