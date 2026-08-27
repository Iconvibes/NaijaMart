// Payment Provider Abstraction
//
// Every payment method goes through a provider that can:
//   1. initializePayment()  — create a payment intent with the provider
//   2. verifyPayment()      — verify a payment reference with the provider
//   3. refundPayment()      — issue a refund through the provider
//
// The mock provider simulates card/transfer/cod flows for development.
// In production, swap to a real provider (Paystack, Flutterwave, etc.)
// by setting PAYMENT_PROVIDER env var and implementing the interface.
//
// CRITICAL: The client must NEVER be authoritative about payment success.
// Only verifyPayment() or a webhook can mark a payment as captured.

import { ValidationError } from '../lib/errors.js'

// ─── Provider Interface ─────────────────────────────────────────────────────

/**
 * @typedef {Object} PaymentResult
 * @property {string} reference   - Unique payment reference
 * @property {string} status      - 'pending' | 'captured' | 'failed'
 * @property {number} amount      - Verified amount in naira
 * @property {string} currency    - Always 'NGN'
 * @property {Object} metadata    - Provider-specific metadata
 */

/**
 * @typedef {Object} PaymentProvider
 * @property {(params: {reference: string, amount: number, currency: string, orderId: string, metadata?: Object}) => Promise<PaymentResult>} initializePayment
 * @property {(reference: string) => Promise<PaymentResult>} verifyPayment
 * @property {(reference: string, amount: number, reason?: string) => Promise<{success: boolean, providerRef?: string, error?: string}>} refundPayment
 */

// ─── Mock Provider ──────────────────────────────────────────────────────────
// Simulates payment flows for development/testing.
// Card and transfer initialize as 'pending', then verify confirms them.
// COD stays 'pending' until admin manually captures.

class MockPaymentProvider {
  constructor() {
    /** @type {Map<string, PaymentResult>} */
    this.payments = new Map()
  }

  async initializePayment({ reference, amount, currency = 'NGN', orderId, metadata = {} }) {
    const result = {
      reference,
      status: 'pending',
      amount,
      currency,
      metadata: { ...metadata, orderId, provider: 'mock', initializedAt: new Date().toISOString() },
    }
    this.payments.set(reference, result)
    console.log(`[PaymentProvider:mock] Initialized: ${reference} — ₦${amount.toLocaleString()} for order ${orderId}`)
    return result
  }

  async verifyPayment(reference) {
    const existing = this.payments.get(reference)
    if (!existing) {
      return { reference, status: 'failed', amount: 0, currency: 'NGN', metadata: { provider: 'mock', error: 'not found' } }
    }
    // Mock verification: mark as captured
    const result = { ...existing, status: 'captured' }
    this.payments.set(reference, result)
    console.log(`[PaymentProvider:mock] Verified & captured: ${reference} — ₦${existing.amount.toLocaleString()}`)
    return result
  }

  async refundPayment(reference, amount, reason = 'refund') {
    const existing = this.payments.get(reference)
    if (!existing) {
      return { success: false, error: 'Payment not found' }
    }
    if (existing.status !== 'captured') {
      return { success: false, error: `Cannot refund payment in status: ${existing.status}` }
    }
    const refundRef = `refund:${reference}:${Date.now()}`
    console.log(`[PaymentProvider:mock] Refunded: ${reference} — ₦${amount.toLocaleString()} (${reason})`)
    return { success: true, providerRef: refundRef }
  }
}

// ─── Provider Factory ───────────────────────────────────────────────────────

let cachedProvider = null

export function getPaymentProvider() {
  if (cachedProvider) return cachedProvider

  const providerName = process.env.PAYMENT_PROVIDER || 'mock'

  switch (providerName) {
    case 'mock':
      cachedProvider = new MockPaymentProvider()
      break
    // Future: add 'paystack', 'flutterwave', etc.
    default:
      console.warn(`Unknown payment provider "${providerName}", falling back to mock`)
      cachedProvider = new MockPaymentProvider()
  }

  console.log(`Payment provider: ${providerName}`)
  return cachedProvider
}

// ─── Helper: Generate Payment Reference ──────────────────────────────────────

export function generatePaymentReference(orderId) {
  return `pm_${orderId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ─── Helper: Validate Payment Method ─────────────────────────────────────────

export const PAYMENT_METHODS = ['card', 'transfer', 'cod']

export function isValidPaymentMethod(method) {
  return PAYMENT_METHODS.includes(method)
}

// ─── Helper: Determine Initial Payment Status ────────────────────────────────
// COD orders stay pending until admin captures. Card/transfer are initialized
// as pending until the provider confirms via verifyPayment or webhook.

export function initialPaymentStatus(method) {
  // All methods start as pending - no auto-capture ever
  return 'pending'
}
