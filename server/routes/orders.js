import express from 'express'
import { Router } from 'express'
import { repo } from '../store.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { placeOrder } from '../services/orderIntake.js'
import { recordPaymentCapture, refundOrderLines } from '../services/money.js'
import { notifyVendors } from '../services/whatsapp.js'
import { notifyUser } from '../services/realtime.js'
import { sendOrderConfirmation, sendShippingUpdate } from '../services/email.js'
import { canSetFulfillment, FULFILLMENT, toVendorOrderView, WAREHOUSE_ADDRESS } from '../services/vendorOrderView.js'
import { getPaymentProvider } from '../services/paymentProvider.js'
import { canTransition, assertTransition, ORDER_STATUSES } from '../services/orderStateMachine.js'

const router = Router()

// GET /api/orders/lookup/:id - public order tracking. Verifies the phone
// number matches so random browsing can't enumerate orders.
router.get('/lookup/:id', async (req, res) => {
  const order = await repo.findOrderById(req.params.id)
  if (!order) return res.status(404).json({ message: 'Order not found' })

  const phone = (req.query.phone || '').trim().replace(/[^0-9+]/g, '')
  if (!phone) return res.status(400).json({ message: 'Phone number is required' })

  const orderPhone = (order.customerPhone || '').trim().replace(/[^0-9+]/g, '')
  if (orderPhone !== phone) {
    return res.status(404).json({ message: 'Order not found' })
  }

  // Return a stripped view — no vendor breakdown, just customer-facing info
  res.json({
    order: {
      id: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail || null,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      items: order.items.map((i) => ({
        name: i.name,
        image: i.image,
        price: i.price,
        qty: i.qty,
        fulfillment: i.fulfillment,
        refunded: i.refunded,
      })),
      total: order.total,
      status: order.status,
      payment: { method: order.payment?.method, status: order.payment?.status },
      deliveredAt: order.deliveredAt,
      createdAt: order.createdAt,
    },
  })
})

// POST /api/orders - guest checkout from the cart. Thin adapter: validation,
// server-side price/vendor snapshotting and totals all live in the placeOrder
// module, which throws typed errors the global handler maps to responses.
// Card/transfer payments are captured here (the processor seam), booking the
// money into escrow; cod stays pending until the admin marks it captured.
const orderRateLimit = rateLimit({ windowMs: 60_000, max: 5, message: 'Too many orders — please wait a minute before trying again' })
router.post('/', orderRateLimit, async (req, res) => {
  // Attach the logged-in user's ID and email so the order can be linked
  // to their account for reviews and email notifications.
  let customerId = null
  let customerEmail = req.body?.customerEmail || null

  // Resolve the logged-in user from JWT — either from Authorization header
  // or from the HttpOnly cookie (browser clients).
  async function resolveUser(token) {
    try {
      const jwt = await import('jsonwebtoken')
      const { JWT_SECRET } = await import('../middleware/auth.js')
      const payload = jwt.default.verify(token, JWT_SECRET)
      return await repo.findUserById(payload.id)
    } catch { return null }
  }

  let user = null
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) {
    user = await resolveUser(header.slice(7))
  } else {
    // Cookie auth: parse JWT from the token cookie
    const { parseCookies } = await import('../middleware/csrf.js')
    const cookies = parseCookies(req)
    if (cookies.token) {
      user = await resolveUser(cookies.token)
    }
  }
  if (user) {
    customerId = user.id
    if (!customerEmail) customerEmail = user.email
  }
  // Merge server-detected fields into the body for placeOrder
  req.body.customerId = customerId
  if (customerEmail) req.body.customerEmail = customerEmail
  const order = await placeOrder(req.body)
  // Payment is always 'pending' after placeOrder — capture happens only
  // via verifyPayment (card/transfer) or admin capture (COD). No auto-capture.
  // Notify vendors via WhatsApp + realtime (fire-and-forget)
  notifyVendors(order, repo).catch((err) =>
    console.error('WhatsApp notification error:', err.message)
  )
  // Notify each vendor in the order via Socket.io
  const vendorIds = [...new Set(order.items.map((i) => String(i.vendorId)))]
  for (const vid of vendorIds) {
    notifyUser(vid, {
      type: 'new_order',
      message: `New order! #${String(order.id).slice(-8).toUpperCase()} — ${order.items.length} item(s), total ${order.total.toLocaleString()}`,
      link: '/vendor/orders',
    }).catch(() => {})
  }
  // Send order confirmation email (fire-and-forget)
  sendOrderConfirmation(order).catch(() => {})
  res.status(201).json({ order })
})

// GET /api/orders - vendors see only their own line items in orders containing
// their products (plus the warehouse address for multi-seller dispatch); admin
// sees every order in full for collation.
router.get('/', requireAuth, async (req, res) => {
  const { status } = req.query
  if (status && !ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Unknown order status' })
  }
  if (req.user.role === 'admin') {
    return res.json({ orders: await repo.findOrders({ status }) })
  }
  if (req.user.role === 'vendor') {
    const orders = await repo.findOrders({ vendorId: req.user.id, status })
    return res.json({
      warehouseAddress: WAREHOUSE_ADDRESS,
      orders: orders.map((o) => toVendorOrderView(o, req.user.id)),
    })
  }
  return res.status(403).json({ message: 'Orders are only visible to vendors and admins' })
})

// PATCH /api/orders/:id/status - admin only. Shipping the consolidated order
// is the admin's job; sellers move their own line items via /fulfillment.
router.patch('/:id/status', requireAuth, requireRole('admin'), async (req, res) => {
  const { status } = req.body || {}
  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ message: `Status must be one of: ${ORDER_STATUSES.join(', ')}` })
  }

  const order = await repo.findOrderById(req.params.id)
  if (!order) return res.status(404).json({ message: 'Order not found' })

  // Enforce state machine: prevent invalid transitions
  if (!canTransition(order.status, status)) {
    return res.status(400).json({
      message: `Cannot transition from '${order.status}' to '${status}'`,
    })
  }

  const updated = await repo.updateOrderStatus(req.params.id, status)
  // Notify customer of status change (fire-and-forget)
  notifyUser(updated.items[0]?.vendorId, {
    type: 'order_status',
    message: `Order #${String(updated.id).slice(-8).toUpperCase()} status updated to ${status}`,
    link: '/vendor/orders',
  }).catch(() => {})
  sendShippingUpdate(updated, status).catch(() => {})
  res.json({ order: updated })
})

// POST /api/orders/:id/refund - admin only. Refunds one or more line items:
// reversed from escrow before the seller is paid, clawed back after. Per-line,
// idempotent, and fully ledgered.
router.post('/:id/refund', requireAuth, requireRole('admin'), async (req, res) => {
  const order = await repo.findOrderById(req.params.id)
  if (!order) return res.status(404).json({ message: 'Order not found' })
  const result = await refundOrderLines(order, { productIds: req.body?.productIds }, { actor: req.user.id })
  res.json(result)
})

// PATCH /api/orders/:id/payment - admin only. Marks a cod order's payment as
// captured (the courier remitted the cash) and books it into escrow.
// For card/transfer, this should only be used after provider verification.
router.patch('/:id/payment', requireAuth, requireRole('admin'), async (req, res) => {
  const { action } = req.body || {}
  const order = await repo.findOrderById(req.params.id)
  if (!order) return res.status(404).json({ message: 'Order not found' })
  if (action !== 'capture') {
    return res.status(400).json({ message: 'Action must be: capture' })
  }
  if (order.payment.status === 'captured') {
    return res.json({ order }) // already captured - idempotent
  }
  if (order.payment.status === 'refunded') {
    return res.status(400).json({ message: 'Cannot capture a refunded order' })
  }

  // For card/transfer orders, verify with the provider first
  if (order.payment?.method !== 'cod' && order.payment?.reference) {
    const provider = getPaymentProvider()
    try {
      const result = await provider.verifyPayment(order.payment.reference)
      if (result.status !== 'captured') {
        return res.status(400).json({ message: `Payment provider reports status: ${result.status}` })
      }
    } catch (err) {
      return res.status(502).json({ message: 'Payment provider verification failed' })
    }
  }

  const updated = await repo.updateOrderPayment(req.params.id, { status: 'captured', capturedAt: new Date().toISOString() })
  const entries = await recordPaymentCapture(updated)
  res.json({ order: updated, ledgerEntries: entries })
})

// PATCH /api/orders/:id/fulfillment - vendors dispatch their own items
// (pending <-> sent); the admin confirms arrivals at the warehouse (received).
router.patch('/:id/fulfillment', requireAuth, requireRole('vendor', 'admin'), async (req, res) => {
  const { fulfillment, vendorId } = req.body || {}

  let targetVendor = vendorId
  if (req.user.role === 'vendor') {
    // Vendors act only on their own items, and only to dispatch or undo.
    targetVendor = req.user.id
    const order = await repo.findOrderById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    const mine = order.items.find((i) => String(i.vendorId) === String(req.user.id))
    if (!mine) return res.status(403).json({ message: 'You can only fulfil orders that contain your products' })
    if (!canSetFulfillment('vendor', mine.fulfillment, fulfillment)) {
      return res.status(400).json({ message: `Vendors may only mark their items as sent or undo that (from ${mine.fulfillment} to ${fulfillment || '(none)'})` })
    }
  } else {
    if (!FULFILLMENT.includes(fulfillment)) {
      return res.status(400).json({ message: `Fulfilment must be one of: ${FULFILLMENT.join(', ')}` })
    }
    if (!targetVendor) return res.status(400).json({ message: 'vendorId is required to mark a seller group received' })
  }

  const updated = await repo.updateOrderFulfillment(req.params.id, targetVendor, fulfillment)
  if (!updated) return res.status(404).json({ message: 'Order or seller group not found' })
  // Vendors get the projected view back, never the raw order with other
  // sellers' line items.
  const view = req.user.role === 'vendor' ? toVendorOrderView(updated, req.user.id) : updated
  res.json({ order: view })
})

// POST /api/orders/:id/verify-payment - Verify a card/transfer payment.
// The customer (or frontend after redirect) calls this with the payment
// reference. The server verifies with the provider before marking captured.
router.post('/:id/verify-payment', async (req, res) => {
  const order = await repo.findOrderById(req.params.id)
  if (!order) return res.status(404).json({ message: 'Order not found' })

  if (order.payment?.method === 'cod') {
    return res.status(400).json({ message: 'COD orders are paid on delivery' })
  }
  if (order.payment?.status === 'captured') {
    return res.json({ order, message: 'Payment already captured' })
  }
  if (order.payment?.status === 'refunded') {
    return res.status(400).json({ message: 'This order has been refunded' })
  }

  const reference = order.payment?.reference
  if (!reference) {
    return res.status(400).json({ message: 'No payment reference found for this order' })
  }

  try {
    const provider = getPaymentProvider()
    const result = await provider.verifyPayment(reference)

    if (result.status === 'captured') {
      // Idempotent: already captured won't double-book
      if (order.payment?.status !== 'captured') {
        const updated = await repo.updateOrderPayment(order.id, {
          status: 'captured',
          capturedAt: new Date().toISOString(),
        })
        await recordPaymentCapture(updated)
        // Notify vendors (fire-and-forget)
        notifyVendors(updated, repo).catch(() => {})
        sendOrderConfirmation(updated).catch(() => {})
        const vendorIds = [...new Set(updated.items.map((i) => String(i.vendorId)))]
        for (const vid of vendorIds) {
          notifyUser(vid, {
            type: 'new_order',
            message: `Payment confirmed for order #${String(updated.id).slice(-8).toUpperCase()}`,
            link: '/vendor/orders',
          }).catch(() => {})
        }
        return res.json({ order: updated, verified: true })
      }
      return res.json({ order, verified: true, message: 'Payment already captured' })
    }

    return res.status(400).json({ message: 'Payment not yet confirmed by provider', status: result.status })
  } catch (err) {
    console.error(`[PaymentProvider] Verification failed for order ${order.id}:`, err.message)
    return res.status(502).json({ message: 'Payment verification failed. Please try again.' })
  }
})

// POST /api/orders/webhook/payment - Payment provider webhook callback.
// Verifies the webhook signature and processes the payment event.
// This is the authoritative source for payment status changes.
router.post('/webhook/payment', express.json({ limit: '1mb' }), async (req, res) => {
  // In production, validate webhook signature here:
  // const signature = req.headers['x-webhook-signature']
  // if (!validateWebhookSignature(req.body, signature)) {
  //   return res.status(401).json({ message: 'Invalid webhook signature' })
  // }

  const { event, reference, status, amount, currency } = req.body || {}

  if (!event || !reference) {
    return res.status(400).json({ message: 'Missing event or reference' })
  }

  // Find the order by payment reference
  const orders = await repo.findOrders({})
  const order = orders.find((o) => o.payment?.reference === reference)
  if (!order) {
    console.warn(`[Webhook] No order found for reference: ${reference}`)
    return res.status(404).json({ message: 'Order not found' })
  }

  // Idempotent: already captured, skip
  if (order.payment?.status === 'captured') {
    return res.json({ ok: true, message: 'Already processed' })
  }

  // Verify amount matches
  if (amount != null && amount !== order.payment?.amount) {
    console.error(`[Webhook] Amount mismatch for ${reference}: expected ${order.payment?.amount}, got ${amount}`)
    return res.status(400).json({ message: 'Amount mismatch' })
  }

  // Verify currency
  if (currency && currency !== 'NGN') {
    return res.status(400).json({ message: 'Currency mismatch' })
  }

  switch (event) {
    case 'payment.success':
    case 'charge.success': {
      const updated = await repo.updateOrderPayment(order.id, {
        status: 'captured',
        capturedAt: new Date().toISOString(),
      })
      await recordPaymentCapture(updated)
      notifyVendors(updated, repo).catch(() => {})
      sendOrderConfirmation(updated).catch(() => {})
      const vendorIds = [...new Set(updated.items.map((i) => String(i.vendorId)))]
      for (const vid of vendorIds) {
        notifyUser(vid, {
          type: 'new_order',
          message: `Payment confirmed for order #${String(updated.id).slice(-8).toUpperCase()}`,
          link: '/vendor/orders',
        }).catch(() => {})
      }
      console.log(`[Webhook] Payment captured for order ${order.id} via ${reference}`)
      break
    }
    case 'payment.failed':
    case 'charge.failed': {
      console.log(`[Webhook] Payment failed for order ${order.id}: ${reference}`)
      // Don't change order status - customer can retry
      break
    }
    default:
      console.warn(`[Webhook] Unknown event type: ${event}`)
  }

  res.json({ ok: true })
})

export default router
