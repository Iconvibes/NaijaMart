import { repo } from '../store.js'
import { ValidationError } from '../lib/errors.js'

// The escrow money flow. Buyers pay the platform at checkout; funds sit in the
// platform's escrow account while the order is fulfilled; sellers are paid
// their share (subtotal minus commission) only after the order is delivered
// and the return window has passed. Every movement is a double-entry ledger
// entry keyed by a unique reference, so retries can never double-book.
//
// Accounts: buyer, platform:escrow, platform:revenue (commission),
// platform:operating, seller:<vendorId>.

export const COMMISSION_RATE = 0.1 // 10% of each seller's subtotal
export const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000 // 7 days after delivery

// Rounded to the nearest naira - the ledger only ever deals in whole amounts.
export const commissionFor = (subtotal) => Math.round(subtotal * COMMISSION_RATE)
export const sellerShare = (subtotal) => subtotal - commissionFor(subtotal)

// Line-total per vendor, straight from the frozen order snapshot (refunded
// lines included - this is what was actually captured).
export function vendorSubtotals(order) {
  const byVendor = new Map()
  for (const i of order.items) {
    byVendor.set(String(i.vendorId), (byVendor.get(String(i.vendorId)) || 0) + i.price * i.qty)
  }
  return byVendor
}

// A vendor's still-payable subtotal: every line minus refunded ones. Refunded
// lines are never paid out.
export function payableSubtotal(order, vendorId) {
  const vid = String(vendorId)
  return order.items
    .filter((i) => String(i.vendorId) === vid && !i.refunded)
    .reduce((sum, i) => sum + i.price * i.qty, 0)
}

// Book the buyer's payment into escrow plus each seller's commission. Runs at
// checkout for card/transfer, or when the admin marks a cod order captured.
// Idempotent: the capture reference only books once, ever.
export async function recordPaymentCapture(order) {
  // Nothing to book until the platform actually holds the money.
  if (order.payment?.status !== 'captured') return []
  const ref = `capture:${order.id}`
  if (await repo.findLedgerEntryByReference(ref)) return []

  const entries = []
  entries.push(
    await repo.createLedgerEntry({
      type: 'capture',
      orderId: order.id,
      from: 'buyer',
      to: 'platform:escrow',
      amount: order.total,
      reference: ref,
      description: `Payment captured for order ${order.id}`,
    })
  )
  for (const [vendorId, subtotal] of vendorSubtotals(order)) {
    entries.push(
      await repo.createLedgerEntry({
        type: 'commission',
        orderId: order.id,
        vendorId,
        from: 'platform:escrow',
        to: 'platform:revenue',
        amount: commissionFor(subtotal),
        reference: `commission:${order.id}:${vendorId}`,
        description: `Platform commission (${Math.round(COMMISSION_RATE * 100)}%) on seller share of order ${order.id}`,
      })
    )
  }
  return entries
}

// A seller is payable when the platform actually holds the money (captured),
// the order was delivered, the return window has elapsed, and they have not
// already been paid. `now` is injectable for deterministic tests.
export async function isSellerPayable(order, vendorId, now = Date.now()) {
  const vid = String(vendorId)
  if (order.payment?.status !== 'captured') return false
  if (order.status !== 'delivered') return false
  const deliveredAt = Date.parse(order.deliveredAt || '')
  if (!Number.isFinite(deliveredAt) || now - deliveredAt < RETURN_WINDOW_MS) return false
  if (payableSubtotal(order, vid) <= 0) return false
  const paid = await repo.findLedgerEntryByReference(`payout:${order.id}:${vid}`)
  return !paid
}

export async function payoutReason(order, vendorId, now = Date.now()) {
  const vid = String(vendorId)
  if (order.payment?.status !== 'captured') return 'payment not captured'
  if (order.status !== 'delivered') return 'order not delivered'
  const deliveredAt = Date.parse(order.deliveredAt || '')
  if (!Number.isFinite(deliveredAt) || now - deliveredAt < RETURN_WINDOW_MS) {
    return `within ${RETURN_WINDOW_MS / (24 * 60 * 60 * 1000)}-day return window`
  }
  if (payableSubtotal(order, vid) <= 0) return 'all items refunded'
  if (await repo.findLedgerEntryByReference(`payout:${order.id}:${vid}`)) return 'already paid out'
  return null
}

// Release one seller's share from escrow to their payout account. Idempotent
// and guarded by isSellerPayable, so calling it twice (or for an ineligible
// seller) never moves money twice.
export async function payoutSeller(order, vendorId, { actor = 'system', now = Date.now() } = {}) {
  const vid = String(vendorId)
  const reason = await payoutReason(order, vid, now)
  if (reason) return { paid: false, reason }

  const subtotal = payableSubtotal(order, vid)
  const amount = sellerShare(subtotal)
  const entry = await repo.createLedgerEntry({
    type: 'payout',
    orderId: order.id,
    vendorId: vid,
    from: 'platform:escrow',
    to: `seller:${vid}`,
    amount,
    reference: `payout:${order.id}:${vid}`,
    description: `Seller payout for order ${order.id}`,
    actor,
  })
  return { paid: true, entry }
}

// Scan orders for every seller who is payable right now. Used by the admin
// "run payouts" action; each payout is individually idempotent.
export async function collectPayables(orders, now = Date.now()) {
  const payables = []
  for (const order of orders) {
    for (const vendorId of new Set(order.items.map((i) => String(i.vendorId)))) {
      if (await isSellerPayable(order, vendorId, now)) {
        payables.push({ orderId: order.id, vendorId, amount: sellerShare(payableSubtotal(order, String(vendorId))) })
      }
    }
  }
  return payables
}

// Refund one or more line items, admin-approved. Money comes back to the
// buyer from the right place depending on whether the line's seller was paid:
//
//   before payout  refund: escrow -> buyer            (their share was still
//                  held; no money ever moves seller <-> buyer)
//   after payout   refund: operating -> buyer         (platform fronts)
//                  clawback: seller:<vid> -> operating (seller returns share)
//
// Both paths reverse the platform's commission on the refunded portion, as
// commissionFor(remaining-before) - commissionFor(remaining-after) - computed
// as a delta so rounding can never drift the ledger off balance. Every entry
// carries a reference derived from the line set, so a retried request books
// nothing twice.
export async function refundOrderLines(order, { productIds } = {}, { actor = 'system' } = {}) {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    throw new ValidationError('Select at least one item to refund')
  }
  if (order.payment?.status === 'refunded') {
    throw new ValidationError('This order has already been fully refunded')
  }
  if (order.payment?.status !== 'captured') {
    throw new ValidationError('Only captured payments can be refunded')
  }
  const ids = productIds.map(String)
  if (new Set(ids).size !== ids.length) {
    throw new ValidationError('Duplicate items in the refund request')
  }
  const lines = order.items.filter((i) => ids.includes(String(i.productId)))
  if (lines.length !== ids.length) {
    throw new ValidationError('Some requested items are not on this order')
  }
  if (lines.some((i) => i.refunded)) {
    throw new ValidationError('Some of these items were already refunded')
  }

  const entries = []
  let refundedAmount = 0

  // group the requested lines by seller - each seller group settles on its own
  const groups = new Map()
  for (const line of lines) {
    const vid = String(line.vendorId)
    if (!groups.has(vid)) groups.set(vid, [])
    groups.get(vid).push(line)
  }

  for (const [vid, vendorLines] of groups) {
    const newRefund = vendorLines.reduce((s, i) => s + i.price * i.qty, 0)
    refundedAmount += newRefund

    const full = vendorSubtotals(order).get(vid)
    const alreadyRefunded = order.items
      .filter((i) => String(i.vendorId) === vid && i.refunded)
      .reduce((s, i) => s + i.price * i.qty, 0)
    const remaining = full - alreadyRefunded - newRefund
    // Delta of commissions, not per-line rounding - keeps escrow exact.
    const commissionDelta = commissionFor(full - alreadyRefunded) - commissionFor(remaining)

    const refBase = `refund:${order.id}:${vid}:${vendorLines.map((i) => String(i.productId)).sort().join('+')}`
    const paid = await repo.findLedgerEntryByReference(`payout:${order.id}:${vid}`)

    if (paid) {
      // Seller already received their share - the platform fronts the buyer
      // and claws the share back from the seller's account.
      if (!(await repo.findLedgerEntryByReference(refBase))) {
        // The buyer is refunded from operating funds here, so the commission
        // reversal replenishes operating (not escrow): operating fronts the
        // line amount and gets it back as clawback + reversal, netting zero.
        entries.push(
          await repo.createLedgerEntry({
            type: 'refund', orderId: order.id, vendorId: vid, from: 'platform:operating', to: 'buyer',
            amount: newRefund, reference: refBase, description: `Refund of refunded line(s) for order ${order.id}`, actor,
          }),
          await repo.createLedgerEntry({
            type: 'commission_reversal', orderId: order.id, vendorId: vid, from: 'platform:revenue', to: 'platform:operating',
            amount: commissionDelta, reference: `${refBase}:commission`, description: `Commission reversal on refunded line(s) for order ${order.id}`, actor,
          }),
          await repo.createLedgerEntry({
            type: 'clawback', orderId: order.id, vendorId: vid, from: `seller:${vid}`, to: 'platform:operating',
            amount: newRefund - commissionDelta, reference: `${refBase}:clawback`,
            description: `Seller share clawed back after refund on order ${order.id}`, actor,
          })
        )
      }
    } else if (!(await repo.findLedgerEntryByReference(refBase))) {
      // Still in escrow - reverse both sides of the same transaction.
      entries.push(
        await repo.createLedgerEntry({
          type: 'refund', orderId: order.id, vendorId: vid, from: 'platform:escrow', to: 'buyer',
          amount: newRefund, reference: refBase, description: `Refund of line(s) for order ${order.id}`, actor,
        }),
        await repo.createLedgerEntry({
          type: 'commission_reversal', orderId: order.id, vendorId: vid, from: 'platform:revenue', to: 'platform:escrow',
          amount: commissionDelta, reference: `${refBase}:commission`, description: `Commission reversal on refunded line(s) for order ${order.id}`, actor,
        })
      )
    }
  }

  const updated = await repo.updateOrderRefunded(order.id, ids, true)
  const allRefunded = updated.items.every((i) => i.refunded)
  const final = allRefunded ? await repo.updateOrderPayment(order.id, { status: 'refunded' }) : updated
  return { order: final, entries, refundedAmount }
}
