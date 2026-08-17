import { Router } from 'express'
import { repo } from '../store.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { placeOrder } from '../services/orderIntake.js'
import { recordPaymentCapture, refundOrderLines } from '../services/money.js'
import { canSetFulfillment, FULFILLMENT, toVendorOrderView, WAREHOUSE_ADDRESS } from '../services/vendorOrderView.js'

const router = Router()

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

// POST /api/orders - guest checkout from the cart. Thin adapter: validation,
// server-side price/vendor snapshotting and totals all live in the placeOrder
// module, which throws typed errors the global handler maps to responses.
// Card/transfer payments are captured here (the processor seam), booking the
// money into escrow; cod stays pending until the admin marks it captured.
router.post('/', async (req, res) => {
  const order = await placeOrder(req.body)
  if (order.payment?.status === 'captured') {
    await recordPaymentCapture(order)
  }
  res.status(201).json({ order })
})

// GET /api/orders - vendors see only their own line items in orders containing
// their products (plus the warehouse address for multi-seller dispatch); admin
// sees every order in full for collation.
router.get('/', requireAuth, async (req, res) => {
  const { status } = req.query
  if (status && !STATUSES.includes(status)) {
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
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ message: `Status must be one of: ${STATUSES.join(', ')}` })
  }

  const order = await repo.findOrderById(req.params.id)
  if (!order) return res.status(404).json({ message: 'Order not found' })

  const updated = await repo.updateOrderStatus(req.params.id, status)
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

export default router
