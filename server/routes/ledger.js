import { Router } from 'express'
import { repo } from '../store.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { collectPayables, payoutSeller } from '../services/money.js'

const router = Router()

// All ledger routes are admin-only: the money trail is the platform's books.
router.use(requireAuth, requireRole('admin'))

// GET /api/ledger - the double-entry money trail, newest first. Optional
// ?orderId= and ?type= filters.
router.get('/', async (req, res) => {
  const entries = await repo.findLedgerEntries({ orderId: req.query.orderId, type: req.query.type })
  res.json({ entries })
})

// GET /api/ledger/payables - every seller who could be paid right now
// (delivered + return window elapsed + payment captured + not already paid).
router.get('/payables', async (req, res) => {
  const orders = await repo.findOrders({})
  const payables = await collectPayables(orders)
  res.json({ payables })
})

// POST /api/ledger/payouts - release escrow to every eligible seller. Each
// payout is individually idempotent, so re-running is safe.
router.post('/payouts', async (req, res) => {
  const orders = await repo.findOrders({})
  const paid = []
  const skipped = []
  for (const order of orders) {
    for (const vendorId of new Set(order.items.map((i) => String(i.vendorId)))) {
      const result = await payoutSeller(order, vendorId, { actor: req.user.id })
      if (result.paid) paid.push(result.entry)
      else skipped.push({ orderId: order.id, vendorId, reason: result.reason })
    }
  }
  res.json({ paid, skipped })
})

export default router
