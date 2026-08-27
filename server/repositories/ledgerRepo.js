import { isMemoryDb } from '../db.js'
import Ledger from '../models/Ledger.js'
import { mem, toLedgerObj } from './helpers.js'

const ledgerRepo = {
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
}

export default ledgerRepo
