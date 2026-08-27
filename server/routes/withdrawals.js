import { Router } from 'express'
import { repo } from '../store.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ValidationError } from '../lib/errors.js'

const router = Router()

const MIN_WITHDRAWAL = 1000

// ---- Vendor endpoints ----

// POST /api/vendor/withdrawals - vendor requests a withdrawal
router.post('/', requireAuth, requireRole('vendor'), async (req, res) => {
  const { amount, bankName, accountNumber, accountName } = req.body || {}

  if (!amount || amount < MIN_WITHDRAWAL) {
    return res.status(400).json({ message: `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}` })
  }
  if (!bankName || !accountNumber || !accountName) {
    return res.status(400).json({ message: 'Bank name, account number, and account name are required' })
  }

  // Atomic balance check + withdrawal creation to prevent double-spend.
  // Two simultaneous requests will not both succeed.
  const withdrawal = await repo.createWithdrawalAtomic({
    vendorId: req.user.id,
    amount: Number(amount),
    bankName: String(bankName).trim(),
    accountNumber: String(accountNumber).trim(),
    accountName: String(accountName).trim(),
    status: 'requested',
  })

  if (!withdrawal) {
    // Could be insufficient balance or already has a pending withdrawal.
    // Re-check to give a specific error message.
    const balance = await repo.getVendorBalance(req.user.id)
    const pending = await repo.findWithdrawals({ vendorId: req.user.id, status: 'requested' })
    if (pending.length > 0) {
      return res.status(400).json({ message: 'You already have a pending withdrawal request' })
    }
    return res.status(400).json({ message: `Insufficient balance. Available: ₦${balance.toLocaleString()}` })
  }

  // Notify admin
  const admins = (await repo.findAllUsers()).filter((u) => u.role === 'admin')
  for (const admin of admins) {
    await repo.createNotification({
      userId: admin.id,
      type: 'payout_approved',
      message: `${req.user.name} requested a withdrawal of ₦${Number(amount).toLocaleString()}`,
      link: '/admin',
    })
  }

  res.status(201).json({ withdrawal })
})

// GET /api/vendor/withdrawals - vendor sees their withdrawal history
router.get('/', requireAuth, requireRole('vendor'), async (req, res) => {
  const withdrawals = await repo.findWithdrawals({ vendorId: req.user.id })
  const balance = await repo.getVendorBalance(req.user.id)
  res.json({ withdrawals, balance })
})

// GET /api/vendor/wallet - vendor's wallet summary
router.get('/wallet', requireAuth, requireRole('vendor'), async (req, res) => {
  const balance = await repo.getVendorBalance(req.user.id)
  const pending = await repo.findWithdrawals({ vendorId: req.user.id, status: 'requested' })
  const paid = await repo.findWithdrawals({ vendorId: req.user.id, status: 'paid' })
  const totalPaid = paid.reduce((sum, w) => sum + w.amount, 0)

  res.json({ balance, pendingWithdrawal: pending[0] || null, totalPaidOut: totalPaid })
})

// ---- Admin endpoints ----

// GET /api/admin/withdrawals - admin sees all withdrawal requests
router.get('/admin', requireAuth, requireRole('admin'), async (req, res) => {
  const { status } = req.query
  const withdrawals = await repo.findWithdrawals(status ? { status } : {})

  // Enrich with vendor names
  const vendorIds = [...new Set(withdrawals.map((w) => w.vendorId))]
  const vendorMap = {}
  for (const vid of vendorIds) {
    const v = await repo.findUserById(vid)
    if (v) vendorMap[vid] = v.name
  }

  res.json({
    withdrawals: withdrawals.map((w) => ({
      ...w,
      vendorName: vendorMap[w.vendorId] || 'Unknown',
    })),
  })
})

// PATCH /api/admin/withdrawals/:id/approve - admin approves withdrawal
router.patch('/admin/:id/approve', requireAuth, requireRole('admin'), async (req, res) => {
  const withdrawal = await repo.findWithdrawalById(req.params.id)
  if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' })
  if (withdrawal.status !== 'requested') {
    return res.status(400).json({ message: `Cannot approve a ${withdrawal.status} withdrawal` })
  }

  const updated = await repo.updateWithdrawalStatus(req.params.id, {
    status: 'approved',
    processedBy: req.user.id,
  })

  // Notify vendor
  await repo.createNotification({
    userId: withdrawal.vendorId,
    type: 'withdrawal_approved',
    message: `Your withdrawal of ₦${withdrawal.amount.toLocaleString()} has been approved and will be processed shortly.`,
    link: '/vendor',
  })

  res.json({ withdrawal: updated })
})

// PATCH /api/admin/withdrawals/:id/reject - admin rejects withdrawal
router.patch('/admin/:id/reject', requireAuth, requireRole('admin'), async (req, res) => {
  const withdrawal = await repo.findWithdrawalById(req.params.id)
  if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' })
  if (withdrawal.status !== 'requested' && withdrawal.status !== 'approved') {
    return res.status(400).json({ message: `Cannot reject a ${withdrawal.status} withdrawal` })
  }

  const updated = await repo.updateWithdrawalStatus(req.params.id, {
    status: 'rejected',
    processedBy: req.user.id,
    notes: req.body?.notes || '',
  })

  await repo.createNotification({
    userId: withdrawal.vendorId,
    type: 'withdrawal_rejected',
    message: `Your withdrawal of ₦${withdrawal.amount.toLocaleString()} was rejected. ${req.body?.notes || ''}`,
    link: '/vendor',
  })

  res.json({ withdrawal: updated })
})

// PATCH /api/admin/withdrawals/:id/process - admin marks as paid (bank transfer sent)
router.patch('/admin/:id/process', requireAuth, requireRole('admin'), async (req, res) => {
  const withdrawal = await repo.findWithdrawalById(req.params.id)
  if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' })
  if (withdrawal.status !== 'approved') {
    return res.status(400).json({ message: 'Only approved withdrawals can be processed' })
  }

  const updated = await repo.updateWithdrawalStatus(req.params.id, {
    status: 'paid',
    processedBy: req.user.id,
  })

  await repo.createNotification({
    userId: withdrawal.vendorId,
    type: 'payout_approved',
    message: `Your withdrawal of ₦${withdrawal.amount.toLocaleString()} has been paid to ${withdrawal.bankName} (${withdrawal.accountNumber}).`,
    link: '/vendor',
  })

  res.json({ withdrawal: updated })
})

export default router
