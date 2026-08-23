# Run the Project Locally

How to start NaijaMart and verify everything works.

## Quick Start

```bash
npm run dev:full
```

This starts both the API (port 5000) and frontend (port 5173) with hot reload.

## Individual Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Frontend only (Vite dev server, port 5173) |
| `npm run server` | API server only (port 5000) |
| `npm run dev:full` | Both concurrently |
| `npm run build` | Build production frontend into `dist/` |
| `npm test` | Run unit tests (35 tests covering escrow, orders, reviews, vendor views) |
| `npm run lint` | ESLint check |

## What You Should See

1. Open `http://localhost:5173`
2. Homepage shows: Hero banner → Categories → Flash Sales → Top Selling
3. Click a product → Product detail page with reviews
4. Add to cart → Cart drawer opens
5. Checkout → Order placed with COD (default)
6. Login as admin → Admin dashboard with orders, payouts, ledger

## Data Flow

- Products are fetched from the API and cached in `productSource` (shared across FlashSales, TopSelling, ListingPage)
- Cart is stored in `localStorage` (persists across page refreshes)
- Auth token is stored in `localStorage` as `naijamart_token`
- On boot, the app validates the stored token against `GET /api/auth/me`

## See Also

- [Set Up the Development Environment](1-setup-development-environment.md)
- [Debug Common Issues](9-debug-common-issues.md)
