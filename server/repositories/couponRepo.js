import { isMemoryDb } from '../db.js'
import Coupon from '../models/Coupon.js'
import { mem, toCouponObj } from './helpers.js'

const couponRepo = {
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

  // Compensating operation: decrement coupon usage (rollback on failed order)
  async decrementCouponUsage(id) {
    if (isMemoryDb()) {
      const c = mem.coupons.find((x) => String(x.id) === String(id))
      if (c) c.usedCount = Math.max(0, (c.usedCount || 0) - 1)
      return c ? toCouponObj(c) : null
    }
    const doc = await Coupon.findByIdAndUpdate(
      id,
      { $inc: { usedCount: -1 }, $min: { usedCount: 0 } }, // never go below 0
      { new: true }
    )
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
}

export default couponRepo
