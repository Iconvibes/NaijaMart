import mongoose from 'mongoose'

// Double-entry ledger. Every money movement is an append-only entry moving an
// amount from one account to another, keyed by a unique reference so retries
// can never double-record a transaction (idempotency). The order snapshot is
// the anchor: amounts are always derived from the frozen order, never from
// client input.
//
// Accounts: buyer, platform:escrow, platform:revenue (commission),
// platform:operating (fronts post-payout refunds), seller:<vendorId>.
//
// Entry types (v1): capture, commission, payout. Refunds/clawbacks land with
// the refund flow.
const ledgerSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['capture', 'commission', 'payout', 'refund', 'clawback', 'commission_reversal'],
      required: true,
    },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    // present on per-seller entries (commission, payout)
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    from: { type: String, required: true },
    to: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    // Idempotency key - unique per logical transaction so a retried request
    // cannot double-pay or double-book.
    reference: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    // userId of the operator, or 'system' for automatic entries
    actor: { type: String, default: 'system' },
  },
  { timestamps: true }
)

ledgerSchema.index({ orderId: 1, type: 1 })

export default mongoose.model('Ledger', ledgerSchema)
