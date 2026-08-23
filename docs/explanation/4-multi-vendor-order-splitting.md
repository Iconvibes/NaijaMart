# Multi-Vendor Order Splitting

How one customer order splits across multiple vendors and why the warehouse model exists.

## The Problem

A customer adds products from Vendor A and Vendor B to their cart. They checkout once, pay once. But Vendor A and Vendor B are separate businesses — they each need to fulfill their own items independently.

## The Solution: Warehouse Consolidation

NaijaMart uses a warehouse model:

1. **Customer places one order** containing items from multiple vendors
2. **Each vendor ships their items** to the NaijaMart Fulfilment Centre (warehouse)
3. **Admin confirms arrival** at the warehouse
4. **Admin ships the consolidated package** to the buyer as one delivery

### Warehouse Address

```
NaijaMart Fulfilment Centre, 14 Oba Akran Ave, Ikeja, Lagos
```

This is a constant defined in `server/services/vendorOrderView.js`.

## How It Works in Code

### Order Creation

When `placeOrder()` creates an order, each line item carries:
- `productId` — which product
- `vendorId` — which vendor owns this product
- `price` — snapshotted from the catalog
- `fulfillment: "pending"` — each line starts as pending

A single order can have items from 5 different vendors. They all share the same `orderId`.

### Vendor Order View

When a vendor fetches their orders (`GET /api/orders`), the server calls `toVendorOrderView(order, vendorId)`:

```javascript
function toVendorOrderView(order, vendorId) {
  const items = order.items.filter(i => String(i.vendorId) === vendorId)
  const sellerCount = new Set(order.items.map(i => i.vendorId)).size
  const multiSeller = sellerCount > 1

  return {
    id: order.id,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerAddress: multiSeller ? null : order.customerAddress,  // ← KEY
    items,  // ← Only THIS vendor's items
    subtotal: items.reduce((sum, i) => sum + i.price * i.qty, 0),  // ← Only their share
    sellerCount,
    multiSeller,
  }
}
```

**What the vendor sees:**
- Only their own line items (not other vendors')
- Only their subtotal (not the full order total)
- The buyer's street address **only if** they're the sole seller
- The warehouse address **if** there are multiple sellers

**What the vendor never sees:**
- Other vendors' items or earnings
- The full order total (would reveal other sellers' revenue)
- The buyer's street address in multi-seller orders

### Fulfillment Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Vendor A  │     │   Vendor B  │     │    Admin    │     │    Buyer    │
│  (pending)  │     │  (pending)  │     │             │     │             │
└──────┬──────┘     └──────┬──────┘     └─────────────┘     └─────────────┘
       │                   │
       ▼                   ▼
  Mark "sent"         Mark "sent"
  (ship to            (ship to
  warehouse)          warehouse)
       │                   │
       └────────┬──────────┘
                │
                ▼
        ┌──────────────┐
        │   Warehouse  │
        │  (received)  │
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │  Admin: Mark │
        │  all received│
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │  Admin: Ship │
        │  to buyer    │
        │  (shipped)   │
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │  Delivered   │
        └──────────────┘
```

### Fulfillment State Machine

Per line item: `pending → sent → received`

| State | Who sets it | Meaning |
|-------|------------|---------|
| `pending` | (default) | Vendor has not dispatched |
| `sent` | Vendor | Vendor shipped to warehouse (or directly to buyer for single-seller) |
| `received` | Admin | Admin confirmed arrival at warehouse |

**Rules:**
- Vendors can only toggle between `pending` ↔ `sent`
- Only admin can set `received`
- Only admin can change the order's overall status (`pending` → `processing` → `shipped` → `delivered`)

### Single-Seller Orders

When an order has only one vendor:
- The vendor sees the buyer's full address
- The vendor ships directly to the buyer (no warehouse leg)
- The `multiSeller` flag is `false`

## Why This Design?

1. **Buyer simplicity** — One checkout, one delivery, one tracking number
2. **Vendor isolation** — Vendors never see each other's data
3. **Consolidation** — Multiple packages merge into one delivery (cheaper shipping)
4. **Admin control** — The platform manages the warehouse and final delivery
5. **Information hiding** — Vendors can't learn about competitors' pricing or volume

## Impact on Other Systems

- **Escrow:** Commission is calculated per-vendor based on their line items
- **Payout:** Each vendor is paid independently for their share
- **Refund:** Refunds are per-line-item, per-vendor
- **Reviews:** Reviews are per-product, linked to the vendor who sold it
- **Notifications:** Each vendor gets notified only about their items
