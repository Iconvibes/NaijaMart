import { test } from 'node:test'
import assert from 'node:assert/strict'
import { repo } from '../server/store.js'
import {
  recordPaymentCapture,
  payoutSeller,
  isSellerPayable,
  collectPayables,
  refundOrderLines,
  commissionFor,
} from '../server/services/money.js'

const DAY = 24 * 60 * 60 * 1000

async function seedOrder(overrides = {}) {
  return repo.createOrder({
    customerName: 'Ada Obi',
    customerPhone: '08031234567',
    customerAddress: '12 Adeola Odeku St, Lagos',
    items: [
      { productId: 'p-tech', vendorId: 'v-tech', name: 'FreePods', price: 10000, qty: 1, fulfillment: 'sent' },
      { productId: 'p-slot', vendorId: 'v-slot', name: 'Blender', price: 20000, qty: 1, fulfillment: 'sent' },
    ],
    total: 30000,
    status: 'delivered',
    deliveredAt: new Date(Date.now() - 20 * DAY).toISOString(),
    payment: { method: 'card', status: 'captured', amount: 30000, capturedAt: new Date().toISOString() },
    ...overrides,
  })
}

async function escrowBalance(orderId) {
  const entries = await repo.findLedgerEntries({ orderId })
  const in_ = entries.filter((e) => e.to === 'platform:escrow').reduce((s, e) => s + e.amount, 0)
  const out = entries.filter((e) => e.from === 'platform:escrow').reduce((s, e) => s + e.amount, 0)
  return { in: in_, out, net: in_ - out }
}

test('before-payout refund reverses from escrow and the seller is no longer payable', async () => {
  const order = await seedOrder({})
  await recordPaymentCapture(order)

  const { order: updated, entries, refundedAmount } = await refundOrderLines(order, { productIds: ['p-tech'] }, { actor: 'admin-1' })

  assert.equal(refundedAmount, 10000)
  assert.deepEqual(entries.map((e) => e.type).sort(), ['commission_reversal', 'refund'])
  assert.equal(entries.find((e) => e.type === 'refund').from, 'platform:escrow')
  assert.equal(entries.find((e) => e.type === 'refund').to, 'buyer')
  // commission reversed in full (this seller's only line is now refunded)
  assert.equal(entries.find((e) => e.type === 'commission_reversal').amount, commissionFor(10000))

  const line = updated.items.find((i) => i.productId === 'p-tech')
  assert.equal(line.refunded, true)
  assert.equal(await isSellerPayable(updated, 'v-tech', Date.now()), false)
  assert.equal(await isSellerPayable(updated, 'v-slot', Date.now()), true)
})

test('escrow balances to zero after capture + partial refund + remaining payout', async () => {
  const order = await seedOrder({})
  await recordPaymentCapture(order)
  const { order: afterRefund } = await refundOrderLines(order, { productIds: ['p-tech'] }, { actor: 'admin-1' })

  const payout = await payoutSeller(afterRefund, 'v-slot', { actor: 'admin-1', now: Date.now() })
  assert.equal(payout.paid, true)
  assert.equal(payout.entry.amount, 20000 - commissionFor(20000))

  // escrow: 30000 in; out = commissions (1000 + 2000) + refund (10000) +
  // commission reversal (1000) + remaining payout (18000) = 30000
  const bal = await escrowBalance(order.id)
  assert.equal(bal.net, 0, `escrow drifted by ${bal.net}`)
})

test('after-payout refund claws back from the seller and balances every account', async () => {
  const order = await seedOrder({})
  await recordPaymentCapture(order)
  await payoutSeller(order, 'v-tech', { actor: 'admin-1', now: Date.now() })
  await payoutSeller(order, 'v-slot', { actor: 'admin-1', now: Date.now() })

  const { entries } = await refundOrderLines(order, { productIds: ['p-tech'] }, { actor: 'admin-1' })

  assert.deepEqual(entries.map((e) => e.type).sort(), ['clawback', 'commission_reversal', 'refund'])
  const refund = entries.find((e) => e.type === 'refund')
  const clawback = entries.find((e) => e.type === 'clawback')
  const reversal = entries.find((e) => e.type === 'commission_reversal')

  // buyer is fully refunded from operating funds
  assert.equal(refund.from, 'platform:operating')
  assert.equal(refund.to, 'buyer')
  assert.equal(refund.amount, 10000)
  // seller returns their share (10000 - 10% commission)
  assert.equal(clawback.amount, 10000 - commissionFor(10000))
  assert.equal(clawback.from, 'seller:v-tech')
  assert.equal(clawback.to, 'platform:operating')
  // the reversal replenishes operating, never escrow (the buyer was not
  // refunded from escrow), and the platform's operating account nets zero
  assert.equal(reversal.from, 'platform:revenue')
  assert.equal(reversal.to, 'platform:operating')
  assert.equal(reversal.amount, commissionFor(10000))

  const operatingOut = entries.filter((e) => e.from === 'platform:operating').reduce((s, e) => s + e.amount, 0)
  const operatingIn = entries.filter((e) => e.to === 'platform:operating').reduce((s, e) => s + e.amount, 0)
  assert.equal(operatingOut - operatingIn, 0)
  // revenue forfeited exactly the commission on the refunded line
  const revenueOut = entries.filter((e) => e.from === 'platform:revenue').reduce((s, e) => s + e.amount, 0)
  assert.equal(revenueOut, commissionFor(10000))
  // escrow untouched by the refund - its balance stays zero
  const bal = await escrowBalance(order.id)
  assert.equal(bal.net, 0, `escrow drifted by ${bal.net}`)
})

test('refunding every line marks the payment refunded', async () => {
  const order = await seedOrder({})
  await recordPaymentCapture(order)

  const { order: after } = await refundOrderLines(order, { productIds: ['p-tech', 'p-slot'] }, { actor: 'admin-1' })
  assert.equal(after.payment.status, 'refunded')
  assert.equal(after.items.every((i) => i.refunded), true)
  const payables = await collectPayables([after], Date.now())
  assert.equal(payables.length, 0)
})

test('an uncaptured payment cannot be refunded', async () => {
  const order = await seedOrder({ payment: { method: 'cod', status: 'pending', amount: 30000, capturedAt: null } })
  await assert.rejects(refundOrderLines(order, { productIds: ['p-tech'] }), /Only captured payments can be refunded/)
})

test('a line cannot be refunded twice', async () => {
  const order = await seedOrder({})
  await recordPaymentCapture(order)
  await refundOrderLines(order, { productIds: ['p-tech'] }, { actor: 'admin-1' })
  // production re-fetches the order between requests - the module must never
  // be handed a stale copy
  const fresh = await repo.findOrderById(order.id)
  await assert.rejects(refundOrderLines(fresh, { productIds: ['p-tech'] }), /already refunded/)
})

test('refund rejects unknown lines and duplicate ids', async () => {
  const order = await seedOrder({})
  await recordPaymentCapture(order)
  await assert.rejects(refundOrderLines(order, { productIds: ['nope'] }), /not on this order/)
  await assert.rejects(refundOrderLines(order, { productIds: ['p-tech', 'p-tech'] }), /Duplicate/)
  await assert.rejects(refundOrderLines(order, { productIds: [] }), /at least one item/)
})

test('partial refunds across two steps keep escrow exactly balanced (rounding-safe deltas)', async () => {
  // odd amounts so per-line rounding would drift; the delta approach must not
  const order = await seedOrder({
    items: [
      { productId: 'p-a', vendorId: 'v-tech', name: 'A', price: 5005, qty: 1, fulfillment: 'sent' },
      { productId: 'p-b', vendorId: 'v-tech', name: 'B', price: 4999, qty: 1, fulfillment: 'sent' },
    ],
    total: 10004,
  })
  await recordPaymentCapture(order)

  await refundOrderLines(order, { productIds: ['p-a'] }, { actor: 'admin-1' })
  const fresh = await repo.findOrderById(order.id)
  const { order: after } = await refundOrderLines(fresh, { productIds: ['p-b'] }, { actor: 'admin-1' })

  assert.equal(after.payment.status, 'refunded')
  const bal = await escrowBalance(order.id)
  assert.equal(bal.net, 0, `escrow drifted by ${bal.net}`)
})
