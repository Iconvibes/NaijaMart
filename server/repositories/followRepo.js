import { isMemoryDb } from '../db.js'
import Follow from '../models/Follow.js'
import { mem, toFollowObj } from './helpers.js'

const followRepo = {
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
}

export default followRepo
