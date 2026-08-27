import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getPaymentProvider, generatePaymentReference, isValidPaymentMethod, initialPaymentStatus } from '../server/services/paymentProvider.js'

test('getPaymentProvider returns a mock provider by default', () => {
  const provider = getPaymentProvider()
  assert.ok(provider)
  assert.equal(typeof provider.initializePayment, 'function')
  assert.equal(typeof provider.verifyPayment, 'function')
  assert.equal(typeof provider.refundPayment, 'function')
})

test('mock provider initializes payment as pending', async () => {
  const provider = getPaymentProvider()
  const result = await provider.initializePayment({
    reference: 'pm_test_001',
    amount: 50000,
    currency: 'NGN',
    orderId: 'order-123',
  })
  assert.equal(result.reference, 'pm_test_001')
  assert.equal(result.status, 'pending')
  assert.equal(result.amount, 50000)
  assert.equal(result.currency, 'NGN')
})

test('mock provider verification captures the payment', async () => {
  const provider = getPaymentProvider()
  await provider.initializePayment({
    reference: 'pm_test_verify',
    amount: 25000,
    currency: 'NGN',
    orderId: 'order-verify',
  })
  const result = await provider.verifyPayment('pm_test_verify')
  assert.equal(result.status, 'captured')
  assert.equal(result.amount, 25000)
})

test('mock provider returns failed for unknown reference', async () => {
  const provider = getPaymentProvider()
  const result = await provider.verifyPayment('pm_unknown_ref')
  assert.equal(result.status, 'failed')
})

test('mock provider refund succeeds for captured payment', async () => {
  const provider = getPaymentProvider()
  await provider.initializePayment({
    reference: 'pm_test_refund',
    amount: 30000,
    currency: 'NGN',
    orderId: 'order-refund',
  })
  await provider.verifyPayment('pm_test_refund')
  const result = await provider.refundPayment('pm_test_refund', 30000, 'customer request')
  assert.equal(result.success, true)
  assert.ok(result.providerRef)
})

test('mock provider refund fails for uncaptured payment', async () => {
  const provider = getPaymentProvider()
  await provider.initializePayment({
    reference: 'pm_test_refund_fail',
    amount: 10000,
    currency: 'NGN',
    orderId: 'order-refund-fail',
  })
  const result = await provider.refundPayment('pm_test_refund_fail', 10000)
  assert.equal(result.success, false)
  assert.ok(result.error)
})

test('generatePaymentReference returns unique references', () => {
  const ref1 = generatePaymentReference('order-1')
  const ref2 = generatePaymentReference('order-1')
  assert.notEqual(ref1, ref2)
  assert.ok(ref1.startsWith('pm_'))
  assert.ok(ref2.startsWith('pm_'))
})

test('isValidPaymentMethod validates correctly', () => {
  assert.equal(isValidPaymentMethod('card'), true)
  assert.equal(isValidPaymentMethod('transfer'), true)
  assert.equal(isValidPaymentMethod('cod'), true)
  assert.equal(isValidPaymentMethod('bitcoin'), false)
  assert.equal(isValidPaymentMethod(''), false)
})

test('initialPaymentStatus is always pending for all methods', () => {
  assert.equal(initialPaymentStatus('card'), 'pending')
  assert.equal(initialPaymentStatus('transfer'), 'pending')
  assert.equal(initialPaymentStatus('cod'), 'pending')
})
