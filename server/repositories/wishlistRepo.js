import { isMemoryDb } from '../db.js'
import Wishlist from '../models/Wishlist.js'
import { mem, toWishlistObj } from './helpers.js'

const wishlistRepo = {
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
}

export default wishlistRepo
