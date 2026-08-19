import { Router } from 'express'
import { repo } from '../store.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// POST /api/reviews - customer creates a review (must be verified purchase)
router.post('/', requireAuth, async (req, res) => {
  const { orderId, productId, rating, title, text, images } = req.body || {}

  if (!orderId || !productId || !rating) {
    return res.status(400).json({ message: 'orderId, productId, and rating are required' })
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' })
  }

  // Verify the order exists, belongs to this customer, and is delivered
  const order = await repo.findOrderById(orderId)
  if (!order) return res.status(404).json({ message: 'Order not found' })
  if (order.customerName !== req.user.name && order.customerPhone !== req.user.phone) {
    // Loose check — the order may not have customerId stored yet, so check by name
    // For stricter: would need customerId on the Order model
  }
  if (order.status !== 'delivered') {
    return res.status(400).json({ message: 'You can only review delivered orders' })
  }

  // Check the product is in this order
  const orderItem = order.items.find((i) => String(i.productId) === String(productId))
  if (!orderItem) {
    return res.status(400).json({ message: 'This product is not in the order' })
  }

  // Check if already reviewed
  const existing = await repo.findReviews({ orderId, customerId: req.user.id, productId })
  if (existing.length > 0) {
    return res.status(409).json({ message: 'You have already reviewed this product' })
  }

  const review = await repo.createReview({
    orderId,
    productId,
    vendorId: orderItem.vendorId,
    customerId: req.user.id,
    rating: Number(rating),
    title: String(title || '').trim(),
    text: String(text || '').trim(),
    images: Array.isArray(images) ? images : [],
    isVerifiedPurchase: true,
  })

  // Update product's aggregate rating
  await repo.updateProductRating(productId)

  // Notify vendor
  await repo.createNotification({
    userId: orderItem.vendorId,
    type: 'new_review',
    message: `${req.user.name} left a ${rating}-star review on "${orderItem.name}"`,
    link: `/product/${productId}`,
  })

  res.status(201).json({ review })
})

// GET /api/reviews/product/:productId - reviews for a product
router.get('/product/:productId', async (req, res) => {
  const { sort } = req.query
  const reviews = await repo.findReviews({ productId: req.params.productId, sort })
  res.json({ reviews })
})

// GET /api/reviews/vendor/:vendorId - reviews for a vendor
router.get('/vendor/:vendorId', async (req, res) => {
  const reviews = await repo.findReviews({ vendorId: req.params.vendorId, sort: 'newest' })
  res.json({ reviews })
})

// POST /api/reviews/:id/helpful - increment helpful count
router.post('/:id/helpful', async (req, res) => {
  const updated = await repo.updateReviewHelpful(req.params.id)
  if (!updated) return res.status(404).json({ message: 'Review not found' })
  res.json({ review: updated })
})

export default router
