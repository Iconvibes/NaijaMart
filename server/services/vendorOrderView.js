// Per-vendor view of an Order, plus the fulfilment state machine.
//
// In the warehouse model a seller only ever sees the line items that belong to
// them. For multi-seller orders the buyer's street address is withheld (the
// seller ships to the NaijaMart warehouse for consolidation); for single-seller
// orders there is nothing to consolidate, so the seller ships straight to the
// buyer and keeps the address. The buyer's name and phone stay visible either
// way - sellers may need to contact the buyer about fulfilment.
//
// Fulfilment per line item: pending -> sent -> received
//   pending   the seller has not dispatched the item
//   sent      the seller dispatched it (to the warehouse, or to the buyer
//             directly for single-seller orders)
//   received  the admin confirmed it arrived at the warehouse
// Only the admin may change an order's overall status - shipping the
// consolidated package is the admin's job.

export const WAREHOUSE_ADDRESS = 'NaijaMart Fulfilment Centre, 14 Oba Akran Ave, Ikeja, Lagos'

export const FULFILLMENT = ['pending', 'sent', 'received']

// Who may move an item between which states. Vendors can dispatch their own
// items and undo a dispatch; the admin confirms arrivals at the warehouse.
export function canSetFulfillment(role, from, to) {
  if (!FULFILLMENT.includes(to)) return false
  if (role === 'admin') return true
  if (role === 'vendor') {
    return (from === 'pending' && to === 'sent') || (from === 'sent' && to === 'pending')
  }
  return false
}

// Project an order the way a vendor should see it: only their line items,
// their share of the total, and how many sellers are fulfilling the order.
// The buyer's street address is included only when this vendor is the sole
// seller (they ship straight to the buyer); multi-seller orders consolidate
// at the warehouse, so the seller gets the warehouse address instead.
export function toVendorOrderView(order, vendorId) {
  const vid = String(vendorId)
  const items = order.items.filter((i) => String(i.vendorId) === vid)
  const sellerCount = new Set(order.items.map((i) => String(i.vendorId))).size
  const multiSeller = sellerCount > 1

  return {
    id: order.id,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    // Never expose the buyer's street address for multi-seller orders.
    customerAddress: multiSeller ? null : order.customerAddress,
    items,
    // The vendor's share of the order - what they're paid for. The full
    // order total is withheld: it would reveal other sellers' earnings.
    subtotal: items.reduce((sum, i) => sum + i.price * i.qty, 0),
    sellerCount,
    multiSeller,
    status: order.status,
    createdAt: order.createdAt,
  }
}
