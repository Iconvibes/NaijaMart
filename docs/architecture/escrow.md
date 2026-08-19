# How the Escrow System Works

> **Type:** Explanation (understanding-oriented)
> **Audience:** Developers reviewing the codebase, recruiters evaluating architecture decisions
> **Goal:** Understand why money moves the way it does, and why the platform can never lose money

---

## The Problem

In a marketplace with multiple sellers, paying vendors directly at checkout is dangerous. What if:
- The vendor never ships the product?
- The buyer wants a refund?
- The vendor disappears?

**Escrow solves this.** The platform holds the buyer's money. The vendor only gets paid after conditions are met.

---

## The Money Lifecycle

### Stage 1: Checkout

When a buyer places an order:

```
Buyer pays ₦10,000 → Money captured by platform
```

For card/transfer payments, the money is captured immediately. For cash-on-delivery (COD), it stays `pending` until the courier remits the cash and an admin marks it captured.

### Stage 2: Ledger Entry (Auto)

The moment payment is captured, the ledger books two entries:

```
capture:  buyer → platform:escrow         ₦10,000
commission: platform:escrow → platform:revenue  ₦1,000 (10%)
```

The commission is **reserved immediately** — it's never at risk.

### Stage 3: Fulfillment

```
Vendor dispatches items → Admin receives at warehouse → Ships to buyer
```

This is the [fulfillment state machine](multi-vendor.md). The money doesn't move yet — it's sitting in escrow.

### Stage 4: Delivery + Return Window

When the order is marked `delivered`, a clock starts:

```
deliveredAt → 7 days → seller becomes "payable"
```

During these 7 days, the buyer can request a refund. If they do, the money comes from escrow — not from the seller.

### Stage 5: Payout

After the window passes with no refund:

```
payout: platform:escrow → seller:<vendorId>  ₦9,000
```

The seller's share (subtotal minus 10% commission) is released. This is idempotent — running it twice moves nothing.

---

## Visual Flow

```
                    ┌─────────────┐
                    │   CHECKOUT   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  CAPTURE     │  buyer → platform:escrow (full amount)
                    │  + COMMISSION│  platform:escrow → platform:revenue (10%)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  FULFILLMENT │  vendor ships → admin confirms
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  DELIVERED   │  7-day return window starts
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐    │     ┌──────▼──────┐
       │   REFUND     │    │     │   PAYOUT     │
       │ (if needed)  │    │     │ (after 7d)   │
       └─────────────┘    │     └─────────────┘
                          │
                    ┌─────▼─────┐
                    │  COMPLETED │
                    └───────────┘
```

---

## Refund Paths

This is the most important part. The system has **two refund paths** depending on timing:

### Path A: Before Payout (Escrow Reversal)

If the buyer requests a refund **before** the seller has been paid:

```
refund: platform:escrow → buyer         ₦2,000 (refund amount)
commission_reversal: platform:revenue → platform:escrow  ₦200 (10% of refund)
```

The seller's pending share shrinks. The commission is reversed as a **delta** (not per-line rounding) to keep escrow exact.

### Path B: After Payout (Clawback)

If the buyer requests a refund **after** the seller has already been paid:

```
refund: platform:operating → buyer              ₦2,000 (platform fronts the money)
commission_reversal: platform:revenue → platform:operating  ₦200
clawback: seller:<vendorId> → platform:operating  ₦1,800 (seller's share returned)
```

The platform temporarily fronts the refund from operating funds, then claws the seller's share back. Net result: the platform is made whole.

---

## Payout Eligibility

A seller is only payable when **all four conditions** are true:

| # | Condition | Why |
|---|-----------|-----|
| 1 | Payment is `captured` | No money to release if COD hasn't been remitted |
| 2 | Order status is `delivered` | Can't pay before delivery |
| 3 | 7-day return window has elapsed | Buyer needs time to request refunds |
| 4 | No prior payout for this order+vendor | Idempotency — never double-pay |

The check is in `isSellerPayable()` in `server/services/money.js`.

---

## Code References

| File | What It Does |
|------|-------------|
| `server/services/money.js` | All money logic: capture, payout, refund, commission calculation |
| `server/models/Ledger.js` | Double-entry ledger schema with idempotency key |
| `server/routes/ledger.js` | Admin endpoints for payables and payouts |
| `server/services/orderIntake.js` | Order creation with coupon validation |

---

## Why This Design

1. **Platform is safe.** Money enters escrow immediately. Commission is reserved. Even if every vendor disappears, the platform holds the full amount.

2. **Sellers are protected.** Refunds before payout reverse from escrow — the seller never sees the money leave their account.

3. **Buyers are protected.** They can request refunds within 7 days of delivery. The platform fronts the money if the seller has already been paid.

4. **Retries are safe.** Every ledger entry has a unique `reference` key. Retrying a capture or payout books nothing twice.
