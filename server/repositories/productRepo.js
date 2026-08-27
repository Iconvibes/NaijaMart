import mongoose from 'mongoose'
import { isMemoryDb } from '../db.js'
import Product from '../models/Product.js'
import { mem, toProductObj } from './helpers.js'

const productRepo = {
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

  // Atomically decrement stock. Returns the updated product on success,
  // null if stock is insufficient or product not found.
  async decrementStock(productId, quantity) {
    if (isMemoryDb()) {
      const p = mem.products.find((x) => String(x.id) === String(productId))
      if (!p) return null
      // null stock means unlimited (boolean inStock only)
      if (p.stock == null) return toProductObj(p)
      if (p.stock < quantity) return null
      p.stock -= quantity
      if (p.stock === 0) p.inStock = false
      return toProductObj(p)
    }
    if (!mongoose.isValidObjectId(productId)) return null
    const doc = await Product.findOneAndUpdate(
      { _id: productId, stock: { $gte: quantity } },
      [
        { $set: { stock: { $subtract: ['$stock', quantity] } } },
        { $set: { inStock: { $gt: [{ $subtract: ['$stock', quantity] }, 0] } } },
      ],
      { new: true }
    )
    return doc ? toProductObj({ ...doc.toObject(), id: doc._id }) : null
  },

  // Restore stock (used when an order is cancelled)
  async restoreStock(productId, quantity) {
    if (isMemoryDb()) {
      const p = mem.products.find((x) => String(x.id) === String(productId))
      if (!p) return
      if (p.stock != null) {
        p.stock += quantity
        p.inStock = true
      }
      return
    }
    if (!mongoose.isValidObjectId(productId)) return
    await Product.findByIdAndUpdate(productId, {
      $inc: { stock: quantity },
      $set: { inStock: true },
    })
  },
}

export default productRepo
