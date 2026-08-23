# Frontend Architecture Reference

Component hierarchy, routing, state management, and data flow.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 19 |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4 |
| Build | Vite 8 |
| Charts | Recharts 3 (lazy-loaded) |
| Realtime | Socket.io client (lazy-loaded) |

## Component Hierarchy

```
ErrorBoundary
├── BrowserRouter
│   ├── AuthProvider              # Auth state (token, user, login/logout)
│   │   └── CartProvider          # Cart state (items, totals, localStorage)
│   │       ├── ScrollToTop       # Scrolls to top on navigation
│   │       ├── TopNav            # Navigation bar (search, cart, auth)
│   │       ├── main
│   │       │   └── AppRoutes     # Route definitions
│   │       │       ├── Homepage (Hero + Categories + FlashSales + TopSelling)
│   │       │       ├── ListingPage (/shop, /deals, /category/:slug)
│   │       │       ├── ProductDetail (/product/:id)
│   │       │       ├── CheckoutPage (/checkout)
│   │       │       ├── OrderTrackingPage (/track-order)
│   │       │       ├── LoginPage, RegisterPage
│   │       │       ├── AccountPage, NotificationsPage
│   │       │       ├── StorePage (/store/:slug)
│   │       │       ├── Static pages (About, Terms, etc.)
│   │       │       ├── VendorLayout (nested routes)
│   │       │       │   ├── VendorProducts
│   │       │       │   ├── VendorAddProduct
│   │       │       │   ├── VendorEditProduct
│   │       │       │   ├── VendorOrders
│   │       │       │   ├── VendorWallet
│   │       │       │   ├── VendorCoupons
│   │       │       │   ├── VendorAnalytics (lazy)
│   │       │       │   └── VendorSettings
│   │       │       └── Admin pages (ProtectedRoute)
│   │       │           ├── AdminDashboard
│   │       │           ├── AdminVendors
│   │       │           ├── AdminWithdrawals
│   │       │           └── AdminAnalytics (lazy)
│   │       ├── Footer
│   │       ├── MobileBottomNav
│   │       ├── CartDrawer (slide-out)
│   │       └── PWAInstallBanner
```

## Routing

All routes are defined in `src/App.jsx`:

| Path | Component | Auth |
|------|-----------|------|
| `/` | Homepage | None |
| `/shop` | ListingPage (all products) | None |
| `/deals` | ListingPage (discounted) | None |
| `/category/:slug` | ListingPage (filtered) | None |
| `/product/:id` | ProductDetail | None |
| `/store/:slug` | StorePage | None |
| `/checkout` | CheckoutPage | None |
| `/track-order` | OrderTrackingPage | None |
| `/login` | LoginPage | None |
| `/register` | RegisterPage | None |
| `/account` | AccountPage | Any |
| `/notifications` | NotificationsPage | Any |
| `/vendor/*` | VendorLayout (nested) | Vendor/Admin |
| `/admin` | AdminDashboard | Admin |
| `/admin/vendors` | AdminVendors | Admin |
| `/admin/withdrawals` | AdminWithdrawals | Admin |
| `/admin/analytics` | AdminAnalytics (lazy) | Admin |
| `*` | Redirect to `/` | — |

## Lazy-Loaded Pages

These pages are loaded on demand (separate chunks):

| Component | Chunk | Reason |
|-----------|-------|--------|
| `AdminDashboard` | `AdminDashboard-*.js` | Admin-only, heavy |
| `AdminAnalytics` | `AdminAnalytics-*.js` + `LineChart-*.js` | Recharts (~356KB) |
| `VendorAnalytics` | `VendorAnalytics-*.js` + `LineChart-*.js` | Recharts (shared chunk) |

## State Management

### AuthContext (`src/context/AuthProvider.jsx`)

| Key | Type | Description |
|-----|------|-------------|
| `user` | Object/null | Current user object |
| `initializing` | Boolean | True while validating stored token |
| `login(email, password)` | Function | Login → stores token + user |
| `register(payload)` | Function | Register → stores token + user |
| `logout()` | Function | Clears token + user |

**Token storage:** `localStorage` key `naijamart_token`
**User storage:** `localStorage` key `naijamart_user`

**Boot sequence:** On mount, if a token exists, `GET /api/auth/me` validates it. If invalid, token is cleared.

### CartContext (`src/context/CartProvider.jsx`)

| Key | Type | Description |
|-----|------|-------------|
| `items` | Array | `[{ product, qty }]` |
| `cartCount` | Number | Total items |
| `cartTotal` | Number | Total price |
| `savings` | Number | Total savings from oldPrice |
| `isOpen` | Boolean | Cart drawer state |
| `addToCart(product, qty)` | Function | Add or increment |
| `removeFromCart(productId)` | Function | Remove item |
| `updateQty(productId, qty)` | Function | Set quantity |
| `clearCart()` | Function | Empty cart |
| `openCart/closeCart/toggleCart` | Functions | Drawer control |

**Storage:** `localStorage` key `naijamart_cart_v1`

### ProductSource (`src/productSource.js`)

Shared cache layer. Caches the **promise** (not the result) from `api.products()`. Multiple components (FlashSales, TopSelling, ListingPage) mount simultaneously and share one fetch.

- `productSource.fetchProducts()` — returns cached promise
- `productSource.invalidateProducts()` — clears cache (call after product mutations)

## Data Fetching Pattern

```jsx
import { useCallback } from 'react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../api'

function MyComponent({ id }) {
  const { data, loading, error, reload } = useAsync(
    useCallback(() => api.someEndpoint(id), [id])
  )

  if (loading) return <Skeleton />
  if (error) return <ErrorMessage error={error} />
  return <Content data={data} />
}
```

`useAsync` handles: race condition guards, loading/error state, refetch on dependency change.

## API Client (`src/api.js`)

Every backend endpoint is a method on the `api` object:

```javascript
api.login(email, password)           // POST /api/auth/login
api.products({ q, category, ... })   // GET /api/products?...
api.createOrder(payload)             // POST /api/orders
```

All requests go through a shared `request()` function that:
1. Adds `Authorization` header from localStorage token
2. Serializes body as JSON (or FormData for uploads)
3. Throws typed errors with `status` and `message`
