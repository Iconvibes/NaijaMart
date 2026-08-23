# Authentication & Authorization

How users authenticate, how access is controlled, and why certain design choices were made.

## Authentication Flow

### Registration

```
Client → POST /api/auth/register
  → Validate: name, email, password (min 6 chars)
  → Check email uniqueness
  → Hash password with bcrypt (10 rounds)
  → Create user:
      - Customers: vendorStatus = "approved"
      - Vendors: vendorStatus = "pending" (need admin approval)
  → Sign JWT: { id, role } + 7-day expiry
  → Return: { token, user }
```

### Login

```
Client → POST /api/auth/login
  → Find user by email
  → Compare password with bcrypt
  → Sign JWT: { id, role } + 7-day expiry
  → Return: { token, user }
```

**Security note:** Error message is generic ("Invalid email or password") — doesn't reveal whether the email exists.

### Token Validation (on every authenticated request)

```
Client → Authorization: Bearer <token>
  → middleware/auth.js: requireAuth
  → jwt.verify(token, JWT_SECRET)
  → Load user from DB: repo.findUserById(payload.id)
  → Attach to req.user
```

### Boot-time Validation (frontend)

On page load, `AuthProvider` checks for a stored token:
1. If token exists in `localStorage`, call `GET /api/auth/me`
2. If valid → set user state
3. If invalid → clear token, user sees login page

## JWT Structure

```javascript
{
  id: "u1",      // User ID (string for in-memory, ObjectId for MongoDB)
  role: "vendor"  // "customer" | "vendor" | "admin"
}
```

**Expiry:** 7 days
**Secret:** `JWT_SECRET` env var (validated at startup — server refuses to start with default or missing value)

## Authorization Layers

### Layer 1: Route-level middleware

```javascript
router.get('/admin', requireAuth, requireRole('admin'), handler)
```

### Layer 2: Object-level ownership checks

```javascript
// Products: vendor can only edit their own
if (req.user.role !== 'admin' && existing.vendorId !== req.user.id) {
  return res.status(403).json({ message: 'You can only edit your own products' })
}
```

### Layer 3: Vendor approval gate

```javascript
// Vendors must be approved before creating products
router.post('/products', requireAuth, requireRole('vendor'), requireApprovedVendor, handler)
```

## Role Permissions

| Role | Can Do | Cannot Do |
|------|--------|-----------|
| **Customer** | Browse, buy, review, wishlist, follow | Create products, see orders, manage vendors |
| **Vendor** | Create/edit products, view their orders, manage fulfillment, request withdrawals | See other vendors' data, change order status, process refunds |
| **Admin** | Everything: approve vendors/products, change order status, capture payments, run payouts, process refunds, view all data | — |

## Vendor Approval Workflow

1. Vendor registers → `vendorStatus: "pending"`
2. Admin reviews in `/admin/vendors`
3. Admin approves → `vendorStatus: "approved"` → vendor can create products
4. Admin can later suspend → `vendorStatus: "rejected"` → vendor blocked from product operations

## Public vs Protected Endpoints

| Access | Endpoints |
|--------|-----------|
| **Public** | Products (list/detail), Vendor storefronts, Order tracking (phone verification), Health check, Reviews (list) |
| **Auth required** | Cart/checkout, Wishlist, Follows, Notifications, Profile update |
| **Vendor** | Product CRUD, Order fulfillment, Coupons, Withdrawals, Analytics |
| **Admin** | User list, Vendor approval, Order status, Payment capture, Refunds, Payouts, Withdrawals |

## Password Handling

- Stored as bcrypt hash (10 rounds)
- Minimum 6 characters (enforced at registration and password change)
- Password change requires current password verification
- `publicUser()` strips `passwordHash` from all API responses

## Security Properties

- **Token-based** — stateless, no server-side sessions
- **Role-encoded in JWT** — no DB lookup needed for role checks (but user existence is verified on each request)
- **Generic error messages** — login/register don't reveal email existence
- **Rate-limited auth** — 15 attempts/minute per IP for login and registration
