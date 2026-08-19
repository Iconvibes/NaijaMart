# Security & Resilience

> **Type:** Explanation (understanding-oriented)
> **Audience:** Security-conscious reviewers, technical interviewers, future contributors
> **Goal:** Understand how the system protects against attacks, handles failures, and stays available

---

## Authentication

### JWT + bcryptjs

Passwords are never stored — only `bcryptjs` hashes (cost factor 10). On login:

1. User submits email + password
2. Server finds user by email, compares hash
3. If valid, signs a JWT with `{ id, role }` (7-day expiry)
4. Client stores JWT in `localStorage`, sends as `Bearer` header

The `requireAuth` middleware verifies the token on every protected route and loads the full user object from the database.

### Rate Limiting

Auth endpoints (`/register`, `/login`) are rate-limited to **15 attempts per minute**. This prevents:
- Brute-force password attacks
- Account enumeration
- Credential stuffing

---

## Role-Based Access Control (RBAC)

Three roles with strict separation:

| Role | Can Do | Cannot Do |
|------|--------|-----------|
| **Customer** | Browse, buy, review, wishlist, follow | Create products, see other orders, access ledger |
| **Vendor** | Manage own products, see own orders, request withdrawals | See other vendors' data, access admin panel, modify escrow |
| **Admin** | Everything — approve vendors, manage payouts, refunds, analytics | — |

Enforced via `requireRole()` middleware. Sensitive operations like refunds and payouts are admin-only.

### Vendor Approval Gate

When a vendor registers, they start with `vendorStatus: 'pending'`. They cannot:
- Create or edit products
- Upload images
- Access the vendor dashboard features

Only after an admin approves them (`PATCH /api/vendors/:id/approve`) can they start selling.

---

## Upload Security

The upload endpoint (`POST /api/upload`) has **five layers** of protection:

| Layer | Protection | What It Prevents |
|-------|-----------|-----------------|
| 1. `requireAuth` | Must be logged in | Anonymous file uploads |
| 2. `requireRole('vendor','admin')` | Must be vendor or admin | Customer abuse |
| 3. `requireApprovedVendor` | Must be approved | New vendor spam |
| 4. MIME + extension filter | Only `.jpg`, `.jpeg`, `.png`, `.webp` | Executable uploads, web shells |
| 5. Disk space check | 500MB directory limit | Disk-filling attacks |

**Additional hardening:**
- File size limit: 5MB per file
- Max files per request: 4
- Filename is server-generated (random, timestamped) — original name is discarded
- No path traversal possible in static serving (`express.static` blocks `../`)

---

## Input Validation

### Server-Side Price Snapshotting

Prices are **never trusted from the client**. When an order is placed:

```javascript
// Client sends: { productId: 'abc', qty: 2 }
// Server looks up the actual price from the database
const product = await repo.findProductById(line.productId)
lineItems.push({ price: product.price, ... })
```

A malicious user cannot forge a ₦1 order for a ₦50,000 product.

### Quantity Clamping

Quantities are clamped to `[1, 99]` server-side:
```javascript
const qty = Math.max(1, Math.min(99, Number(line.qty) || 1))
```

### Coupon Race Condition Prevention

Two concurrent checkouts could both pass a coupon's `maxUses` check. The system uses **compare-and-swap (CAS)**:

```javascript
// Only increments if usedCount still matches expected value
const updated = await Coupon.findOneAndUpdate(
  { _id: id, usedCount: expectedUsedCount },
  { $inc: { usedCount: 1 } },
  { new: true }
)
// If updated is null, someone else incremented first → retry
```

---

## Resilience Patterns

### Retry with Exponential Backoff

External API calls (WhatsApp, Resend, OpenAI) retry up to 3 times with increasing delays:

```
Attempt 1: immediate
Attempt 2: ~1s + jitter
Attempt 3: ~2s + jitter
Attempt 4: ~4s + jitter
```

Jitter prevents thundering herd — if 100 requests fail simultaneously, they don't all retry at the same instant.

### Circuit Breakers

Three circuit breakers (one per external service):

```
CLOSED (normal)
    │
    │  5 failures in 60s
    ▼
OPEN (blocking)
    │
    │  2-minute cooldown
    ▼
HALF-OPEN (testing)
    │
    ├── success → CLOSED
    └── failure → OPEN
```

When a circuit opens, the system **stops calling the dead service**. This prevents:
- Wasted server resources on guaranteed failures
- Cascading timeouts
- Resource exhaustion

### Request Timeouts

Every external call has a timeout:
- WhatsApp API: 10 seconds
- Resend email: 15 seconds
- OpenAI: 30 seconds

A hung API call no longer blocks the server thread.

### Dead Letter Queue

Failed notifications (WhatsApp, email) are queued with full payload for later retry:

```javascript
enqueueDeadLetter({
  type: 'whatsapp',
  userId: vendorId,
  orderId: order.id,
  phone: vendor.whatsapp,
  message,
  error: err.message,
})
```

These are logged and available for an admin retry endpoint.

### Graceful Shutdown

On `SIGTERM`/`SIGINT` (deploy, restart):

1. Stop accepting new HTTP connections
2. Finish in-flight requests
3. Close MongoDB connection
4. Exit cleanly

If something hangs, force-exit after 10 seconds.

---

## Health Check

`GET /api/health` returns a full dependency status:

```json
{
  "ok": true,
  "uptime": 3600,
  "memory": "45MB",
  "dependencies": {
    "mongodb": { "status": "ok", "mode": "connected" },
    "whatsapp": { "state": "closed", "recentFailures": 0 },
    "resend": { "state": "closed", "recentFailures": 0 },
    "openai": { "state": "open", "recentFailures": 5 },
    "deadLetters": 3
  }
}
```

Returns **503** if any dependency is degraded. Monitoring tools can poll this endpoint.

---

## Attack Surface Summary

| Attack Vector | Mitigation |
|--------------|-----------|
| Password brute-force | Rate limiting (15/min on auth endpoints) |
| Price forgery | Server-side price snapshotting |
| Coupon abuse | CAS atomic increment + maxUses |
| File upload abuse | Auth + role + approval + MIME + extension + disk limit |
| Disk filling | 500MB upload directory limit |
| API key theft | Environment variables, never in code |
| XSS | React auto-escapes by default |
| CSRF | JWT in header (not cookie) |
| Service outage | Circuit breakers + retry + dead letter queue |
| Data loss on restart | Graceful shutdown + MongoDB persistence |
| Double-payment | Idempotency keys on every ledger entry |

---

## Code References

| File | What It Does |
|------|-------------|
| `server/lib/resilience.js` | Retry, circuit breaker, timeout, dead letter queue |
| `server/middleware/auth.js` | JWT verification, role checking |
| `server/middleware/vendorApproval.js` | Vendor approval gate |
| `server/middleware/rateLimit.js` | In-memory rate limiter |
| `server/routes/upload.js` | Hardened upload with 5 protection layers |
| `server/index.js` | Graceful shutdown, health check |
| `server/services/orderIntake.js` | CAS coupon reservation |
