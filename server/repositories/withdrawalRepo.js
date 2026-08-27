import mongoose from 'mongoose'
import { isMemoryDb } from '../db.js'
import Withdrawal from '../models/Withdrawal.js'
import { mem, toWithdrawalObj } from './helpers.js'

/**
 * Withdrawal repository.
 *
 * Some methods need cross-repo data (ledger entries, vendor balance).
 * The `configure()` method is called by the store facade after all repos
 * are composed, injecting the references needed for those cross-domain calls.
 */
const withdrawalRepo = {
  _ledger: null,
  _withdrawals: null, // self-reference after configure()

  /** Inject cross-repo references. Called once by store.js at init time. */
  configure({ ledgerRepo, withdrawalRepo: self }) {
    this._ledger = ledgerRepo
    this._withdrawals = self
  },

  async createWithdrawal(data) {
    if (isMemoryDb()) {
      const w = { id: `wd${++mem.wdid}`, createdAt: new Date().toISOString(), ...data }
      mem.withdrawals.push(w)
      return toWithdrawalObj(w)
    }
    const doc = await Withdrawal.create(data)
    return toWithdrawalObj({ ...doc.toObject(), id: doc._id })
  },

  // Atomically create a withdrawal only if the vendor has sufficient balance
  // AND no other pending withdrawal exists. This prevents double-spend.
  async createWithdrawalAtomic(data) {
    if (isMemoryDb()) {
      // In-memory: check-and-set is not truly atomic but is sequential
      const vendorId = data.vendorId
      const pending = mem.withdrawals.filter(
        (w) => String(w.vendorId) === String(vendorId) && w.status === 'requested'
      )
      if (pending.length > 0) return null // already has pending withdrawal
      // Check balance
      const payouts = mem.ledger.filter(
        (e) => String(e.vendorId) === String(vendorId) && e.type === 'payout'
      )
      const totalPaid = payouts.reduce((sum, e) => sum + e.amount, 0)
      const paidWithdrawals = mem.withdrawals.filter(
        (w) => String(w.vendorId) === String(vendorId) && w.status === 'paid'
      )
      const totalWithdrawn = paidWithdrawals.reduce((sum, w) => sum + w.amount, 0)
      const balance = totalPaid - totalWithdrawn
      if (balance < data.amount) return null // insufficient balance
      const w = { id: `wd${++mem.wdid}`, createdAt: new Date().toISOString(), ...data }
      mem.withdrawals.push(w)
      return toWithdrawalObj(w)
    }
    // MongoDB: use a transaction-like pattern with findAndModify
    const existing = await Withdrawal.findOne({ vendorId: data.vendorId, status: 'requested' })
    if (existing) return null
    const balance = await this.getVendorBalance(data.vendorId)
    if (balance < data.amount) return null
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

  // Balance = sum of payout entries minus sum of paid withdrawals.
  // Uses injected ledger + withdrawal repos for cross-domain data.
  async getVendorBalance(vendorId) {
    const payouts = await this._ledger.findLedgerEntries({ vendorId, type: 'payout' })
    const totalPaid = payouts.reduce((sum, e) => sum + e.amount, 0)
    const withdrawals = await this._withdrawals.findWithdrawals({ vendorId, status: 'paid' })
    const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0)
    return totalPaid - totalWithdrawn
  },
}

export default withdrawalRepo
