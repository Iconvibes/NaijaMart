import mongoose from 'mongoose'
import { isMemoryDb } from '../db.js'
import Review from '../models/Review.js'
import Product from '../models/Product.js'
import HelpfulVote from '../models/HelpfulVote.js'
import { mem, toReviewObj } from './helpers.js'

const reviewRepo = {
  async createReview(data) {
    if (isMemoryDb()) {
      const r = { id: `r${++mem.rid}`, createdAt: new Date().toISOString(), ...data }
      mem.reviews.push(r)
      return toReviewObj(r)
    }
    const doc = await Review.create(data)
    return toReviewObj({ ...doc.toObject(), id: doc._id })
  },

  async findReviewById(id) {
    if (isMemoryDb()) {
      const r = mem.reviews.find((x) => String(x.id) === String(id))
      return r ? toReviewObj(r) : null
    }
    if (!mongoose.isValidObjectId(id)) return null
    const doc = await Review.findById(id)
    return doc ? toReviewObj({ ...doc.toObject(), id: doc._id }) : null
  },

  async findReviews({ productId, vendorId, orderId, customerId, sort = 'newest', page = 1, limit = 50 } = {}) {
    if (isMemoryDb()) {
      let list = mem.reviews
      if (productId) list = list.filter((r) => String(r.productId) === String(productId))
      if (vendorId) list = list.filter((r) => String(r.vendorId) === String(vendorId))
      if (orderId) list = list.filter((r) => String(r.orderId) === String(orderId))
      if (customerId) list = list.filter((r) => String(r.customerId) === String(customerId))
      if (sort === 'helpful') list.sort((a, b) => b.helpful - a.helpful)
      else if (sort === 'media') list = list.filter((r) => (r.images || []).length > 0).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      const start = (page - 1) * limit
      return list.slice(start, start + limit).map(toReviewObj)
    }
    const query = {}
    if (productId) query.productId = productId
    if (vendorId) query.vendorId = vendorId
    if (orderId) query.orderId = orderId
    if (customerId) query.customerId = customerId
    let sortObj = { createdAt: -1 }
    if (sort === 'helpful') sortObj = { helpful: -1, createdAt: -1 }
    else if (sort === 'media') {
      query.images = { $exists: true, $not: { $size: 0 } }
    }
    const skip = (Math.max(1, Number(page) || 1) - 1) * limit
    const docs = await Review.find(query).sort(sortObj).skip(skip).limit(limit)
    return docs.map((d) => toReviewObj({ ...d.toObject(), id: d._id }))
  },

  async countReviews({ productId, vendorId, orderId, customerId } = {}) {
    if (isMemoryDb()) {
      let list = mem.reviews
      if (productId) list = list.filter((r) => String(r.productId) === String(productId))
      if (vendorId) list = list.filter((r) => String(r.vendorId) === String(vendorId))
      if (orderId) list = list.filter((r) => String(r.orderId) === String(orderId))
      if (customerId) list = list.filter((r) => String(r.customerId) === String(customerId))
      return list.length
    }
    const query = {}
    if (productId) query.productId = productId
    if (vendorId) query.vendorId = vendorId
    if (orderId) query.orderId = orderId
    if (customerId) query.customerId = customerId
    return Review.countDocuments(query)
  },

  async updateReviewHelpful(id, increment = 1) {
    if (isMemoryDb()) {
      const r = mem.reviews.find((x) => String(x.id) === String(id))
      if (!r) return null
      r.helpful = (r.helpful || 0) + increment
      return toReviewObj(r)
    }
    const doc = await Review.findByIdAndUpdate(id, { $inc: { helpful: increment } }, { new: true })
    return doc ? toReviewObj({ ...doc.toObject(), id: doc._id }) : null
  },

  // ─── Helpful votes (one per user per review) ──────────────────────────────

  async findHelpfulVote(reviewId, userId) {
    if (isMemoryDb()) {
      return mem.helpfulVotes.find(
        (v) => String(v.reviewId) === String(reviewId) && String(v.userId) === String(userId)
      ) || null
    }
    const doc = await HelpfulVote.findOne({ reviewId, userId })
    return doc ? { id: String(doc._id), reviewId: String(doc.reviewId), userId: String(doc.userId) } : null
  },

  async createHelpfulVote(data) {
    if (isMemoryDb()) {
      const v = { id: `h${++mem.hid}`, createdAt: new Date().toISOString(), ...data }
      mem.helpfulVotes.push(v)
      return v
    }
    try {
      const doc = await HelpfulVote.create(data)
      return { id: String(doc._id), reviewId: String(doc.reviewId), userId: String(doc.userId) }
    } catch {
      // Duplicate key error - user already voted
      return null
    }
  },

  // ─── Product rating recalculation ──────────────────────────────────────────

  async updateProductRating(productId) {
    // Recalculate and denormalize average rating + review count on the product
    if (isMemoryDb()) {
      const p = mem.products.find((x) => String(x.id) === String(productId))
      if (!p) return
      const productReviews = mem.reviews.filter((r) => String(r.productId) === String(productId))
      p.reviews = productReviews.length
      p.rating = productReviews.length > 0 ? productReviews.reduce((s, r) => s + r.rating, 0) / productReviews.length : 4.0
      return
    }
    const result = await Review.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId) } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ])
    const avg = result[0]?.avgRating || 4.0
    const count = result[0]?.count || 0
    await Product.findByIdAndUpdate(productId, { rating: Math.round(avg * 10) / 10, reviews: count })
  },
}

export default reviewRepo
