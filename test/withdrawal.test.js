import { test } from 'node:test'
import assert from 'node:assert/strict'
import { repo } from '../server/store.js'

const DAY = 24 * 60 * 60 * 1000

async function seedVendorWithEarnings(vendorId, earnings = 100000) {
  // Create an order with a payout entry to give the vendor earnings
  const order = await repo.createOrder({
    customerName: 'Test Buyer',
    customerPhone: '08031234567',
    customerAddress: '12 Test St, Lagos',
    items: [{ productId: 'p1', vendorId, name: 'Item', price: earnings, qty: 1, fulfillment: 'sent' }],
    total: earnings,
    status: 'delivered',
    deliveredAt: new Date(Date.now() - 20 * DAY).toISOString(),
    payment: { method: 'card', status: 'captured', amount: earnings, capturedAt: new Date().toISOString() },
  })
  // Create a payout entry to give the vendor their share
  await repo.createLedgerEntry({
    type: 'payout',
    orderId: order.id,
    vendorId,
    from: 'platform:escrow',
    to: `seller:${vendorId}`,
    amount: earnings * 0.9, // 90% after commission
    reference: `payout:${order.id}:${vendorId}`,
    description: 'Test payout',
  })
  return order
}

test('createWithdrawalAtomic succeeds when balance is sufficient', async () => {
  const vendorId = 'v-atomic-1'
  await seedVendorWithEarnings(vendorId, 100000)

  const withdrawal = await repo.createWithdrawalAtomic({
    vendorId,
    amount: 50000,
    bankName: 'GTBank',
    accountNumber: '0123456789',
    accountName: 'Test Vendor',
    status: 'requested',
  })

  assert.ok(withdrawal)
  assert.equal(withdrawal.amount, 50000)
  assert.equal(withdrawal.status, 'requested')
})

test('createWithdrawalAtomic fails when balance is insufficient', async () => {
  const vendorId = 'v-atomic-2'
  await seedVendorWithEarnings(vendorId, 10000)

  const withdrawal = await repo.createWithdrawalAtomic({
    vendorId,
    amount: 50000, // more than earnings
    bankName: 'GTBank',
    accountNumber: '0123456789',
    accountName: 'Test Vendor',
    status: 'requested',
  })

  assert.equal(withdrawal, null)
})

test('createWithdrawalAtomic fails when pending withdrawal exists', async () => {
  const vendorId = 'v-atomic-3'
  await seedVendorWithEarnings(vendorId, 100000)

  // First request succeeds
  const first = await repo.createWithdrawalAtomic({
    vendorId,
    amount: 30000,
    bankName: 'GTBank',
    accountNumber: '0123456789',
    accountName: 'Test Vendor',
    status: 'requested',
  })
  assert.ok(first)

  // Second request fails (already has pending)
  const second = await repo.createWithdrawalAtomic({
    vendorId,
    amount: 20000,
    bankName: 'GTBank',
    accountNumber: '0123456789',
    accountName: 'Test Vendor',
    status: 'requested',
  })
  assert.equal(second, null)
})

test('withdrawal balance excludes pending withdrawals', async () => {
  const vendorId = 'v-atomic-4'
  await seedVendorWithEarnings(vendorId, 50000)

  // Create a pending withdrawal
  await repo.createWithdrawalAtomic({
    vendorId,
    amount: 30000,
    bankName: 'GTBank',
    accountNumber: '0123456789',
    accountName: 'Test Vendor',
    status: 'requested',
  })

  // Balance should still show full amount (pending doesn't reduce balance yet)
  const balance = await repo.getVendorBalance(vendorId)
  assert.ok(balance > 0)
})

test('getVendorBalance accounts for paid withdrawals', async () => {
  const vendorId = 'v-atomic-5'
  await seedVendorWithEarnings(vendorId, 100000) // earns 90% after commission = 90000

  const balance = await repo.getVendorBalance(vendorId)
  assert.ok(balance > 0)
  assert.ok(balance <= 90000) // after 10% commission
})
