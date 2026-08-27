import mongoose from 'mongoose'
import { isMemoryDb } from './db.js'
import User from './models/User.js'
import Product from './models/Product.js'
import Order from './models/Order.js'
import Ledger from './models/Ledger.js'
import Review from './models/Review.js'
import Notification from './models/Notification.js'
import Wishlist from './models/Wishlist.js'
import Follow from './models/Follow.js'
import Coupon from './models/Coupon.js'
import Withdrawal from './models/Withdrawal.js'

// In-memory fallback used when MongoDB is unreachable. Kept behind the same
// repository interface so routes never know which store is active.
const mem = {
  users: [],
  products: [],
  orders: [],
  ledger: [],
  reviews: [],
  notifications: [],
  wishlist: [],
  follows: [],
  coupons: [],
  withdrawals: [],
  uid: 0,
  pid: 0,
  oid: 0,
  lid: 0,
  rid: 0,
  nid: 0,
  wid: 0,
  fid: 0,
  cid: 0,
  wdid: 0,
}

const toUserObj = (u) => ({
  id: String(u.id),
  name: u.name,
  email: u.email,
  passwordHash: u.passwordHash,
  role: u.role,
  vendorStatus: u.vendorStatus || 'approved',
  logo: u.logo || null,
  banner: u.banner || null,
  bio: u.bio || '',
  whatsapp: u.whatsapp || null,
  slug: u.slug || null,
  createdAt: u.createdAt,
})

const toProductObj = (p) => ({
  id: String(p.id),
  name: p.name,
  description: p.description || '',
  category: p.category,
  price: p.price,
  oldPrice: p.oldPrice ?? null,
  image: p.image,
  images: p.images || [],
  inStock: p.inStock,
  badge: p.badge || null,
  rating: p.rating,
  reviews: p.reviews,
  tags: p.tags || [],
  approved: p.approved !== false,
  vendorId: String(p.vendorId),
  createdAt: p.createdAt,
})

const toOrderObj = (o) => ({
  id: String(o.id),
  customerName: o.customerName,
  customerEmail: o.customerEmail || null,
  customerPhone: o.customerPhone,
  customerAddress: o.customerAddress,
  customerId: o.customerId ? String(o.customerId) : null,
  items: o.items.map((i) => ({
    productId: String(i.productId),
    vendorId: String(i.vendorId),
    name: i.name,
    image: i.image || '',
    price: i.price,
    qty: i.qty,
    fulfillment: i.fulfillment || 'pending',
    refunded: i.refunded || false,
  })),
  total: o.total,
  payment: {
    method: o.payment?.method || 'cod',
    status: o.payment?.status || 'pending',
    amount: o.payment?.amount ?? o.total,
    reference: o.payment?.reference || null,
    capturedAt: o.payment?.capturedAt || null,
  },
  status: o.status,
  deliveredAt: o.deliveredAt || null,
  couponCode: o.couponCode || null,
  discountAmount: o.discountAmount || 0,
  createdAt: o.createdAt,
})

const toLedgerObj = (e) => ({
  id: String(e.id),
  type: e.type,
  orderId: String(e.orderId),
  vendorId: e.vendorId ? String(e.vendorId) : null,
  from: e.from,
  to: e.to,
  amount: e.amount,
  reference: e.reference,
  description: e.description || '',
  actor: e.actor || 'system',
  createdAt: e.createdAt,
})

const toReviewObj = (r) => ({
  id: String(r.id),
  orderId: String(r.orderId),
  productId: String(r.productId),
  vendorId: String(r.vendorId),
  customerId: String(r.customerId),
  rating: r.rating,
  title: r.title || '',
  text: r.text || '',
  images: r.images || [],
  isVerifiedPurchase: r.isVerifiedPurchase !== false,
  helpful: r.helpful || 0,
  createdAt: r.createdAt,
})

const toNotificationObj = (n) => ({
  id: String(n.id),
  userId: String(n.userId),
  type: n.type,
  message: n.message,
  read: n.read || false,
  link: n.link || null,
  createdAt: n.createdAt,
})

const toWishlistObj = (w) => ({
  id: String(w.id),
  customerId: String(w.customerId),
  productId: String(w.productId),
  createdAt: w.createdAt,
})

const toFollowObj = (f) => ({
  id: String(f.id),
  customerId: String(f.customerId),
  vendorId: String(f.vendorId),
  createdAt: f.createdAt,
})

const toCouponObj = (c) => ({
  id: String(c.id),
  code: c.code,
  vendorId: c.vendorId ? String(c.vendorId) : null,
  discountType: c.discountType,
  discountValue: c.discountValue,
  minOrder: c.minOrder || 0,
  maxUses: c.maxUses,
  usedCount: c.usedCount || 0,
  expiresAt: c.expiresAt || null,
  active: c.active !== false,
  createdAt: c.createdAt,
})

const toWithdrawalObj = (w) => ({
  id: String(w.id),
  vendorId: String(w.vendorId),
  amount: w.amount,
  status: w.status || 'requested',
  bankName: w.bankName || '',
  accountNumber: w.accountNumber || '',
  accountName: w.accountName || '',
  processedBy: w.processedBy ? String(w.processedBy) : null,
  processedAt: w.processedAt || null,
  notes: w.notes || '',
  createdAt: w.createdAt,
})

// Generate a URL-friendly slug from a vendor name
const slugify = (name) =>
  String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const repo = {
  // ---- users ----

  async countUsers() {
    if (isMemoryDb()) return mem.users.length
    return User.countDocuments()
  },

  async findUserByEmail(email) {
    const clean = String(email || '').toLowerCase()
    if (isMemoryDb()) {
      const u = mem.users.find((x) => x.email === clean)
      return u ? toUserObj(u) : null
    }
    const doc = await User.findOne({ email: clean })
    return doc ? toUserObj({ ...doc.toObject(), id: doc._id }) : null
  },

  async findUserById(id) {
    if (isMemoryDb()) {
      const u = mem.users.find((x) => String(x.id) === String(id))
      return u ? toUserObj(u) : null
    }
    const doc = await User.findById(id)
    return doc ? toUserObj({ ...doc.toObject(), id: doc._id }) : null
  },

  async findUserBySlug(slug) {
    const clean = String(slug || '').toLowerCase()
    if (isMemoryDb()) {
      const u = mem.users.find((x) => x.slug === clean)
      return u ? toUserObj(u) : null
    }
    const doc = await User.findOne({ slug: clean, role: 'vendor' })
    return doc ? toUserObj({ ...doc.toObject(), id: doc._id }) : null
  },

  async findVendors() {
    if (isMemoryDb()) return mem.users.filter((x) => x.role === 'vendor').map(toUserObj)
    const docs = await User.find({ role: 'vendor' }).sort({ name: 1 })
    return docs.map((d) => toUserObj({ ...d.toObject(), id: d._id }))
  },

  async updateUser(id, data) {
    if (isMemoryDb()) {
      const u = mem.users.find((x) => String(x.id) === String(id))
      if (!u) return null
      Object.assign(u, data)
      return toUserObj(u)
    }
    const doc = await User.findByIdAndUpdate(id, data, { new: true })
    return doc ? toUserObj({ ...doc.toObject(), id: doc._id }) : null
  },

  async findAllUsers() {
    if (isMemoryDb()) return mem.users.map(toUserObj)
    const docs = await User.find().sort({ createdAt: 1 })
    return docs.map((d) => toUserObj({ ...d.toObject(), id: d._id }))
  },

  async createUser({ name, email, passwordHash, role, logo, vendorStatus }) {
    const slug = role === 'vendor' ? slugify(name) : null
    // Ensure slug uniqueness by appending a suffix if needed
    const finalSlug = slug
      ? await (async (base) => {
          let s = base
          let n = 0
          while (await this.findUserBySlug(s)) {
            s = `${base}-${++n}`
          }
          return s
        })(slug)
      : null

    if (isMemoryDb()) {
      const u = {
        id: `u${++mem.uid}`,
        name,
        email: String(email).toLowerCase(),
        passwordHash,
        role: role || 'customer',
        vendorStatus: role === 'vendor' ? (vendorStatus || 'pending') : 'approved',
        logo: logo || null,
        banner: null,
        bio: '',
        whatsapp: null,
        slug: finalSlug,
        createdAt: new Date().toISOString(),
      }
      mem.users.push(u)
      return toUserObj(u)
    }
    const doc = await User.create({
      name,
      email,
      passwordHash,
      role: role || 'customer',
      vendorStatus: role === 'vendor' ? (vendorStatus || 'pending') : 'approved',
      logo: logo || null,
      slug: finalSlug,
    })
    return toUserObj({ ...doc.toObject(), id: doc._id })
  },

  // ---- products ----

  async findProducts({ vendorId, q, minPrice, maxPrice, minRating, sort, page = 1, limit = 24, approved = true } = {}) {
    if (isMemoryDb()) {
      let list = mem.products
      if (approved) list = list.filter((p) => p.approved !== false)
      if (vendorId) list = list.filter((p) => String(p.vendorId) === String(vendorId))
      if (q) {
        const term = String(q).toLowerCase()
        list = list.filter(
          (p) =>
            (p.name || '').toLowerCase().includes(term) ||
            (p.description || '').toLowerCase().includes(term) ||
            (p.category || '').toLowerCase().includes(term) ||
            (p.tags || []).some((t) => t.toLowerCase().includes(term))
        )
      }
      if (minPrice != null) list = list.filter((p) => p.price >= minPrice)
      if (maxPrice != null) list = list.filter((p) => p.price <= maxPrice)
      if (minRating != null) list = list.filter((p) => p.rating >= minRating)
      // sort
      if (sort === 'price_asc') list.sort((a, b) => a.price - b.price)
      else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price)
      else if (sort === 'rating') list.sort((a, b) => b.rating - a.rating)
      else if (sort === 'newest') list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      // pagination
      const total = list.length
      const start = (page - 1) * limit
      list = list.slice(start, start + limit)
      return { products: list.map(toProductObj), total, page, limit }
    }

    const query = {}
    if (approved) query.approved = { $ne: false }
    if (vendorId) query.vendorId = vendorId
    if (minPrice != null || maxPrice != null) {
      query.price = {}
      if (minPrice != null) query.price.$gte = minPrice
      if (maxPrice != null) query.price.$lte = maxPrice
    }
    if (minRating != null) query.rating = { $gte: minRating }

    let sortObj = { createdAt: -1 }
    let useTextScore = false
    if (q) {
      const term = String(q).trim()
      if (term) {
        query.$text = { $search: term }
        useTextScore = true
        sortObj = { score: { $meta: 'textScore' }, createdAt: -1 }
      }
    }

    if (sort === 'price_asc') sortObj = useTextScore ? { score: { $meta: 'textScore' }, price: 1 } : { price: 1 }
    else if (sort === 'price_desc') sortObj = useTextScore ? { score: { $meta: 'textScore' }, price: -1 } : { price: -1 }
    else if (sort === 'rating') sortObj = useTextScore ? { score: { $meta: 'textScore' }, rating: -1 } : { rating: -1 }
    else if (sort === 'newest') sortObj = useTextScore ? { score: { $meta: 'textScore' }, createdAt: -1 } : { createdAt: -1 }

    const skip = (Math.max(1, Number(page) || 1) - 1) * limit
    const total = await Product.countDocuments(query)
    const projection = useTextScore ? { score: { $meta: 'textScore' } } : {}
    const docs = await Product.find(query, projection).sort(sortObj).skip(skip).limit(limit)
    return {
      products: docs.map((d) => toProductObj({ ...d.toObject(), id: d._id })),
      total,
      page: Number(page) || 1,
      limit,
    }
  },

  async findProductById(id) {
    if (isMemoryDb()) {
      const p = mem.products.find((x) => String(x.id) === String(id))
      return p ? toProductObj(p) : null
    }
    if (!mongoose.isValidObjectId(id)) return null
    const doc = await Product.findById(id)
    return doc ? toProductObj({ ...doc.toObject(), id: doc._id }) : null
  },

  async createProduct(data) {
    if (isMemoryDb()) {
      const p = { id: `p${++mem.pid}`, createdAt: new Date().toISOString(), ...data }
      mem.products.push(p)
      return toProductObj(p)
    }
    const doc = await Product.create(data)
    return toProductObj({ ...doc.toObject(), id: doc._id })
  },

  async updateProduct(id, data) {
    if (isMemoryDb()) {
      const p = mem.products.find((x) => String(x.id) === String(id))
      if (!p) return null
      Object.assign(p, data)
      return toProductObj(p)
    }
    const doc = await Product.findByIdAndUpdate(id, data, { new: true })
    return doc ? toProductObj({ ...doc.toObject(), id: doc._id }) : null
  },

  async deleteProduct(id) {
    if (isMemoryDb()) {
      const idx = mem.products.findIndex((x) => String(x.id) === String(id))
      if (idx === -1) return false
      mem.products.splice(idx, 1)
      return true
    }
    const doc = await Product.findByIdAndDelete(id)
    return !!doc
  },

  // ---- orders ----

  async createOrder(data) {
    if (isMemoryDb()) {
      const o = { id: `o${++mem.oid}`, createdAt: new Date().toISOString(), ...data }
      mem.orders.push(o)
      return toOrderObj(o)
    }
    const doc = await Order.create(data)
    return toOrderObj({ ...doc.toObject(), id: doc._id })
  },

  async findOrders({ vendorId, status } = {}) {
    if (isMemoryDb()) {
      let list = mem.orders
      if (vendorId) {
        const vid = String(vendorId)
        list = list.filter((o) => o.items.some((i) => String(i.vendorId) === vid))
      }
      if (status) list = list.filter((o) => o.status === status)
      return list.slice().reverse().map(toOrderObj)
    }
    const query = {}
    if (vendorId) query['items.vendorId'] = vendorId
    if (status) query.status = status
    const docs = await Order.find(query).sort({ createdAt: -1 })
    return docs.map((d) => toOrderObj({ ...d.toObject(), id: d._id }))
  },

  async findOrderById(id) {
    if (isMemoryDb()) {
      const o = mem.orders.find((x) => String(x.id) === String(id))
      return o ? toOrderObj(o) : null
    }
    if (!mongoose.isValidObjectId(id)) return null
    const doc = await Order.findById(id)
    return doc ? toOrderObj({ ...doc.toObject(), id: doc._id }) : null
  },

  async updateOrderStatus(id, status) {
    if (isMemoryDb()) {
      const o = mem.orders.find((x) => String(x.id) === String(id))
      if (!o) return null
      o.status = status
      if (status === 'delivered' && !o.deliveredAt) o.deliveredAt = new Date().toISOString()
      return toOrderObj(o)
    }
    const update = { status, ...(status === 'delivered' ? { deliveredAt: new Date() } : {}) }
    const doc = await Order.findByIdAndUpdate(id, update, { new: true })
    return doc ? toOrderObj({ ...doc.toObject(), id: doc._id }) : null
  },

  async updateOrderPayment(id, { status, capturedAt }) {
    if (isMemoryDb()) {
      const o = mem.orders.find((x) => String(x.id) === String(id))
      if (!o) return null
      o.payment = {
        ...(o.payment || {}),
        ...(status ? { status } : {}),
        ...(capturedAt ? { capturedAt } : {}),
      }
      return toOrderObj(o)
    }
    const set = {}
    if (status) set['payment.status'] = status
    if (capturedAt) set['payment.capturedAt'] = capturedAt
    const doc = await Order.findByIdAndUpdate(id, { $set: set }, { new: true })
    return doc ? toOrderObj({ ...doc.toObject(), id: doc._id }) : null
  },

  async updateOrderRefunded(id, productIds, refunded) {
    const ids = productIds.map(String)
    if (isMemoryDb()) {
      const o = mem.orders.find((x) => String(x.id) === String(id))
      if (!o) return null
      for (const i of o.items) {
        if (ids.includes(String(i.productId))) i.refunded = refunded
      }
      return toOrderObj(o)
    }
    if (!mongoose.isValidObjectId(id)) return null
    const objIds = ids.map((x) => (mongoose.isValidObjectId(x) ? new mongoose.Types.ObjectId(x) : x))
    const doc = await Order.findOneAndUpdate(
      { _id: id },
      { $set: { 'items.$[i].refunded': refunded } },
      { arrayFilters: [{ 'i.productId': { $in: objIds } }], new: true }
    )
    return doc ? toOrderObj({ ...doc.toObject(), id: doc._id }) : null
  },

  // ---- ledger ----

  async createLedgerEntry(data) {
    if (isMemoryDb()) {
      const e = { id: `l${++mem.lid}`, createdAt: new Date().toISOString(), ...data }
      mem.ledger.push(e)
      return toLedgerObj(e)
    }
    const doc = await Ledger.create(data)
    return toLedgerObj({ ...doc.toObject(), id: doc._id })
  },

  async findLedgerEntryByReference(reference) {
    if (isMemoryDb()) {
      const e = mem.ledger.find((x) => x.reference === reference)
      return e ? toLedgerObj(e) : null
    }
    const doc = await Ledger.findOne({ reference })
    return doc ? toLedgerObj({ ...doc.toObject(), id: doc._id }) : null
  },

  async findLedgerEntries({ orderId, type, vendorId } = {}) {
    if (isMemoryDb()) {
      let list = mem.ledger
      if (orderId) list = list.filter((e) => String(e.orderId) === String(orderId))
      if (type) list = list.filter((e) => e.type === type)
      if (vendorId) list = list.filter((e) => String(e.vendorId) === String(vendorId))
      return list.map(toLedgerObj)
    }
    const query = {}
    if (orderId) query.orderId = orderId
    if (type) query.type = type
    if (vendorId) query.vendorId = vendorId
    const docs = await Ledger.find(query).sort({ createdAt: -1 })
    return docs.map((d) => toLedgerObj({ ...d.toObject(), id: d._id }))
  },

  async findVendorPayoutTotal(vendorId) {
    const entries = await this.findLedgerEntries({ vendorId, type: 'payout' })
    return entries.reduce((sum, e) => sum + e.amount, 0)
  },

  // ---- fulfilment ----

  async updateOrderFulfillment(id, vendorId, fulfillment) {
    if (isMemoryDb()) {
      const o = mem.orders.find((x) => String(x.id) === String(id))
      if (!o) return null
      const group = o.items.filter((i) => String(i.vendorId) === String(vendorId))
      if (group.length === 0) return null
      for (const i of group) i.fulfillment = fulfillment
      return toOrderObj(o)
    }
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(vendorId)) return null
    const doc = await Order.findOneAndUpdate(
      { _id: id, 'items.vendorId': vendorId },
      { $set: { 'items.$[i].fulfillment': fulfillment } },
      { arrayFilters: [{ 'i.vendorId': vendorId }], new: true }
    )
    return doc ? toOrderObj({ ...doc.toObject(), id: doc._id }) : null
  },

  // ---- reviews ----

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

  async findReviews({ productId, vendorId, orderId, customerId, sort = 'newest' } = {}) {
    if (isMemoryDb()) {
      let list = mem.reviews
      if (productId) list = list.filter((r) => String(r.productId) === String(productId))
      if (vendorId) list = list.filter((r) => String(r.vendorId) === String(vendorId))
      if (orderId) list = list.filter((r) => String(r.orderId) === String(orderId))
      if (customerId) list = list.filter((r) => String(r.customerId) === String(customerId))
      if (sort === 'helpful') list.sort((a, b) => b.helpful - a.helpful)
      else if (sort === 'media') list = list.filter((r) => (r.images || []).length > 0).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      return list.map(toReviewObj)
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
    const docs = await Review.find(query).sort(sortObj)
    return docs.map((d) => toReviewObj({ ...d.toObject(), id: d._id }))
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

  async updateProductRating(productId) {
    // Recalculate and denormalize average rating + review count
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

  // ---- notifications ----

  async createNotification(data) {
    if (isMemoryDb()) {
      const n = { id: `n${++mem.nid}`, createdAt: new Date().toISOString(), ...data }
      mem.notifications.push(n)
      return toNotificationObj(n)
    }
    const doc = await Notification.create(data)
    return toNotificationObj({ ...doc.toObject(), id: doc._id })
  },

  async findNotifications({ userId, unreadOnly = false } = {}) {
    if (isMemoryDb()) {
      let list = mem.notifications
      if (userId) list = list.filter((n) => String(n.userId) === String(userId))
      if (unreadOnly) list = list.filter((n) => !n.read)
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(toNotificationObj)
    }
    const query = {}
    if (userId) query.userId = userId
    if (unreadOnly) query.read = false
    const docs = await Notification.find(query).sort({ createdAt: -1 })
    return docs.map((d) => toNotificationObj({ ...d.toObject(), id: d._id }))
  },

  async countUnreadNotifications(userId) {
    if (isMemoryDb()) {
      return mem.notifications.filter((n) => String(n.userId) === String(userId) && !n.read).length
    }
    return Notification.countDocuments({ userId, read: false })
  },

  async markNotificationsRead(userId) {
    if (isMemoryDb()) {
      for (const n of mem.notifications) {
        if (String(n.userId) === String(userId)) n.read = true
      }
      return
    }
    await Notification.updateMany({ userId, read: false }, { $set: { read: true } })
  },

  // ---- wishlist ----

  async toggleWishlist(customerId, productId) {
    if (isMemoryDb()) {
      const idx = mem.wishlist.findIndex(
        (w) => String(w.customerId) === String(customerId) && String(w.productId) === String(productId)
      )
      if (idx >= 0) {
        mem.wishlist.splice(idx, 1)
        return { added: false }
      }
      mem.wishlist.push({
        id: `w${++mem.wid}`,
        customerId: String(customerId),
        productId: String(productId),
        createdAt: new Date().toISOString(),
      })
      return { added: true }
    }
    const existing = await Wishlist.findOne({ customerId, productId })
    if (existing) {
      await Wishlist.findByIdAndDelete(existing._id)
      return { added: false }
    }
    await Wishlist.create({ customerId, productId })
    return { added: true }
  },

  async findWishlist(customerId) {
    if (isMemoryDb()) {
      return mem.wishlist
        .filter((w) => String(w.customerId) === String(customerId))
        .map(toWishlistObj)
    }
    const docs = await Wishlist.find({ customerId }).sort({ createdAt: -1 })
    return docs.map((d) => toWishlistObj({ ...d.toObject(), id: d._id }))
  },

  async isWishlisted(customerId, productId) {
    if (isMemoryDb()) {
      return mem.wishlist.some(
        (w) => String(w.customerId) === String(customerId) && String(w.productId) === String(productId)
      )
    }
    const doc = await Wishlist.findOne({ customerId, productId })
    return !!doc
  },

  // ---- follows ----

  async toggleFollow(customerId, vendorId) {
    if (isMemoryDb()) {
      const idx = mem.follows.findIndex(
        (f) => String(f.customerId) === String(customerId) && String(f.vendorId) === String(vendorId)
      )
      if (idx >= 0) {
        mem.follows.splice(idx, 1)
        return { added: false }
      }
      mem.follows.push({
        id: `f${++mem.fid}`,
        customerId: String(customerId),
        vendorId: String(vendorId),
        createdAt: new Date().toISOString(),
      })
      return { added: true }
    }
    const existing = await Follow.findOne({ customerId, vendorId })
    if (existing) {
      await Follow.findByIdAndDelete(existing._id)
      return { added: false }
    }
    await Follow.create({ customerId, vendorId })
    return { added: true }
  },

  async findFollowing(customerId) {
    if (isMemoryDb()) {
      return mem.follows
        .filter((f) => String(f.customerId) === String(customerId))
        .map(toFollowObj)
    }
    const docs = await Follow.find({ customerId }).sort({ createdAt: -1 })
    return docs.map((d) => toFollowObj({ ...d.toObject(), id: d._id }))
  },

  async countFollowers(vendorId) {
    if (isMemoryDb()) {
      return mem.follows.filter((f) => String(f.vendorId) === String(vendorId)).length
    }
    return Follow.countDocuments({ vendorId })
  },

  async isFollowing(customerId, vendorId) {
    if (isMemoryDb()) {
      return mem.follows.some(
        (f) => String(f.customerId) === String(customerId) && String(f.vendorId) === String(vendorId)
      )
    }
    const doc = await Follow.findOne({ customerId, vendorId })
    return !!doc
  },

  // ---- coupons ----

  async createCoupon(data) {
    if (isMemoryDb()) {
      const c = { id: `c${++mem.cid}`, createdAt: new Date().toISOString(), ...data }
      mem.coupons.push(c)
      return toCouponObj(c)
    }
    const doc = await Coupon.create(data)
    return toCouponObj({ ...doc.toObject(), id: doc._id })
  },

  async findCouponByCode(code) {
    const clean = String(code || '').toUpperCase().trim()
    if (isMemoryDb()) {
      const c = mem.coupons.find((x) => x.code === clean)
      return c ? toCouponObj(c) : null
    }
    const doc = await Coupon.findOne({ code: clean })
    return doc ? toCouponObj({ ...doc.toObject(), id: doc._id }) : null
  },

  async findCoupons({ vendorId, active } = {}) {
    if (isMemoryDb()) {
      let list = mem.coupons
      if (vendorId) list = list.filter((c) => String(c.vendorId) === String(vendorId))
      if (active !== undefined) list = list.filter((c) => c.active === active)
      return list.map(toCouponObj)
    }
    const query = {}
    if (vendorId) query.vendorId = vendorId
    if (active !== undefined) query.active = active
    const docs = await Coupon.find(query).sort({ createdAt: -1 })
    return docs.map((d) => toCouponObj({ ...d.toObject(), id: d._id }))
  },

  async incrementCouponUsage(id) {
    if (isMemoryDb()) {
      const c = mem.coupons.find((x) => String(x.id) === String(id))
      if (c) c.usedCount = (c.usedCount || 0) + 1
      return c ? toCouponObj(c) : null
    }
    const doc = await Coupon.findByIdAndUpdate(id, { $inc: { usedCount: 1 } }, { new: true })
    return doc ? toCouponObj({ ...doc.toObject(), id: doc._id }) : null
  },

  // Compare-and-swap increment: only increments if usedCount still matches
  // the expected value. Returns the updated doc on success, null on CAS failure.
  // Prevents two concurrent checkouts from overspending a coupon's maxUses.
  async incrementCouponUsageAtomic(id, expectedUsedCount) {
    if (isMemoryDb()) {
      const c = mem.coupons.find((x) => String(x.id) === String(id))
      if (!c) return null
      if ((c.usedCount || 0) !== expectedUsedCount) return null
      c.usedCount = expectedUsedCount + 1
      return toCouponObj(c)
    }
    const doc = await Coupon.findOneAndUpdate(
      { _id: id, usedCount: expectedUsedCount },
      { $inc: { usedCount: 1 } },
      { new: true }
    )
    return doc ? toCouponObj({ ...doc.toObject(), id: doc._id }) : null
  },

  async toggleCouponActive(id) {
    if (isMemoryDb()) {
      const c = mem.coupons.find((x) => String(x.id) === String(id))
      if (!c) return null
      c.active = !c.active
      return toCouponObj(c)
    }
    const doc = await Coupon.findById(id)
    if (!doc) return null
    doc.active = !doc.active
    await doc.save()
    return toCouponObj({ ...doc.toObject(), id: doc._id })
  },

  // ---- withdrawals ----

  async createWithdrawal(data) {
    if (isMemoryDb()) {
      const w = { id: `wd${++mem.wdid}`, createdAt: new Date().toISOString(), ...data }
      mem.withdrawals.push(w)
      return toWithdrawalObj(w)
    }
    const doc = await Withdrawal.create(data)
    return toWithdrawalObj({ ...doc.toObject(), id: doc._id })
  },

  async findWithdrawals({ vendorId, status } = {}) {
    if (isMemoryDb()) {
      let list = mem.withdrawals
      if (vendorId) list = list.filter((w) => String(w.vendorId) === String(vendorId))
      if (status) list = list.filter((w) => w.status === status)
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(toWithdrawalObj)
    }
    const query = {}
    if (vendorId) query.vendorId = vendorId
    if (status) query.status = status
    const docs = await Withdrawal.find(query).sort({ createdAt: -1 })
    return docs.map((d) => toWithdrawalObj({ ...d.toObject(), id: d._id }))
  },

  async findWithdrawalById(id) {
    if (isMemoryDb()) {
      const w = mem.withdrawals.find((x) => String(x.id) === String(id))
      return w ? toWithdrawalObj(w) : null
    }
    if (!mongoose.isValidObjectId(id)) return null
    const doc = await Withdrawal.findById(id)
    return doc ? toWithdrawalObj({ ...doc.toObject(), id: doc._id }) : null
  },

  async updateWithdrawalStatus(id, { status, processedBy, notes }) {
    if (isMemoryDb()) {
      const w = mem.withdrawals.find((x) => String(x.id) === String(id))
      if (!w) return null
      if (status) w.status = status
      if (processedBy) w.processedBy = String(processedBy)
      if (notes !== undefined) w.notes = notes
      if (status === 'paid' || status === 'approved' || status === 'rejected') w.processedAt = new Date().toISOString()
      return toWithdrawalObj(w)
    }
    const update = {}
    if (status) update.status = status
    if (processedBy) update.processedBy = processedBy
    if (notes !== undefined) update.notes = notes
    if (status === 'paid' || status === 'approved' || status === 'rejected') update.processedAt = new Date()
    const doc = await Withdrawal.findByIdAndUpdate(id, update, { new: true })
    return doc ? toWithdrawalObj({ ...doc.toObject(), id: doc._id }) : null
  },

  async getVendorBalance(vendorId) {
    // Balance = sum of payout entries minus sum of withdrawal paid entries
    const payouts = await this.findLedgerEntries({ vendorId, type: 'payout' })
    const totalPaid = payouts.reduce((sum, e) => sum + e.amount, 0)
    const withdrawals = await this.findWithdrawals({ vendorId, status: 'paid' })
    const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0)
    return totalPaid - totalWithdrawn
  },

  // ---- analytics ----

  async getVendorAnalytics(vendorId, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get orders containing this vendor's products
    const orders = await this.findOrders({ vendorId })
    const recentOrders = orders.filter((o) => new Date(o.createdAt) >= since)

    let totalRevenue = 0
    let totalOrders = recentOrders.length
    const productCounts = {}
    const dailyRevenue = {}

    for (const order of recentOrders) {
      for (const item of order.items) {
        if (String(item.vendorId) === String(vendorId)) {
          const lineTotal = item.price * item.qty
          totalRevenue += lineTotal
          productCounts[item.name] = (productCounts[item.name] || 0) + item.qty
        }
      }
      const day = new Date(order.createdAt).toISOString().split('T')[0]
      dailyRevenue[day] = (dailyRevenue[day] || 0) + order.items
        .filter((i) => String(i.vendorId) === String(vendorId))
        .reduce((s, i) => s + i.price * i.qty, 0)
    }

    const topProducts = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    const revenueData = Object.entries(dailyRevenue)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, revenue]) => ({ date, revenue }))

    return { totalRevenue, totalOrders, topProducts, revenueData }
  },

  async getAdminAnalytics(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const orders = await this.findOrders({})
    const recentOrders = orders.filter((o) => new Date(o.createdAt) >= since)
    const users = await this.findAllUsers()
    const products = await this.findProducts({ approved: false }) // just to count

    let gmv = 0
    let totalCommission = 0
    const vendorRevenue = {}
    const dailyGMV = {}
    const statusCounts = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 }

    for (const order of recentOrders) {
      gmv += order.total
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1

      for (const item of order.items) {
        const vid = String(item.vendorId)
        vendorRevenue[vid] = (vendorRevenue[vid] || 0) + item.price * item.qty
      }

      // Commission is 10% of subtotals per vendor
      const byVendor = {}
      for (const item of order.items) {
        const vid = String(item.vendorId)
        byVendor[vid] = (byVendor[vid] || 0) + item.price * item.qty
      }
      for (const subtotal of Object.values(byVendor)) {
        totalCommission += Math.round(subtotal * 0.1)
      }

      const day = new Date(order.createdAt).toISOString().split('T')[0]
      dailyGMV[day] = (dailyGMV[day] || 0) + order.total
    }

    const topVendors = Object.entries(vendorRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([vendorId, revenue]) => ({ vendorId, revenue }))

    const gmvData = Object.entries(dailyGMV)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, gmv]) => ({ date, gmv }))

    const totalVendors = users.filter((u) => u.role === 'vendor').length
    const totalCustomers = users.filter((u) => u.role === 'customer').length

    return {
      gmv,
      totalCommission,
      totalOrders: recentOrders.length,
      totalVendors,
      totalCustomers,
      topVendors,
      gmvData,
      statusCounts,
    }
  },
}
