# Multi-Vendor Order Splitting

> **Type:** Explanation (understanding-oriented)
> **Audience:** Developers reviewing the codebase, technical interviewers
> **Goal:** Understand how one customer order becomes multiple vendor sub-orders, and what each party sees

---

## The Problem

A customer buys from three different vendors in one checkout. Each vendor:
- Only sees **their own** items
- Only gets paid **their own** share
- Dispatches independently
- Never sees the customer's full address (unless they're the only vendor)

The platform consolidates everything into one package at a warehouse before shipping to the buyer.

---

## Order Decomposition

When `placeOrder()` runs, each line item carries a `vendorId`:

```javascript
// Single order, three vendors
{
  items: [
    { productId: 'p1', vendorId: 'vendor_A', name: 'Phone Case', price: 2000, qty: 1 },
    { productId: 'p2', vendorId: 'vendor_B', name: 'Screen Protector', price: 1500, qty: 2 },
    { productId: 'p3', vendorId: 'vendor_A', name: 'Charger', price: 5000, qty: 1 },
    { productId: 'p4', vendorId: 'vendor_C', name: 'Earbuds', price: 8000, qty: 1 },
  ],
  total: 18000,
}
```

**Single order, three vendors.** The `total` is the buyer's full amount. But vendors never see this total.

---

## What Each Party Sees

### The Customer (Full View)

```json
{
  "total": 18000,
  "items": [
    { "name": "Phone Case", "price": 2000, "qty": 1, "vendor": "Vendor A" },
    { "name": "Screen Protector", "price": 1500, "qty": 2, "vendor": "Vendor B" },
    { "name": "Charger", "price": 5000, "qty": 1, "vendor": "Vendor A" },
    { "name": "Earbuds", "price": 8000, "qty": 1, "vendor": "Vendor C" }
  ]
}
```

### Vendor A (Projected View)

```json
{
  "subtotal": 7000,
  "items": [
    { "name": "Phone Case", "price": 2000, "qty": 1 },
    { "name": "Charger", "price": 5000, "qty": 1 }
  ],
  "multiSeller": true,
  "sellerCount": 3,
  "customerAddress": null   // Hidden! Ships to warehouse instead
}
```

Vendor A sees **only their items** and **only their subtotal** (₦7,000). They never see the ₦18,000 total, Vendor B's items, or the customer's address.

### Vendor B (Projected View)

```json
{
  "subtotal": 3000,
  "items": [
    { "name": "Screen Protector", "price": 1500, "qty": 2 }
  ],
  "multiSeller": true,
  "sellerCount": 3,
  "customerAddress": null
}
```

### Vendor C (Projected View)

```json
{
  "subtotal": 8000,
  "items": [
    { "name": "Earbuds", "price": 8000, "qty": 1 }
  ],
  "multiSeller": true,
  "sellerCount": 3,
  "customerAddress": null
}
```

---

## Fulfillment State Machine

Each line item has its own fulfillment state:

```
pending → sent → received
```

| State | Who Sets It | Meaning |
|-------|------------|---------|
| `pending` | Default | Vendor hasn't dispatched yet |
| `sent` | Vendor | Items dispatched (to warehouse or buyer) |
| `received` | Admin | Items arrived at warehouse |

### Single-Seller Orders

If the order only has one vendor, the vendor ships **directly to the buyer** — no warehouse leg. They see the customer's address.

### Multi-Seller Orders

Each vendor ships to the **NaijaMart warehouse**. The admin:
1. Waits for all vendors to mark `sent`
2. Confirms arrival (`received`) per vendor group
3. Consolidates into one package
4. Ships to the buyer
5. Marks the order `shipped`

---

## The Warehouse Model

```
Vendor A ──┐
Vendor B ──┼──→  WAREHOUSE  ──→  BUYER
Vendor C ──┘
```

The warehouse address is a **server-side constant** in `vendorOrderView.js`. Vendors never see the buyer's address in multi-seller orders — this prevents them from bypassing the platform and shipping directly.

---

## Admin Fulfillment View

The admin sees the full order with all vendor groups:

```
Order #ABC12345 — 4 items from 3 sellers

┌─────────────────────────────────────────┐
│ Vendor A                                │
│ ├── Phone Case          ₦2,000  [sent] │
│ └── Charger             ₦5,000  [sent] │
│                         ───────         │
│ Status: Dispatched  [Mark received]     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Vendor B                                │
│ └── Screen Protector x2 ₦3,000 [sent]  │
│                         ───────         │
│ Status: Dispatched  [Mark received]     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Vendor C                                │
│ └── Earbuds             ₦8,000 [sent]  │
│                         ───────         │
│ Status: Dispatched  [Mark received]     │
└─────────────────────────────────────────┘

[Ship to buyer]  (enabled only when ALL vendors = received)
```

---

## Escrow Per Vendor

The escrow system also splits by vendor. When the order is paid:

```
capture:  buyer → platform:escrow                    ₦18,000
commission: platform:escrow → platform:revenue (A)   ₦700 (10% of ₦7,000)
commission: platform:escrow → platform:revenue (B)   ₦300 (10% of ₦3,000)
commission: platform:escrow → platform:revenue (C)   ₦800 (10% of ₦8,000)
```

When payouts run, each vendor is paid independently:
```
payout: platform:escrow → seller:A   ₦6,300 (7,000 − 700)
payout: platform:escrow → seller:B   ₦2,700 (3,000 − 300)
payout: platform:escrow → seller:C   ₦7,200 (8,000 − 800)
```

A refund on Vendor A's items only affects Vendor A's payout. Vendor B and C are untouched.

---

## Code References

| File | What It Does |
|------|-------------|
| `server/services/vendorOrderView.js` | Projects orders per vendor — hides other sellers' items and addresses |
| `server/services/orderIntake.js` | Creates the order with vendorId per line item |
| `server/services/money.js` | `vendorSubtotals()` splits escrow by vendor |
| `server/routes/orders.js` | Fulfillment endpoint with vendor-scoped access control |

---

## Design Decisions

1. **One order, not three.** Splitting into separate orders would break the buyer's tracking experience and complicate coupons/payments.

2. **Vendor isolation.** Vendors can't see each other's items or the buyer's full address. This prevents bypass and protects privacy.

3. **Warehouse consolidation.** Multiple packages become one delivery — better UX for the buyer and lower shipping cost.

4. **Independent fulfillment.** Each vendor dispatches on their own schedule. The admin only ships when all vendors have sent their items.
