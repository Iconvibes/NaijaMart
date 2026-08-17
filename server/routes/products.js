import { Router } from 'express'
import { repo } from '../store.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

const PRODUCT_FIELDS = ['name', 'description', 'category', 'price', 'oldPrice', 'image', 'inStock', 'badge', 'rating', 'reviews']

const pick = (obj, keys) => {
  const out = {}
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k]
  return out
}

// Attach the owning vendor's name + logo to each product
async function withVendor(list) {
  const vendors = new Map((await repo.findVendors()).map((v) => [v.id, v]))
  return list.map((p) => {
    const v = vendors.get(p.vendorId)
    return { ...p, vendor: v ? v.name : 'Unknown Vendor', vendorLogo: v ? v.logo : null }
  })
}

// GET /api/products - public; optional ?vendorId= filter
router.get('/', async (req, res) => {
  const list = await repo.findProducts({ vendorId: req.query.vendorId })
  res.json(await withVendor(list))
})

// GET /api/products/:id - public single product with vendor info
router.get('/:id', async (req, res) => {
  const product = await repo.findProductById(req.params.id)
  if (!product) return res.status(404).json({ message: 'Product not found' })
  const enriched = (await withVendor([product]))[0]
  res.json(enriched)
})

// POST /api/products - vendors and admins create; vendorId comes from the token
router.post('/', requireAuth, requireRole('vendor', 'admin'), async (req, res) => {
  const { name, category, price, image } = req.body || {}
  if (!name || !category || price == null || !image) {
    return res.status(400).json({ message: 'name, category, price and image are required' })
  }
  if (Number(price) <= 0) return res.status(400).json({ message: 'Price must be greater than zero' })

  const data = {
    ...pick(req.body, PRODUCT_FIELDS),
    price: Number(price),
    oldPrice: req.body.oldPrice ? Number(req.body.oldPrice) : null,
    inStock: req.body.inStock !== false,
    vendorId: req.user.id,
  }
  // uploaded image paths saved in MongoDB; first image is the primary one
  if (Array.isArray(req.body.images) && req.body.images.length > 0) {
    data.images = req.body.images.filter((p) => typeof p === 'string' && p.startsWith('/uploads/'))
    data.image = data.images[0]
  }
  const product = await repo.createProduct(data)
  res.status(201).json({ product })
})

// PUT /api/products/:id - owner vendor or admin only
router.put('/:id', requireAuth, requireRole('vendor', 'admin'), async (req, res) => {
  const existing = await repo.findProductById(req.params.id)
  if (!existing) return res.status(404).json({ message: 'Product not found' })
  if (req.user.role !== 'admin' && existing.vendorId !== req.user.id) {
    return res.status(403).json({ message: 'You can only edit your own products' })
  }

  const data = pick(req.body, PRODUCT_FIELDS)
  if (data.oldPrice === null) data.oldPrice = null
  if (data.price !== undefined) data.price = Number(data.price)

  const product = await repo.updateProduct(req.params.id, data)
  res.json({ product })
})

// DELETE /api/products/:id - owner vendor or admin only
router.delete('/:id', requireAuth, requireRole('vendor', 'admin'), async (req, res) => {
  const existing = await repo.findProductById(req.params.id)
  if (!existing) return res.status(404).json({ message: 'Product not found' })
  if (req.user.role !== 'admin' && existing.vendorId !== req.user.id) {
    return res.status(403).json({ message: 'You can only delete your own products' })
  }
  await repo.deleteProduct(req.params.id)
  res.json({ ok: true })
})

export default router
