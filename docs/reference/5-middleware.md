# Middleware Reference

Express middleware used in NaijaMart.

## Authentication Middleware

**File:** `server/middleware/auth.js`

### `requireAuth`

Verifies the JWT Bearer token and loads the user into `req.user`.

```javascript
router.get('/protected', requireAuth, async (req, res) => {
  // req.user is the authenticated user object
  res.json({ user: req.user })
})
```

**Behavior:**
- Extracts token from `Authorization: Bearer <token>` header
- Verifies with `JWT_SECRET`
- Loads user from database via `repo.findUserById(payload.id)`
- Returns 401 if token is missing, invalid, or user doesn't exist

### `requireRole(...roles)`

Requires the authenticated user to have one of the specified roles.

```javascript
router.get('/admin-only', requireAuth, requireRole('admin'), handler)
router.get('/vendor-or-admin', requireAuth, requireRole('vendor', 'admin'), handler)
```

**Roles:** `"admin"`, `"vendor"`, `"customer"`

Returns 403 if the user's role is not in the allowed list.

### `publicUser(user)`

Not middleware — a utility function that strips `passwordHash` and other sensitive fields before sending a user object to the client.

**Returns:** `{ id, name, email, role, vendorStatus, logo, banner, bio, whatsapp, slug, createdAt }`

## Vendor Approval Middleware

**File:** `server/middleware/vendorApproval.js`

### `requireApprovedVendor`

Blocks vendors whose application is still pending or rejected. Admins always pass through.

```javascript
router.post('/products', requireAuth, requireRole('vendor'), requireApprovedVendor, handler)
```

**Behavior:**
- If `req.user.role === 'admin'` → pass through
- If `req.user.role === 'vendor'` and `vendorStatus !== 'approved'` → 403 with status-specific message
- Otherwise → pass through

## Rate Limiter

**File:** `server/middleware/rateLimit.js`

### `rateLimit({ windowMs, max, message })`

In-memory rate limiter keyed by IP + full URL path.

```javascript
const myLimit = rateLimit({
  windowMs: 60_000,  // 1 minute window
  max: 10,           // max 10 requests per window
  message: 'Too many requests'
})
router.post('/', myLimit, handler)
```

**Key construction:** `${ip}:${req.originalUrl}`

**Important:** Uses `req.originalUrl` (full path like `/api/orders`), NOT `req.path` (which is `/` for mounted routers). This ensures different endpoints have independent rate limit buckets.

**Behavior:**
- Tracks timestamps per key in a module-level `Map`
- Cleans stale entries every 60 seconds
- Returns 429 with the configured message when limit is exceeded
- Not suitable for multi-process deployments (each process has its own bucket)

**Applied to:**

| Route | Limit | Window |
|-------|-------|--------|
| Auth (login/register) | 15 | 60s |
| Orders (POST) | 5 | 60s |
| Reviews (POST) | 10 | 60s |
| Reviews helpful (POST) | 20 | 60s |
| AI generation (POST) | 5 | 60s |

## Error Handler

**File:** `server/index.js` (global)

```javascript
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message })
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: err.message })
  }
  console.error(err)
  res.status(500).json({ message: 'Something went wrong' })
})
```

**Behavior:**
- `AppError` / `ValidationError` → keeps their status code
- `MulterError` → 400 with multer message
- Everything else → 500 with generic message (never leaks internals)
