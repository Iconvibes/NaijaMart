import { Router } from 'express'
import { repo } from '../store.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { requireApprovedVendor } from '../middleware/vendorApproval.js'

const router = Router()

const PRODUCT_FIELDS = ['name', 'description', 'category', 'price', 'oldPrice', 'image', 'inStock', 'stock', 'badge', 'rating', 'reviews', 'tags']

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

// GET /api/products/suggest - lightweight autocomplete suggestions
router.get('/suggest', async (req, res) => {
  const q = (req.query.q || '').trim()
  if (q.length < 2) return res.json({ suggestions: [] })

  const result = await repo.findProducts({ q, limit: 24, approved: true })
  const vendors = new Map((await repo.findVendors()).map((v) => [v.id, v]))

  const seen = new Set()
  const suggestions = []
  for (const p of result.products) {
    const key = p.name.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    suggestions.push({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      oldPrice: p.oldPrice,
      image: p.image,
      vendor: vendors.get(p.vendorId)?.name || 'Unknown',
    })
  }

  res.json({ suggestions: suggestions.slice(0, 8) })
})

// GET /api/products - public; supports ?q=, ?category=, ?vendorId=, ?minPrice=, ?maxPrice=, ?minRating=, ?sort=, ?page=, ?limit=
router.get('/', async (req, res) => {
  const { q, category, vendorId, minPrice, maxPrice, minRating, sort, page, limit } = req.query
  const result = await repo.findProducts({
    q,
    category,
    vendorId,
    minPrice: minPrice != null ? Number(minPrice) : undefined,
    maxPrice: maxPrice != null ? Number(maxPrice) : undefined,
    minRating: minRating != null ? Number(minRating) : undefined,
    sort,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 24,
  })

  // Category filter (if provided as query param)
  let products = result.products
  if (category) {
    products = products.filter((p) => p.category === category)
  }

  const enriched = await withVendor(products)
  res.json({ products: enriched, total: result.total, page: result.page, limit: result.limit })
})

// GET /api/products/:id - public single product with vendor info
router.get('/:id', async (req, res) => {
  const product = await repo.findProductById(req.params.id)
  if (!product) return res.status(404).json({ message: 'Product not found' })
  const enriched = (await withVendor([product]))[0]
  res.json(enriched)
})

// POST /api/products - vendors and admins create; vendorId comes from the token
router.post('/', requireAuth, requireRole('vendor', 'admin'), requireApprovedVendor, async (req, res) => {
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
    approved: req.user.role === 'admin', // auto-approve admin-created products
  }
  // uploaded image paths saved in MongoDB; first image is the primary one
  if (Array.isArray(req.body.images) && req.body.images.length > 0) {
    data.images = req.body.images.filter((p) => typeof p === 'string' && p.startsWith('/uploads/'))
    data.image = data.images[0]
  }
  // Tags from AI or manual input
  if (Array.isArray(req.body.tags)) {
    data.tags = req.body.tags.filter((t) => typeof t === 'string').map((t) => t.trim().toLowerCase())
  }
  const product = await repo.createProduct(data)
  res.status(201).json({ product })
})

// POST /api/products/bulk - bulk upload products from CSV-like JSON array
router.post('/bulk', requireAuth, requireRole('vendor'), requireApprovedVendor, async (req, res) => {
  const { products } = req.body || {}
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ message: 'Provide an array of products' })
  }
  if (products.length > 50) {
    return res.status(400).json({ message: 'Maximum 50 products per bulk upload' })
  }

  const created = []
  const errors = []

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    try {
      if (!p.name || !p.category || !p.price || !p.image) {
        throw new Error('Missing required fields (name, category, price, image)')
      }
      const data = {
        name: String(p.name).trim(),
        description: String(p.description || '').trim(),
        category: String(p.category).trim(),
        price: Number(p.price),
        oldPrice: p.oldPrice ? Number(p.oldPrice) : null,
        image: String(p.image),
        images: Array.isArray(p.images) ? p.images : [],
        inStock: p.inStock !== false,
        tags: Array.isArray(p.tags) ? p.tags.map((t) => String(t).trim().toLowerCase()) : [],
        vendorId: req.user.id,
        approved: false,
      }
      const product = await repo.createProduct(data)
      created.push(product)
    } catch (err) {
      errors.push({ index: i, name: p.name || `Item ${i}`, error: err.message })
    }
  }

  res.status(201).json({ created: created.length, errors, products: created })
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
  if (Array.isArray(data.tags)) {
    data.tags = data.tags.filter((t) => typeof t === 'string').map((t) => t.trim().toLowerCase())
  }

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

// PATCH /api/products/:id/approve - admin only: toggle product visibility
router.patch('/:id/approve', requireAuth, requireRole('admin'), async (req, res) => {
  const existing = await repo.findProductById(req.params.id)
  if (!existing) return res.status(404).json({ message: 'Product not found' })

  const updated = await repo.updateProduct(req.params.id, { approved: !existing.approved })

  // Notify vendor
  await repo.createNotification({
    userId: existing.vendorId,
    type: updated.approved ? 'product_approved' : 'product_rejected',
    message: updated.approved
      ? `Your product "${existing.name}" has been approved and is now visible.`
      : `Your product "${existing.name}" has been hidden by an admin.`,
    link: '/vendor/products',
  })

  res.json({ product: updated })
})

export default router
