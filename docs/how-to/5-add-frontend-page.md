# Add a New Frontend Page or Route

How to add a new page to the NaijaMart frontend.

## Steps

### 1. Create the page component

Create `src/pages/YourPage.jsx`:

```jsx
import { useState } from 'react'
import { api } from '../api'
import { useAsync } from '../hooks/useAsync'

export default function YourPage() {
  const { data, loading, error } = useAsync(() => api.yourEndpoint())

  if (loading) return <div className="text-xs text-gray-500 py-10 text-center">Loading...</div>
  if (error) return <div className="text-xs text-danger py-10 text-center">{error.message}</div>

  return (
    <div className="max-w-7xl mx-auto px-4 mt-4">
      <h1 className="text-lg font-black text-secondary">Your Page</h1>
      {/* content */}
    </div>
  )
}
```

### 2. Add the route

In `src/App.jsx`, import the component and add a `<Route>`:

```jsx
import YourPage from './pages/YourPage'

// Inside <Routes>
<Route path="/your-page" element={<YourPage />} />
```

### 3. (If protected) Wrap with ProtectedRoute

For pages that require authentication:

```jsx
import ProtectedRoute from './components/ProtectedRoute'

<Route
  path="/vendor/your-feature"
  element={
    <ProtectedRoute roles={['vendor', 'admin']}>
      <YourFeature />
    </ProtectedRoute>
  }
/>
```

### 4. (If heavy) Lazy-load it

For pages behind auth guards that users don't always need (like analytics):

```jsx
import { lazy } from 'react'

const YourPage = lazy(() => import('./pages/YourPage'))

// In the route, wrap with Suspense
<Route path="/your-page" element={
  <Suspense fallback={<RouteSpinner />}>
    <YourPage />
  </Suspense>
} />
```

This pulls the component (and its dependencies like Recharts) out of the main bundle into a separate chunk that loads on demand.

### 5. (If nested) Use layout routes

For pages that share a layout (like vendor pages):

```jsx
// In App.jsx
<Route path="/vendor" element={
  <ProtectedRoute roles={['vendor', 'admin']}>
    <VendorLayout />
  </ProtectedRoute>
}>
  <Route path="your-feature" element={<YourFeature />} />
</Route>
```

`VendorLayout` renders an `<Outlet />` for nested routes.

## File Conventions

| Location | Use for |
|----------|---------|
| `src/pages/` | Top-level pages (ProductDetail, CheckoutPage, etc.) |
| `src/pages/vendor/` | Vendor-specific pages (VendorOrders, VendorWallet, etc.) |
| `src/pages/admin/` | Admin-specific pages (AdminVendors, AdminAnalytics, etc.) |
| `src/pages/static/` | Static content pages (About, Terms, Privacy, etc.) |
| `src/components/` | Reusable UI components (ProductCard, CartDrawer, etc.) |

## Common Patterns

### Using `useAsync` for data fetching

```jsx
import { useCallback } from 'react'
import { useAsync } from '../hooks/useAsync'
import { api } from '../api'

const { data, loading, error, reload } = useAsync(
  useCallback(() => api.someEndpoint(params), [params])
)
```

### Using `useAuth` for user state

```jsx
import { useAuth } from '../context/useAuth'

const { user, logout } = useAuth()
// user.id, user.role, user.name, user.email, etc.
```

### Using `useCart` for cart state

```jsx
import { useCart } from '../context/useCart'

const { items, cartCount, cartTotal, addToCart, removeFromCart } = useCart()
```

## See Also

- [Frontend Architecture Reference](../reference/6-frontend-architecture.md)
- [Frontend State Management](../explanation/7-frontend-state-management.md)
