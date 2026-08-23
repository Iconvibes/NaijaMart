# Frontend State Management

How state flows through the NaijaMart React application.

## State Layers

```
┌─────────────────────────────────────────┐
│  Global State (Context Providers)        │
│  ├── AuthContext (user, token)           │
│  └── CartContext (items, totals)         │
├─────────────────────────────────────────┤
│  Shared Cache (productSource)            │
│  └── Cached product list promise         │
├─────────────────────────────────────────┤
│  Component State (useState/useAsync)     │
│  ├── Page-level data fetching            │
│  ├── Form state                          │
│  └── UI state (modals, filters, etc.)    │
├─────────────────────────────────────────┤
│  Server State (Socket.io)                │
│  └── Real-time notifications             │
└─────────────────────────────────────────┘
```

## AuthContext (`src/context/AuthProvider.jsx`)

**Stores:** Current user object, token validation state

**Persistence:** `localStorage` (`naijamart_token`, `naijamart_user`)

**Boot sequence:**
1. Load user from localStorage (instant, may be stale)
2. If token exists, call `GET /api/auth/me` to validate
3. If valid → update user state with fresh data
4. If invalid → clear token, user sees login page

**Provided values:**
```javascript
{ user, initializing, login, register, logout }
```

**Why localStorage for tokens?** Simplicity for a demo app. Production should use `httpOnly` cookies for XSS resistance.

## CartContext (`src/context/CartProvider.jsx`)

**Stores:** Cart items as `[{ product, qty }]`

**Persistence:** `localStorage` (`naijamart_cart_v1`)

**Key behavior:**
- Product snapshots live in the cart (so the drawer renders even if the catalog changes)
- `cartCount` and `cartTotal` are memoized
- Quantity is clamped to 1-99
- Cart drawer opens/closes via `isOpen` state

**Why cart in localStorage?** Cart survives page refreshes without a server. Guest users can have a cart without an account.

## ProductSource (`src/productSource.js`)

**Caches:** The **promise** from `api.products()` (not the result)

**Why cache the promise?** Multiple components mount simultaneously (FlashSales, TopSelling, ListingPage). Without caching, each would trigger a separate fetch. By caching the promise, they share one request.

**Cache lifecycle:**
- First call: creates and caches the promise
- Subsequent calls: returns the same promise
- On error: clears the cache (so retry works)
- On mutation: call `invalidateProducts()` to force refetch

## Data Fetching (`src/hooks/useAsync.js`)

```javascript
const { data, loading, error, reload } = useAsync(fn, { initialData })
```

**How it works:**
1. `fn` is a function that returns a promise
2. `useAsync` runs `fn` when `fn` changes (or `reload()` is called)
3. Manages `loading`, `error`, and `data` state
4. Handles race conditions (cancelled flag prevents stale updates)
5. `reload()` triggers a refetch

**Usage with dependencies:**
```jsx
const { data, loading, error } = useAsync(
  useCallback(() => api.vendorOrders(status), [status])
)
```

`useCallback` memoizes the function so `useAsync` only refetches when `status` changes.

## Socket.io (`src/hooks/useSocket.js`)

**Singleton pattern:** One socket connection shared across all hook instances.

**Lifecycle:**
1. Connect when user is authenticated
2. Disconnect when user logs out
3. Listen for `notification` events
4. Show browser notification if permitted

**State exposed:** `{ connected, lastNotification }`

## State Flow Example: Placing an Order

```
1. User adds product to cart
   → CartContext.addToCart() → localStorage updated

2. User goes to checkout
   → CheckoutPage reads CartContext (items, cartTotal)

3. User submits order
   → CheckoutPage calls api.createOrder()
   → api.js sends POST /api/orders with Bearer token

4. Server processes order
   → placeOrder() validates, snapshots prices, creates order
   → recordPaymentCapture() books ledger entries
   → notifyVendors() fires WhatsApp + Socket.io (async)
   → sendOrderConfirmation() fires email (async)

5. Client receives response
   → CheckoutPage shows success confirmation
   → CartContext.clearCart() → localStorage cleared

6. Vendor receives notification
   → Socket.io push → useSocket callback → UI update
   → WhatsApp message on phone
   → Email in inbox
```

## Why No Redux/Zustand?

The app uses React Context + `useAsync` because:
1. **Simple state shape** — auth and cart are the only truly global states
2. **No complex state transitions** — mostly CRUD operations
3. **Few cross-component subscriptions** — most state is page-scoped
4. **Minimal dependencies** — no extra libraries needed

If the app grows significantly (e.g., real-time inventory, collaborative editing), a state management library would be warranted.
