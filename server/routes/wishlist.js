import { Router } from 'express'
import { repo } from '../store.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// POST /api/wishlist/:productId - toggle wishlist
router.post('/:productId', requireAuth, async (req, res) => {
  const product = await repo.findProductById(req.params.productId)
  if (!product) return res.status(404).json({ message: 'Product not found' })

  const result = await repo.toggleWishlist(req.user.id, req.params.productId)
  res.json(result)
})

// GET /api/wishlist - customer's wishlist with product details
router.get('/', requireAuth, async (req, res) => {
  const entries = await repo.findWishlist(req.user.id)
  // Enrich with product data
  const products = []
  for (const entry of entries) {
    const product = await repo.findProductById(entry.productId)
    if (product) products.push(product)
  }
  res.json({ products })
})

export default router
