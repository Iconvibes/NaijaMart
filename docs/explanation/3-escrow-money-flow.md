# The Escrow & Money Flow

How money moves through NaijaMart, from buyer payment to seller payout.

## Overview

NaijaMart operates an escrow model: buyers pay the platform, not the seller. Money sits in escrow while the order is fulfilled. Sellers are paid only after delivery + a 7-day return window. This protects both buyers (refund guarantee) and the platform (commission assurance).

## Account Model

The ledger tracks money across these accounts:

| Account | Purpose |
|---------|---------|
| `buyer` | The customer's payment source |
| `platform:escrow` | Holding area for captured payments |
| `platform:revenue` | Platform's commission earnings |
| `platform:operating` | Platform's operational funds (used for post-payout refunds) |
| `seller:<vendorId>` | Each vendor's payable balance |

## Money Lifecycle

### 1. Checkout (Payment Capture)

**Card/transfer:** Captured immediately at checkout.

```
capture: buyer → platform:escrow        ₦10,000 (order total)
commission: platform:escrow → platform:revenue  ₦1,000 (10%)
```

**COD (Cash on Delivery):** Payment stays `pending` until the admin marks it captured (courier remits cash).

### 2. Fulfillment

No money moves during fulfillment. The order status progresses:
```
pending → processing → shipped → delivered
```

### 3. Payout (After Return Window)

After delivery + 7 days with no refund:

```
payout: platform:escrow → seller:<vendorId>  ₦9,000 (subtotal minus commission)
```

### 4. Refund (Before Payout)

If the buyer requests a refund before the seller is paid:

```
refund: platform:escrow → buyer              ₦10,000
commission_reversal: platform:revenue → platform:escrow  ₦1,000
```

### 5. Refund (After Payout)

If the seller has already been paid, the platform fronts the refund and claws back from the seller:

```
refund: platform:operating → buyer           ₦10,000
commission_reversal: platform:revenue → platform:operating  ₦1,000
clawback: seller:<vendorId> → platform:operating  ₦9,000
```

## Commission

- **Rate:** 10% of each seller's subtotal
- **Calculated as:** `Math.round(subtotal * 0.1)`
- **Deducted at capture time** — commission is reserved in `platform:revenue` immediately
- **Reversed on refund** — only the delta is reversed (not per-line rounding)

## Return Window

- **Duration:** 7 days after delivery
- **Purpose:** Allows buyers to report issues before sellers are paid
- **Payout eligibility:** `captured + delivered + return window elapsed + not already paid + items not fully refunded`

## Idempotency

Every ledger entry carries a unique `reference` key:

| Entry Type | Reference Format |
|-----------|-----------------|
| Capture | `capture:<orderId>` |
| Commission | `commission:<orderId>:<vendorId>` |
| Payout | `payout:<orderId>:<vendorId>` |
| Refund | `refund:<orderId>:<vendorId>:<sorted-productIds>` |

Before booking any entry, the system checks if a matching reference already exists. If so, it skips — preventing double-booking on retries.

## Rounding Safety

All amounts are whole naira (rounded). Commission deltas are computed as `commissionFor(before) - commissionFor(after)`, not per-line. This prevents rounding drift that could leave the ledger off-balance.

## Multi-Vendor Orders

When an order contains products from multiple vendors:

1. **Capture** — one entry for the full order total, separate commission entries per vendor
2. **Payout** — each vendor is paid independently based on their line items
3. **Refund** — each vendor's lines are refunded independently; commission reversal is per-vendor

## Withdrawal

After payout, vendors accumulate a balance. They can request a withdrawal:

1. Vendor requests withdrawal (min ₦1,000)
2. Admin reviews and approves
3. Admin marks as paid (bank transfer sent)
4. Vendor's balance decreases

## Ledger Integrity

The ledger is append-only. Entries are never modified or deleted. The health check endpoint reports the dead letter queue size, and the admin dashboard shows recent ledger entries for audit.

## Key Invariants

1. **Every naira is tracked** — money in = money out + balance
2. **Idempotent operations** — retrying any operation is safe
3. **Commission is always collected** — even on refunds (reversed proportionally)
4. **Sellers can't be overpaid** — payout checks prevent double-payment
5. **Refunds are auditable** — every refund creates 2-3 ledger entries with clear provenance
