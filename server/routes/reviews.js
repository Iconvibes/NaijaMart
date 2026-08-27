import { Router } from 'express'
import { repo } from '../store.js'
import { requireAuth } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'

const router = Router()

const reviewRateLimit = rateLimit({ windowMs: 60_000, max: 10, message: 'Too many reviews — please wait a minute' })
const helpfulRateLimit = rateLimit({ windowMs: 60_000, max: 20, message: 'Too many votes — please wait a minute' })

// POST /api/reviews - customer creates a review (must be verified purchase)
router.post('/', requireAuth, reviewRateLimit, async (req, res) => {
  const { orderId, productId, rating, title, text, images } = req.body || {}

  if (!orderId || !productId || !rating) {
    return res.status(400).json({ message: 'orderId, productId, and rating are required' })
  }
  if (rating < 1 || rating > 5 || !Number.isInteger(Number(rating))) {
    return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' })
  }
  // Validate input lengths to prevent abuse
  const reviewTitle = String(title || '').trim()
  const reviewText = String(text || '').trim()
  if (reviewTitle.length > 200) {
    return res.status(400).json({ message: 'Review title must be 200 characters or less' })
  }
  if (reviewText.length > 5000) {
    return res.status(400).json({ message: 'Review text must be 5000 characters or less' })
  }
  // Validate images - only allow /uploads/ paths
  const safeImages = Array.isArray(images) ? images.filter((img) => typeof img === 'string' && img.startsWith('/uploads/')).slice(0, 5) : []

  // Verify the order exists, belongs to this customer, and is delivered
  const order = await repo.findOrderById(orderId)
  if (!order) return res.status(404).json({ message: 'Order not found' })
  if (order.customerId && order.customerId !== req.user.id) {
    return res.status(403).json({ message: 'You can only review your own orders' })
  }
  if (!order.customerId) {
    return res.status(403).json({ message: 'This order cannot be reviewed — it was placed as a guest' })
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
    title: reviewTitle,
    text: reviewText,
    images: safeImages,
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
router.post('/:id/helpful', helpfulRateLimit, async (req, res) => {
  const updated = await repo.updateReviewHelpful(req.params.id)
  if (!updated) return res.status(404).json({ message: 'Review not found' })
  res.json({ review: updated })
})

export default router
