# API Endpoints Reference

Complete reference for all NaijaMart REST API endpoints.

**Base URL:** `http://localhost:5000` (dev) or `https://yourdomain.com` (production)

**Authentication:** Bearer token in `Authorization` header: `Bearer <jwt_token>`

---

## Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/health` | None | Health check with dependency status |

**Response:**
```json
{
  "ok": true,
  "uptime": 12345,
  "memory": "83MB",
  "dependencies": {
    "mongodb": { "status": "ok", "mode": "connected" },
    "whatsapp": { "state": "closed", "recentFailures": 0 },
    "resend": { "state": "closed", "recentFailures": 0 },
    "openai": { "state": "closed", "recentFailures": 0 },
    "deadLetters": 0
  }
}
```

---

## Authentication

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| `POST` | `/api/auth/register` | None | 15/min | Register (customer or vendor) |
| `POST` | `/api/auth/login` | None | 15/min | Login → JWT |
| `GET` | `/api/auth/me` | Yes | — | Get current user |
| `PATCH` | `/api/auth/me` | Yes | — | Update profile |
| `GET` | `/api/auth/users` | Admin | — | List all users |

### POST /api/auth/register
**Body:** `{ name, email, password, role?, whatsapp? }`
- `role`: `"customer"` (default) or `"vendor"`
- Vendors start with `vendorStatus: "pending"` (need admin approval)

**Response (201):** `{ token, user }`

### POST /api/auth/login
**Body:** `{ email, password }`

**Response (200):** `{ token, user }`
- Error: `"Invalid email or password"` (generic — doesn't reveal if email exists)

### PATCH /api/auth/me
**Body:** `{ name?, logo?, banner?, bio?, whatsapp?, currentPassword?, newPassword? }`
- Password change requires `currentPassword`

**Response (200):** `{ user }`

---

## Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/products` | None | Search/list products |
| `GET` | `/api/products/:id` | None | Get single product |
| `POST` | `/api/products` | Vendor/Admin | Create product |
| `POST` | `/api/products/bulk` | Vendor | Bulk upload (max 50) |
| `PUT` | `/api/products/:id` | Owner/Admin | Update product |
| `DELETE` | `/api/products/:id` | Owner/Admin | Delete product |
| `PATCH` | `/api/products/:id/approve` | Admin | Toggle approval |

### GET /api/products
**Query params:** `q`, `category`, `vendorId`, `minPrice`, `maxPrice`, `minRating`, `sort`, `page`, `limit`

**Sort options:** `price_asc`, `price_desc`, `rating`, `newest`

**Response (200):**
```json
{
  "products": [{ "id", "name", "price", "vendor", "vendorLogo", ... }],
  "total": 150,
  "page": 1,
  "limit": 24
}
```

### POST /api/products
**Body:** `{ name, category, price, image, description?, oldPrice?, inStock?, badge?, tags?, images? }`
- `vendorId` is set from the authenticated user's token (not client-supplied)
- Admin-created products are auto-approved; vendor products need approval

---

## Orders

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| `GET` | `/api/orders/lookup/:id` | None | — | Public order tracking (phone verification) |
| `POST` | `/api/orders` | None | 5/min | Place order (guest checkout supported) |
| `GET` | `/api/orders` | Vendor/Admin | — | List orders |
| `PATCH` | `/api/orders/:id/status` | Admin | — | Update order status |
| `PATCH` | `/api/orders/:id/payment` | Admin | — | Mark COD payment captured |
| `POST` | `/api/orders/:id/refund` | Admin | — | Refund line items |
| `PATCH` | `/api/orders/:id/fulfillment` | Vendor/Admin | — | Update item fulfillment |

### POST /api/orders
**Body:** `{ customerName, customerEmail?, customerPhone, customerAddress, paymentMethod?, couponCode?, items: [{ productId, qty }] }`
- `paymentMethod`: `"card"` (default), `"transfer"`, or `"cod"`
- Prices are re-fetched from the catalog server-side (client prices are ignored)
- If authenticated, `customerId` and `customerEmail` are auto-filled from the JWT

**Response (201):** `{ order }`

### GET /api/orders (vendor view)
Vendors see only their own line items via `toVendorOrderView()`. Multi-seller orders show the warehouse address instead of the buyer's street address.

### PATCH /api/orders/:id/fulfillment
- **Vendor:** Can only mark their own items as `sent` or undo to `pending`
- **Admin:** Can set any fulfillment state (`pending`, `sent`, `received`)

**Status values:** `pending`, `processing`, `shipped`, `delivered`, `cancelled`

---

## Reviews

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| `POST` | `/api/reviews` | Yes | 10/min | Create review (verified purchase) |
| `GET` | `/api/reviews/product/:productId` | None | — | Reviews for a product |
| `GET` | `/api/reviews/vendor/:vendorId` | None | — | Reviews for a vendor |
| `POST` | `/api/reviews/:id/helpful` | None | 20/min | Mark review helpful |

### POST /api/reviews
**Body:** `{ orderId, productId, rating, title?, text?, images? }`
- `rating`: 1-5
- Order must be `delivered` and owned by the authenticated user
- Guest orders (no `customerId`) cannot be reviewed
- One review per product per order

---

## Vendors

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/vendors` | None | List approved vendors |
| `GET` | `/api/vendors/:slug` | None | Vendor storefront data |
| `PATCH` | `/api/vendors/:id/approve` | Admin | Approve vendor |
| `PATCH` | `/api/vendors/:id/reject` | Admin | Reject vendor |

---

## Wishlist & Follows

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/wishlist/:productId` | Yes | Toggle wishlist |
| `GET` | `/api/wishlist` | Yes | Get wishlist with product details |
| `POST` | `/api/follows/:vendorId` | Yes | Toggle follow vendor |
| `GET` | `/api/follows` | Yes | Get followed vendors |

---

## Coupons

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/coupons` | Vendor | Create coupon |
| `POST` | `/api/coupons/validate` | None | Validate coupon code |
| `GET` | `/api/coupons/vendor` | Vendor | List vendor's coupons |
| `PATCH` | `/api/coupons/:id/toggle` | Vendor | Toggle coupon active status |
| `POST` | `/api/coupons/platform` | Admin | Create platform-wide coupon |

---

## Withdrawals

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/withdrawals` | Vendor | Request withdrawal (min ₦1,000) |
| `GET` | `/api/withdrawals` | Vendor | Withdrawal history + balance |
| `GET` | `/api/withdrawals/wallet` | Vendor | Wallet summary |
| `GET` | `/api/withdrawals/admin` | Admin | All withdrawal requests |
| `PATCH` | `/api/withdrawals/admin/:id/approve` | Admin | Approve withdrawal |
| `PATCH` | `/api/withdrawals/admin/:id/reject` | Admin | Reject withdrawal |
| `PATCH` | `/api/withdrawals/admin/:id/process` | Admin | Mark as paid |

---

## Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/analytics/vendor` | Vendor | Revenue analytics (query: `days`) |
| `GET` | `/api/analytics/admin` | Admin | Platform analytics (query: `days`) |

---

## Ledger

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/ledger` | Admin | Ledger entries (query: `orderId`, `type`) |
| `GET` | `/api/ledger/payables` | Admin | Eligible seller payouts |
| `POST` | `/api/ledger/payouts` | Admin | Run all eligible payouts |

---

## AI

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| `POST` | `/api/ai/generate-product` | Vendor | 5/min | Generate product titles/descriptions/tags |

---

## Upload

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/upload` | Vendor/Admin | Upload images (max 4, 5MB each) |

**Multipart form data:** `images` field
- Accepted: JPG, PNG, WebP
- Max 5MB per file, 500MB total upload directory
- Returns: `{ paths: ["/uploads/product-xxx.jpg"] }`

---

## Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/notifications` | Yes | Get notifications (query: `unread=true`) |
| `GET` | `/api/notifications/count` | Yes | Unread count |
| `PATCH` | `/api/notifications/read` | Yes | Mark all as read |

---

## Error Response Format

All errors return:
```json
{ "message": "Human-readable error description" }
```

Common status codes:
| Code | Meaning |
|------|---------|
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Not authorized |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate email) |
| 429 | Rate limited |
| 500 | Internal server error |
