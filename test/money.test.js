import { test } from 'node:test'
import assert from 'node:assert/strict'
import { repo } from '../server/store.js'
import {
  commissionFor,
  sellerShare,
  recordPaymentCapture,
  isSellerPayable,
  payoutReason,
  payoutSeller,
  collectPayables,
} from '../server/services/money.js'

// Tests run against the in-memory adapter (connectDb never runs in this
// process), so ledger entries and orders share the repo seam production uses.
const DAY = 24 * 60 * 60 * 1000

async function seedOrder(overrides = {}) {
  return repo.createOrder({
    customerName: 'Ada Obi',
    customerPhone: '08031234567',
    customerAddress: '12 Adeola Odeku St, Lagos',
    items: [
      { productId: 'p1', vendorId: 'v-tech', name: 'FreePods', price: 10000, qty: 1, fulfillment: 'sent' },
      { productId: 'p2', vendorId: 'v-slot', name: 'Blender', price: 20000, qty: 1, fulfillment: 'sent' },
    ],
    total: 30000,
    status: 'delivered',
    deliveredAt: new Date(Date.now() - 20 * DAY).toISOString(),
    payment: { method: 'card', status: 'captured', amount: 30000, capturedAt: new Date().toISOString() },
    ...overrides,
  })
}

test('commission is 10% of the subtotal; the seller keeps the rest', () => {
  assert.equal(commissionFor(10000), 1000)
  assert.equal(sellerShare(10000), 9000)
  assert.equal(commissionFor(18500), 1850)
  assert.equal(sellerShare(18500), 16650)
})

test('capture books buyer -> escrow plus a commission entry per seller', async () => {
  const order = await seedOrder({})
  const entries = await recordPaymentCapture(order)

  assert.deepEqual(entries.map((e) => e.type), ['capture', 'commission', 'commission'])
  const capture = entries[0]
  assert.equal(capture.from, 'buyer')
  assert.equal(capture.to, 'platform:escrow')
  assert.equal(capture.amount, 30000)

  const commissions = entries.slice(1)
  assert.equal(commissions[0].amount, 1000) // 10% of v-tech's 10000
  assert.equal(commissions[0].vendorId, 'v-tech')
  assert.equal(commissions[1].amount, 2000) // 10% of v-slot's 20000
  assert.equal(commissions[1].vendorId, 'v-slot')
})

test('capture is idempotent - a retry books nothing twice', async () => {
  const order = await seedOrder({})
  await recordPaymentCapture(order)
  const again = await recordPaymentCapture(order)
  assert.equal(again.length, 0)
  const entries = await repo.findLedgerEntries({ orderId: order.id })
  assert.equal(entries.filter((e) => e.type === 'capture').length, 1)
})

test('a pending (cod) payment books nothing into escrow', async () => {
  const order = await seedOrder({ payment: { method: 'cod', status: 'pending', amount: 30000, capturedAt: null } })
  const entries = await recordPaymentCapture(order)
  assert.equal(entries.length, 0)
})

test('a seller is payable only after delivery + the return window', async () => {
  const now = Date.now()
  const ready = await seedOrder({})
  assert.equal(await isSellerPayable(ready, 'v-tech', now), true)

  const notDelivered = await seedOrder({ status: 'shipped' })
  assert.equal(await isSellerPayable(notDelivered, 'v-tech', now), false)
  assert.equal(await payoutReason(notDelivered, 'v-tech', now), 'order not delivered')

  const withinWindow = await seedOrder({ deliveredAt: new Date(now - 3 * DAY).toISOString() })
  assert.equal(await isSellerPayable(withinWindow, 'v-tech', now), false)

  const notCaptured = await seedOrder({ payment: { method: 'cod', status: 'pending', amount: 30000, capturedAt: null } })
  assert.equal(await isSellerPayable(notCaptured, 'v-tech', now), false)
  assert.equal(await payoutReason(notCaptured, 'v-tech', now), 'payment not captured')

  const noItems = await seedOrder({ items: [{ productId: 'p3', vendorId: 'v-other', name: 'X', price: 5000, qty: 1, fulfillment: 'sent' }], total: 5000 })
  assert.equal(await isSellerPayable(noItems, 'v-tech', now), false)
})

test('payout releases the seller share once - escrow to seller, idempotent', async () => {
  const now = Date.now()
  const order = await seedOrder({})

  const first = await payoutSeller(order, 'v-tech', { actor: 'admin-1', now })
  assert.equal(first.paid, true)
  assert.equal(first.entry.amount, sellerShare(10000)) // 9000
  assert.equal(first.entry.to, 'seller:v-tech')
  assert.equal(first.entry.actor, 'admin-1')

  const second = await payoutSeller(order, 'v-tech', { actor: 'admin-1', now })
  assert.equal(second.paid, false)
  assert.equal(second.reason, 'already paid out')
})

test('collectPayables finds every eligible seller across orders', async () => {
  const now = Date.now()
  const ready = await seedOrder({}) // delivered 20 days ago, captured - both sellers eligible
  const fresh = await seedOrder({ deliveredAt: new Date(now - 2 * DAY).toISOString() }) // inside window - none

  const payables = await collectPayables(await repo.findOrders({}), now)
  const forReady = payables.filter((p) => p.orderId === ready.id)
  assert.deepEqual(forReady.map((p) => p.amount).sort(), [9000, 18000].sort())
  assert.equal(payables.filter((p) => p.orderId === fresh.id).length, 0)
})
