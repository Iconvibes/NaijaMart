# Domain Glossary

Terms the codebase uses for marketplace concepts. Architecture work keeps this
current; reviews use these names instead of inventing new ones.

- **Order** — a customer's purchase. Snapshots each line item (product, price,
  quantity, vendor) at checkout time so the order survives later catalog edits.
  Every line carries a `vendorId`, enabling per-vendor order views and status
  updates.
- **Order intake** — the use case that turns a cart plus delivery details into
  an Order: validates input, snapshots server-side prices and vendor
  attribution, clamps quantities, computes the total, persists. Lives in
  `server/services/orderIntake.js` behind the thin HTTP route.
- **Product** — a listing owned by a vendor; carries a `vendorId`. Prices are
  only ever authoritative on the server.
- **Vendor** — a seller account. Sees orders containing its products and
  updates their status; the Order intake module never trusts vendor or price
  fields from the client.
- **Cart** — the shopper's pending selection, held client-side and sent to
  Order intake at checkout.
- **ProductSource** — the storefront's single read path for the Product list
  (`src/productSource.js`). Caches the in-flight request so concurrent mounts
  issue one call; `invalidateProducts()` is the explicit contract vendor pages
  call after catalog mutations. The static catalog is NOT an adapter here — its
  products have no database identity and can't be ordered, so pages seed it as
  `initialData` instead.
- **Vendor order view** — the projection (`server/services/vendorOrderView.js`)
  that decides what a seller may see of an Order: only their own line items and
  their `subtotal`, never other sellers' items or the full order total.
  Multi-seller orders withhold the buyer's street address (sellers ship to the
  warehouse instead); single-seller orders ship straight to the buyer, so the
  address is kept.
- **Fulfilment** — the per-line-item dispatch state machine: `pending` (seller
  hasn't dispatched) → `sent` (seller dispatched, to the warehouse or the
  buyer) → `received` (admin confirmed arrival at the warehouse). Sellers move
  their own items between pending/sent; only the admin sets `received` and only
  the admin changes an Order's overall status (the consolidated package is the
  admin's to ship). The warehouse address is a server-side constant in
  `vendorOrderView.js`.
- **Payment** — how the buyer paid (card/transfer/cod) and whether the platform
  holds the money (`pending`/`captured`/`refunded`). card/transfer are captured
  at checkout; cod stays `pending` until the courier remits and the admin marks
  it captured. Money is only ever released to sellers from a captured payment.
- **Ledger** — the double-entry money trail (`server/models/Ledger.js`). Every
  movement is an append-only entry moving an amount from one account to another
  (`buyer`, `platform:escrow`, `platform:revenue`, `platform:operating`,
  `seller:<vendorId>`), keyed by a unique `reference` so retries can never
  double-book. Types in v1: `capture`, `commission`, `payout`; refunds and
  clawbacks land with the refund flow. Amounts always derive from the frozen
  Order snapshot — never from client input.
- **Escrow payout** — sellers are paid (`server/services/money.js`) only after
  the Order is `delivered` and the 7-day return window has passed: their
  share = their subtotal minus the platform's 10% commission. Eligibility
  requires the payment to be captured, the order delivered, the window elapsed,
  and no prior payout for that order + seller (idempotency).
- **Refund** — admin-approved, per line item (`refundOrderLines` in
  `server/services/money.js`). Refunded lines are flagged on the Order and
  never paid out. Before a seller is paid, the refund reverses from escrow
  (`platform:escrow → buyer`) with a `commission_reversal`; after payout, the
  platform fronts the buyer from operating funds and claws the seller's share
  back (`clawback: seller:<vid> → platform:operating`). Commission reversals
  are booked as deltas (`commissionFor(before) − commissionFor(after)`) so
  rounding can never drift the ledger; every refund entry carries a reference
  derived from the line set, so retries never double-book. A fully-refunded
  order's payment becomes `refunded`.
