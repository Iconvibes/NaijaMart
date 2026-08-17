import { repo } from '../store.js'
import { ValidationError } from '../lib/errors.js'

// Deep module: the entire Order intake use case. The HTTP route stays a thin
// adapter and tests hit this interface directly. Prices and vendor attribution
// are always snapshotted from the catalog here - never trusted from the client
// - so a shopper cannot forge what an order records.

// How the buyer paid. card/transfer are captured at checkout (the real capture
// is the payment processor's seam); cod stays pending until the courier remits.
const PAYMENT_METHODS = ['card', 'transfer', 'cod']

export async function placeOrder({ customerName, customerPhone, customerAddress, items, paymentMethod } = {}) {
  if (!customerName || !customerPhone || !customerAddress) {
    throw new ValidationError('Name, phone and address are required')
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('Your cart is empty')
  }
  const method = paymentMethod || 'cod'
  if (!PAYMENT_METHODS.includes(method)) {
    throw new ValidationError(`Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`)
  }

  const lineItems = []
  for (const line of items) {
    const product = await repo.findProductById(line?.productId)
    if (!product) throw new ValidationError(`Product ${line.productId} no longer exists`)
    const qty = Math.max(1, Math.min(99, Number(line.qty) || 1))
    lineItems.push({
      productId: product.id,
      vendorId: product.vendorId,
      name: product.name,
      image: product.image,
      price: product.price,
      qty,
      // No seller has dispatched anything yet.
      fulfillment: 'pending',
    })
  }

  const total = lineItems.reduce((sum, i) => sum + i.price * i.qty, 0)
  const captured = method !== 'cod'

  return repo.createOrder({
    customerName: String(customerName).trim(),
    customerPhone: String(customerPhone).trim(),
    customerAddress: String(customerAddress).trim(),
    items: lineItems,
    total,
    status: 'pending',
    payment: {
      method,
      status: captured ? 'captured' : 'pending',
      amount: total,
      capturedAt: captured ? new Date().toISOString() : null,
    },
  })
}
