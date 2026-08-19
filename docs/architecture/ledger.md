# Why a Double-Entry Ledger

> **Type:** Explanation (understanding-oriented)
> **Audience:** Developers, technical reviewers, recruiters evaluating architecture maturity
> **Goal:** Understand why every naira movement is tracked, and why this matters for a real marketplace

---

## What Is Double-Entry Bookkeeping?

Every financial system in the real world — banks, stock exchanges, Jumia, Amazon — uses double-entry bookkeeping. The core principle:

> **Every transaction has two sides: money leaves one account and enters another.**

If you move ₦1,000 from Account A to Account B:
- Account A: −₦1,000
- Account B: +₦1,000

The total across all accounts **never changes**. This makes it impossible for money to appear or disappear — any imbalance is immediately detectable.

---

## Our Account Types

NaijaMart has five account types:

| Account | Purpose | Analogy |
|---------|---------|---------|
| `buyer` | The customer's payment | Your bank account |
| `platform:escrow` | Held funds awaiting delivery | Joint savings account |
| `platform:revenue` | Commission earned by the platform | Company income |
| `platform:operating` | Platform's own money for fronting refunds | Company bank account |
| `seller:<vendorId>` | Each vendor's earned balance | Vendor's payout account |

Money flows between these accounts. The total is always balanced.

---

## How Entries Work

Every ledger entry records:

```
{
  type: 'capture' | 'commission' | 'payout' | 'refund' | 'clawback' | 'commission_reversal',
  orderId: <ObjectId>,
  vendorId: <ObjectId | null>,
  from: 'buyer' | 'platform:escrow' | 'seller:<id>' | ...,
  to: 'platform:escrow' | 'platform:revenue' | 'buyer' | ...,
  amount: 10000,
  reference: 'capture:64f1a2b3c4d5e6f7a8b9c0d1',
  description: 'Payment captured for order ...',
  actor: 'system' | '<adminUserId>'
}
```

### The Reference Field (Idempotency)

The `reference` field is **unique** and is the key to retry safety. Before booking any entry, the system checks:

```
if (await repo.findLedgerEntryByReference(ref)) return []
```

If the reference already exists, the entry is skipped. This means:
- Retrying a payment capture → no double-booking
- Retrying a payout → no double-payment
- Retrying a refund → no double-refund

---

## Example: Full Order Flow

An order for ₦10,000 from one vendor:

### Step 1: Capture (at checkout)

```
capture:        buyer → platform:escrow         ₦10,000
commission:     platform:escrow → platform:revenue   ₦1,000 (10%)
```

**Balances:** escrow = +₦10,000, revenue = +₦1,000, seller = ₦0
**Money held:** ₦10,000 in escrow

### Step 2: Payout (after delivery + 7 days)

```
payout:         platform:escrow → seller:<vendorId>  ₦9,000
```

**Balances:** escrow = ₦0, revenue = +₦1,000, seller = +₦9,000
**Money released:** ₦9,000 to seller, ₦1,000 retained as commission

### Step 3: Refund (if buyer returns — before payout)

```
refund:             platform:escrow → buyer              ₦2,000
commission_reversal: platform:revenue → platform:escrow   ₦200
```

**Balances:** escrow = −₦200, revenue = +₦800, buyer = +₦2,000
**Net:** The seller's pending payout shrinks by ₦1,800

---

## Commission Calculation: The Delta Trick

Commission isn't calculated per-line. It's calculated as a **delta**:

```
commissionDelta = commissionFor(remaining-before) − commissionFor(remaining-after)
```

This prevents rounding drift. If you refund ₦333 from a ₦1,000 order:
- `commissionFor(1000) = ₦100`
- `commissionFor(667) = ₦67`
- `delta = ₦33` (not `commissionFor(333) = ₦33` — but only because this example rounds cleanly)

With per-line rounding, `3 × ₦333 × 10% = ₦100` could differ from `₦1,000 × 10% = ₦100`. The delta approach avoids this.

---

## Why Not Just a Simple Balance?

A simple `{ vendorId, balance }` field would work for the happy path. But it breaks when:

1. **Retries happen** — Without idempotency, a network retry could double-credit a vendor
2. **Refunds are partial** — You need to know *which* lines were refunded and *when*
3. **Auditing is required** — Regulators and accountants need a trail, not just a number
4. **Clawbacks happen** — After payout, you need to reverse from the seller's account and front from operating

The ledger is the single source of truth. Balances are **derived** from entries, never stored.

---

## Code References

| File | What It Does |
|------|-------------|
| `server/models/Ledger.js` | Schema: type, from, to, amount, reference (unique) |
| `server/services/money.js` | `recordPaymentCapture()`, `payoutSeller()`, `refundOrderLines()` |
| `server/routes/ledger.js` | Admin endpoints: list entries, payables, run payouts |

---

## Invariants

These properties are always true:

1. **Σ(from) = Σ(to)** across all entries — total money is conserved
2. **Every reference is unique** — retries are idempotent
3. **Amounts come from order snapshots** — never from client input
4. **Entries are append-only** — no updates, no deletes
5. **Commission is a delta** — rounding can never drift the ledger
