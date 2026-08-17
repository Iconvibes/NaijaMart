import mongoose from 'mongoose'
import { isMemoryDb } from './db.js'
import User from './models/User.js'
import Product from './models/Product.js'
import Order from './models/Order.js'
import Ledger from './models/Ledger.js'

// In-memory fallback used when MongoDB is unreachable. Kept behind the same
// repository interface so routes never know which store is active.
const mem = { users: [], products: [], orders: [], ledger: [], uid: 0, pid: 0, oid: 0, lid: 0 }

const toUserObj = (u) => ({
  id: String(u.id),
  name: u.name,
  email: u.email,
  passwordHash: u.passwordHash,
  role: u.role,
  logo: u.logo || null,
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
  vendorId: String(p.vendorId),
  createdAt: p.createdAt,
})

const toOrderObj = (o) => ({
  id: String(o.id),
  customerName: o.customerName,
  customerPhone: o.customerPhone,
  customerAddress: o.customerAddress,
  items: o.items.map((i) => ({
    productId: String(i.productId),
    vendorId: String(i.vendorId),
    name: i.name,
    image: i.image || '',
    price: i.price,
    qty: i.qty,
    // Defaults for documents created before fulfilment/refund tracking existed.
    fulfillment: i.fulfillment || 'pending',
    refunded: i.refunded || false,
  })),
  total: o.total,
  // Legacy orders predate payment tracking; treat them as uncaptured cod so
  // nothing becomes payable until the admin explicitly captures them.
  payment: {
    method: o.payment?.method || 'cod',
    status: o.payment?.status || 'pending',
    amount: o.payment?.amount ?? o.total,
    capturedAt: o.payment?.capturedAt || null,
  },
  status: o.status,
  deliveredAt: o.deliveredAt || null,
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

export const repo = {
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

  async findVendors() {
    if (isMemoryDb()) return mem.users.filter((x) => x.role === 'vendor').map(toUserObj)
    const docs = await User.find({ role: 'vendor' }).sort({ name: 1 })
    return docs.map((d) => toUserObj({ ...d.toObject(), id: d._id }))
  },

  async findAllUsers() {
    if (isMemoryDb()) return mem.users.map(toUserObj)
    const docs = await User.find().sort({ createdAt: 1 })
    return docs.map((d) => toUserObj({ ...d.toObject(), id: d._id }))
  },

  async createUser({ name, email, passwordHash, role, logo }) {
    if (isMemoryDb()) {
      const u = {
        id: `u${++mem.uid}`,
        name,
        email: String(email).toLowerCase(),
        passwordHash,
        role: role || 'customer',
        logo: logo || null,
        createdAt: new Date().toISOString(),
      }
      mem.users.push(u)
      return toUserObj(u)
    }
    const doc = await User.create({ name, email, passwordHash, role, logo })
    return toUserObj({ ...doc.toObject(), id: doc._id })
  },

  async findProducts({ vendorId } = {}) {
    if (isMemoryDb()) {
      let list = mem.products
      if (vendorId) list = list.filter((p) => String(p.vendorId) === String(vendorId))
      return list.map(toProductObj)
    }
    const query = vendorId ? { vendorId } : {}
    const docs = await Product.find(query).sort({ _id: 1 })
    return docs.map((d) => toProductObj({ ...d.toObject(), id: d._id }))
  },

  async findProductById(id) {
    if (isMemoryDb()) {
      const p = mem.products.find((x) => String(x.id) === String(id))
      return p ? toProductObj(p) : null
    }
    // Both adapters return null for unresolvable ids - never throw on a
    // malformed ObjectId, so callers can treat "not found" uniformly.
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
    // Only touch the fields provided - a refund must not wipe capturedAt.
    const set = {}
    if (status) set['payment.status'] = status
    if (capturedAt) set['payment.capturedAt'] = capturedAt
    const doc = await Order.findByIdAndUpdate(id, { $set: set }, { new: true })
    return doc ? toOrderObj({ ...doc.toObject(), id: doc._id }) : null
  },

  // Marks specific line items as refunded (or un-refunded). Returns null if
  // the order does not exist.
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

  async findLedgerEntries({ orderId, type } = {}) {
    if (isMemoryDb()) {
      let list = mem.ledger
      if (orderId) list = list.filter((e) => String(e.orderId) === String(orderId))
      if (type) list = list.filter((e) => e.type === type)
      return list.map(toLedgerObj)
    }
    const query = {}
    if (orderId) query.orderId = orderId
    if (type) query.type = type
    const docs = await Ledger.find(query).sort({ createdAt: -1 })
    return docs.map((d) => toLedgerObj({ ...d.toObject(), id: d._id }))
  },

  // Sets the fulfilment state of every line item a vendor owns in an order.
  // Returns null if the order or that vendor's items don't exist.
  async updateOrderFulfillment(id, vendorId, fulfillment) {
    if (isMemoryDb()) {
      const o = mem.orders.find((x) => String(x.id) === String(id))
      if (!o) return null
      const group = o.items.filter((i) => String(i.vendorId) === String(vendorId))
      if (group.length === 0) return null
      for (const i of group) i.fulfillment = fulfillment
      return toOrderObj(o)
    }
    // Unresolvable ids return null, never throw - same contract as the
    // other finders, in both adapters.
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(vendorId)) return null
    const doc = await Order.findOneAndUpdate(
      { _id: id, 'items.vendorId': vendorId },
      { $set: { 'items.$[i].fulfillment': fulfillment } },
      { arrayFilters: [{ 'i.vendorId': vendorId }], new: true }
    )
    return doc ? toOrderObj({ ...doc.toObject(), id: doc._id }) : null
  },
}
