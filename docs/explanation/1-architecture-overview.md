# Architecture Overview

How NaijaMart is designed and why.

## What NaijaMart Is

NaijaMart is a multi-vendor e-commerce marketplace. Customers buy products from multiple vendors through a single storefront. Money flows through the platform (escrow), not directly to sellers.

## High-Level Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │────▶│  Vite Dev /  │────▶│  Express    │
│  (React)    │     │  dist/ (SPA) │     │  API Server │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                │
                              ┌─────────────────┼─────────────────┐
                              │                 │                 │
                        ┌─────▼─────┐    ┌──────▼──────┐   ┌────▼────┐
                        │  MongoDB  │    │  Socket.io  │   │ External│
                        │  (or in-  │    │  (realtime) │   │ Services│
                        │  memory)  │    └─────────────┘   └─────────┘
                        └───────────┘
```

## Two Runtime Modes

| Mode | Data Store | Use Case |
|------|-----------|----------|
| **Development** | In-memory JavaScript objects | Demos, quick start, no database needed |
| **Production** | MongoDB via Mongoose | Persistent storage, real deployments |

The `isMemoryDb()` flag gates every data operation. The app works identically in both modes — same API, same frontend, same tests.

## Core Design Decisions

### 1. Server is the Price Authority

Prices are **never** trusted from the client. When an order is placed, `orderIntake.js` re-fetches each product from the catalog and snapshots the current price into the order. This prevents a shopper from modifying prices in the browser.

### 2. Escrow, Not Direct Payment

Money flows: Buyer → Platform Escrow → Seller (after delivery + return window). The platform holds funds while the order is fulfilled. This protects buyers from non-delivery and gives the platform leverage for refunds.

### 3. Double-Entry Ledger

Every money movement is recorded as a ledger entry with a `from` and `to` account. Entries carry unique `reference` keys for idempotency — retried operations never double-book. This is the same accounting model used by banks.

### 4. Per-Vendor Order Views

In a multi-seller order, each vendor only sees their own line items and their share of the total. The buyer's street address is hidden for multi-seller orders (items consolidate at the warehouse). This prevents information leakage between vendors.

### 5. Fire-and-Forget Notifications

External service calls (WhatsApp, email, Socket.io push) are async and never block the response. Failed notifications go to a dead letter queue. The app works fully without any external service configured.

### 6. Dual-Branch Data Access

Every data operation has two code paths — one for in-memory, one for MongoDB. This is the fundamental constraint that makes the demo mode work. New features must always implement both branches.

## Request Lifecycle

### 1. Checkout

```
Client → POST /api/orders → orderIntake.placeOrder()
  → Validate customer details
  → Fetch each product from catalog (price snapshot)
  → Validate/reserve coupon (atomic CAS)
  → Create order in database
  → If card/transfer: recordPaymentCapture() → ledger entries
  → Fire-and-forget: WhatsApp to vendors, Socket.io push, email to customer
  → Return order to client
```

### 2. Vendor Fulfillment

```
Vendor → PATCH /api/orders/:id/fulfillment → status: "sent"
  → Verify vendor owns items in this order
  → Update fulfillment status per line item
  → Return vendor-scoped order view

Admin → PATCH /api/orders/:id/fulfillment → status: "received"
  → Confirm items arrived at warehouse
```

### 3. Payout

```
Admin → POST /api/ledger/payouts
  → Scan all orders for eligible sellers
  → Eligibility: captured + delivered + return window elapsed + not already paid
  → For each eligible seller: payoutSeller() → ledger entry
  → Vendor can then request withdrawal
```

## Key Invariants

1. **Ledger always balances** — Every `capture` entry has matching `commission` entries. Every `refund` reverses the original. Rounding deltas keep escrow exact.
2. **Payout is idempotent** — Calling `payoutSeller()` twice for the same order+vendor is safe (reference key prevents double-booking).
3. **Coupon reservation is atomic** — Compare-and-swap loop prevents two concurrent checkouts from overspending a coupon's `maxUses`.
4. **Prices are frozen** — Order items snapshot the catalog price at checkout time. Later price changes don't affect existing orders.

## File Responsibility Map

| Concern | Primary File |
|---------|-------------|
| HTTP routing | `server/routes/*.js` |
| Data access (dual-branch) | `server/store.js` |
| Order intake + validation | `server/services/orderIntake.js` |
| Escrow + money flow | `server/services/money.js` |
| Vendor order projection | `server/services/vendorOrderView.js` |
| External notifications | `server/services/whatsapp.js`, `email.js` |
| Realtime push | `server/services/realtime.js` |
| Resilience (retry, circuit breakers) | `server/lib/resilience.js` |
| Frontend routing | `src/App.jsx` |
| API client | `src/api.js` |
| Auth state | `src/context/AuthProvider.jsx` |
| Cart state | `src/context/CartProvider.jsx` |
| Product cache | `src/productSource.js` |
