import mongoose from 'mongoose'
import { isMemoryDb } from '../db.js'
import User from '../models/User.js'
import { mem, toUserObj, slugify } from './helpers.js'

const userRepo = {
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
    // Ensure slug uniqueness by appending a suffix if needed.
    // Uses `this.findUserBySlug` — works when called as userRepo.createUser().
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
}

export default userRepo
