<div align="center">

# 🛒 NaijaMart

**Multi-Vendor Marketplace with Escrow, Real-time Notifications & AI**

A full-stack e-commerce platform built for Nigeria. Vendors list products, customers buy with confidence — their money sits in escrow until delivery is confirmed and the return window passes.

![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)

[Quick Start](#quick-start) · [Features](#features) · [Architecture](#architecture) · [Tech Stack](#tech-stack) · [Docs](#documentation)

</div>

---

## What This Project Does

NaijaMart solves a real problem: **Nigerian vendors need a safe way to get paid.** Buyers pay the platform, not the vendor. Money is held in escrow while the order is fulfilled. Sellers only get paid after delivery + a 7-day return window. If something goes wrong, refunds reverse from escrow — the platform never loses money.

This isn't a CRUD tutorial. It's a working marketplace with **real financial logic**, real-time notifications, and the kind of resilience engineering that separates junior projects from production systems.

---

## Features

| Customer | Vendor | Admin |
|----------|--------|-------|
| Browse, search, filter products | Product management with image upload | Vendor approval/rejection |
| Cart + checkout with coupon codes | AI product assistant (OpenAI) | Withdrawal request management |
| Real-time order tracking | Wallet & withdrawal requests | Analytics dashboard (GMV, revenue) |
| Wishlist & follow stores | Revenue analytics (Recharts) | Product moderation |
| Verified purchase reviews | Public storefront page | Full refund & clawback system |
| PWA — installable on mobile | WhatsApp order notifications | Ledger & payout controls |

**Platform-level:** Multi-vendor escrow · Double-entry ledger · Socket.io realtime · Email notifications (Resend) · Role-based access · Vendor approval gate · MongoDB text search · Rate limiting · Graceful shutdown · Circuit breakers

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BUYER CHECKOUT                           │
│  Cart → placeOrder() → price snapshot → coupon validation       │
│  → order created → payment captured → money enters ESCROW       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       LEDGER ENTRY                              │
│  capture: buyer → platform:escrow          ₦10,000              │
│  commission: platform:escrow → platform:revenue  ₦1,000 (10%)  │
│  seller: platform:escrow → seller:<id>     ₦9,000 (pending)    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FULFILLMENT FLOW                             │
│  Vendor dispatches → Admin receives at warehouse → Ships to     │
│  buyer → Order marked delivered → 7-day return window starts    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       PAYOUT                                    │
│  Window elapsed + no refund → Seller's share released           │
│  payout: platform:escrow → seller:<id>                         │
│  Vendor requests withdrawal → Admin approves → Paid             │
└─────────────────────────────────────────────────────────────────┘
```

**What happens if a refund is needed?**
- **Before payout:** Reversal comes from escrow — money goes back to buyer
- **After payout:** Platform fronts from operating funds, claws back from seller

This is the same pattern Jumia, Konga, and Amazon use. See [docs/architecture/escrow.md](docs/architecture/escrow.md) for the full flow.

---

## Quick Start

```bash
git clone https://github.com/your-username/naijamart.git
cd naijamart
npm install
cp .env.example .env
npm run dev:full
```

**http://localhost:5173** — that's it. No database required — runs with an in-memory store.

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@naijamart.com` | `admin123` |
| Vendor | `vendor@naijamart.com` | `vendor123` |
| Customer | `customer@naijamart.com` | `customer123` |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 19, React Router 7, Tailwind CSS 4 | Modern stack, fast dev loop |
| Build | Vite 8 | Instant HMR, clean builds |
| Backend | Express 5, Node.js | Simple, well-understood |
| Database | MongoDB / Mongoose 9 | Flexible schema, in-memory fallback |
| Realtime | Socket.io 4 | Push notifications for orders & status |
| Analytics | Recharts 2 | Vendor revenue & admin GMV dashboards |
| Email | Resend | Transactional emails with great DX |
| AI | OpenAI API | Product title/description/tag generation |
| Auth | JWT + bcryptjs | Stateless, secure |
| PWA | Service Worker | Installable on Android & iOS |

---

## Documentation

Deep-dive architecture docs for contributors and reviewers:

| Document | What It Covers |
|----------|---------------|
| [How the Escrow System Works](docs/architecture/escrow.md) | Money lifecycle, refund paths, payout eligibility |
| [Why a Double-Entry Ledger](docs/architecture/ledger.md) | Accounting model, idempotency, account types |
| [Multi-Vendor Order Splitting](docs/architecture/multi-vendor.md) | Order decomposition, warehouse consolidation, fulfillment |
| [Security & Resilience](docs/architecture/security.md) | Auth, RBAC, upload hardening, circuit breakers, graceful shutdown |

---

## API Overview

<details>
<summary><strong>Click to expand full API reference</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check with dependency status |
| `POST` | `/api/auth/register` | Register (customer or vendor) |
| `POST` | `/api/auth/login` | Login → JWT |
| `GET` | `/api/products` | Search with `?q=`, `?minPrice=`, `?maxPrice=`, `?minRating=`, `?sort=`, `?page=` |
| `POST` | `/api/products` | Create product (vendor) |
| `POST` | `/api/products/bulk` | Bulk upload (vendor) |
| `POST` | `/api/orders` | Place order with optional `couponCode` |
| `PATCH` | `/api/orders/:id/fulfillment` | Vendor dispatch / admin confirm |
| `POST` | `/api/orders/:id/refund` | Admin: refund line items |
| `POST` | `/api/reviews` | Create verified purchase review |
| `POST` | `/api/wishlist/:id` | Toggle wishlist |
| `POST` | `/api/follows/:id` | Toggle follow vendor |
| `POST` | `/api/coupons` | Create discount code (vendor) |
| `POST` | `/api/withdrawals` | Request payout (vendor) |
| `POST` | `/api/ai/generate-product` | AI product generation (vendor) |
| `GET` | `/api/analytics/vendor` | Revenue charts (vendor) |
| `GET` | `/api/analytics/admin` | GMV dashboard (admin) |

**50+ endpoints total.** Full reference in [README.md](README.md#api-overview) or the route files.

</details>

---

## What Makes This Project Stand Out

1. **Real financial logic** — Escrow, commission splits, refunds with clawback. Not just CRUD.
2. **Double-entry ledger** — Every naira movement is tracked with idempotent references. Retries can never double-book.
3. **Resilience engineering** — Circuit breakers, retry with backoff, dead letter queues, graceful shutdown. The app survives external API failures.
4. **Real-time everything** — Socket.io push notifications for new orders, status changes, and payouts.
5. **Multi-vendor by design** — Single customer order splits across vendors with per-line fulfillment and warehouse consolidation.

---

<div align="center">

**Built with 💚 for the Nigerian market**

</div>
