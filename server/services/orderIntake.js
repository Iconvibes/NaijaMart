import { repo } from '../store.js'
import { ValidationError } from '../lib/errors.js'
import { initialPaymentStatus, generatePaymentReference, isValidPaymentMethod, getPaymentProvider } from './paymentProvider.js'

// Deep module: the entire Order intake use case. The HTTP route stays a thin
// adapter and tests hit this interface directly. Prices and vendor attribution
// are always snapshotted from the catalog here - never trusted from the client
// - so a shopper cannot forge what an order records.

// How the buyer paid. card/transfer are captured at checkout (the real capture
// is the payment processor's seam); cod stays pending until the courier remits.
const PAYMENT_METHODS = ['card', 'transfer', 'cod']

// Atomically validate and reserve a coupon. Returns the discount amount or
// throws a ValidationError. Uses a compare-and-swap loop so two concurrent
// checkouts can never overspend a coupon's maxUses.
async function validateAndReserveCoupon(couponCode, subtotal) {
  const coupon = await repo.findCouponByCode(couponCode)
  if (!coupon) throw new ValidationError('Invalid coupon code')
  if (!coupon.active) throw new ValidationError('This coupon is no longer active')
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    throw new ValidationError('This coupon has expired')
  }
  if (coupon.minOrder && subtotal < coupon.minOrder) {
    throw new ValidationError(`Minimum order for this coupon is ₦${coupon.minOrder.toLocaleString()}`)
  }

  // Atomic reserve: loop until we either succeed or hit the limit.
  // This prevents two concurrent orders from both seeing usedCount=99
  // (with maxUses=100), both pass validation, and both increment past the limit.
  let current = coupon
  if (coupon.maxUses) {
    let reserved = false
    for (let attempt = 0; attempt < 5; attempt++) {
      if (current.usedCount >= coupon.maxUses) {
        throw new ValidationError('This coupon has reached its usage limit')
      }
      // Try to atomically increment — if another request beat us, the
      // returned doc will have a higher usedCount and we loop again.
      const updated = await repo.incrementCouponUsageAtomic(current.id, current.usedCount)
      if (updated) {
        current = updated
        reserved = true
        break
      }
      // CAS failed — someone else incremented first, re-read
      current = await repo.findCouponByCode(couponCode)
      if (!current) throw new ValidationError('Coupon no longer exists')
    }
    if (!reserved) {
      throw new ValidationError('Coupon reservation failed — please try again')
    }
  } else {
    // Unlimited coupon — just increment
    await repo.incrementCouponUsage(current.id)
  }

  // Calculate discount
  let discount = 0
  if (coupon.discountType === 'percent') {
    discount = Math.round(subtotal * coupon.discountValue / 100)
  } else {
    discount = Math.min(coupon.discountValue, subtotal)
  }

  return { coupon, discount }
}

export async function placeOrder({ customerName, customerEmail, customerPhone, customerAddress, customerId, items, paymentMethod, couponCode } = {}) {
  if (!customerName || !customerPhone || !customerAddress) {
    throw new ValidationError('Name, phone and address are required')
  }
  // Validate email format if provided
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    throw new ValidationError('Please enter a valid email address')
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('Your cart is empty')
  }
  const method = paymentMethod || 'cod'
  if (!PAYMENT_METHODS.includes(method)) {
    throw new ValidationError(`Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`)
  }

  const lineItems = []
  const stockReservations = [] // track decremented stock for rollback on failure
  for (const line of items) {
    const product = await repo.findProductById(line?.productId)
    if (!product) throw new ValidationError(`Product ${line.productId} no longer exists`)
    const qty = Math.max(1, Math.min(99, Number(line.qty) || 1))

    // Atomic stock reservation: decrement stock if the product tracks numeric inventory.
    // Products with stock=null use the boolean inStock only (unlimited).
    if (product.stock != null) {
      const updated = await repo.decrementStock(product.id, qty)
      if (!updated) {
        // Rollback any stock already reserved for earlier items in this order
        for (const res of stockReservations) {
          await repo.restoreStock(res.productId, res.qty)
        }
        throw new ValidationError(`"${product.name}" has insufficient stock (requested: ${qty}, available: ${product.stock ?? 0})`)
      }
      stockReservations.push({ productId: product.id, qty })
    }

    lineItems.push({
      productId: product.id,
      vendorId: product.vendorId,
      name: product.name,
      image: product.image,
      price: product.price,
      qty,
      fulfillment: 'pending',
    })
  }

  let total = lineItems.reduce((sum, i) => sum + i.price * i.qty, 0)
  let discountAmount = 0

  // Validate and atomically reserve coupon
  if (couponCode) {
    const result = await validateAndReserveCoupon(couponCode, total)
    discountAmount = result.discount
  }

  const finalTotal = Math.max(0, total - discountAmount)

  // All payment methods start as 'pending'. No client-side auto-capture.
  // Card/transfer are confirmed only via verifyPayment() or webhook.
  // COD stays pending until admin manually captures after courier remits.
  const paymentStatus = initialPaymentStatus(method)
  const paymentReference = method !== 'cod' ? generatePaymentReference('pending') : null

  const order = await repo.createOrder({
    customerName: String(customerName).trim(),
    customerEmail: customerEmail ? String(customerEmail).trim() : null,
    customerPhone: String(customerPhone).trim(),
    customerAddress: String(customerAddress).trim(),
    customerId: customerId || null,
    items: lineItems,
    total: finalTotal,
    couponCode: couponCode || null,
    discountAmount,
    status: 'pending',
    payment: {
      method,
      status: paymentStatus,
      amount: finalTotal,
      reference: paymentReference,
      capturedAt: null,
    },
  })

  // Initialize payment with the provider (card/transfer only)
  if (method !== 'cod' && paymentReference) {
    const provider = getPaymentProvider()
    try {
      await provider.initializePayment({
        reference: paymentReference,
        amount: finalTotal,
        currency: 'NGN',
        orderId: order.id,
        metadata: { customerId: customerId || 'guest', customerEmail },
      })
    } catch (err) {
      console.error(`[PaymentProvider] Initialization failed for order ${order.id}:`, err.message)
      // Payment initialization failed but order is created as pending.
      // Customer can retry payment or choose COD.
    }
  }

  return order
}
