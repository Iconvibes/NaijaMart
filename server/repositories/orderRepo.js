import mongoose from 'mongoose'
import { isMemoryDb } from '../db.js'
import Order from '../models/Order.js'
import { mem, toOrderObj } from './helpers.js'

const orderRepo = {
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

  // ─── Fulfillment ──────────────────────────────────────────────────────────

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
}

export default orderRepo
