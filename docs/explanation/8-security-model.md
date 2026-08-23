# Security Model

How NaijaMart protects against common web security threats.

## Defense Layers

```
┌─────────────────────────────────────────┐
│  Helmet (Security Headers)              │
│  HSTS, X-Frame-Options, nosniff, etc.  │
├─────────────────────────────────────────┤
│  CORS (Origin Restriction)              │
│  Only whitelisted origins can connect   │
├─────────────────────────────────────────┤
│  Rate Limiting (Per-Endpoint)           │
│  Auth: 15/min, Orders: 5/min, etc.      │
├─────────────────────────────────────────┤
│  JWT Authentication                     │
│  Bearer token, 7-day expiry             │
├─────────────────────────────────────────┤
│  Role-Based Authorization               │
│  Customer / Vendor / Admin              │
├─────────────────────────────────────────┤
│  Input Validation                       │
│  Server-side, never trust the client    │
├─────────────────────────────────────────┤
│  Output Encoding (React JSX)            │
│  Auto-escaped, no dangerouslySetInnerHTML│
└─────────────────────────────────────────┘
```

## Security Headers (Helmet)

**File:** `server/index.js`

```javascript
app.use(helmet({
  contentSecurityPolicy: false,  // Disabled until inline scripts are audited
  crossOriginEmbedderPolicy: false,  // Would block cross-origin images
}))
```

**Enabled headers:**
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-DNS-Prefetch-Control: off`
- `X-Download-Options: noopen`
- `X-Permitted-Cross-Domain-Policies: none`

**Disabled (known trade-off):**
- `Content-Security-Policy` — requires auditing inline scripts and external assets
- `Cross-Origin-Embedder-Policy` — would break cross-origin product images

## CORS

**File:** `server/index.js`

```javascript
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000']

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)  // Allow server-to-server
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
```

**Socket.io uses the same whitelist.**

## Authentication

**JWT in localStorage** — accessible to JavaScript, 7-day expiry.

**Known risk:** Any XSS can steal the token. Mitigated by:
- React JSX auto-escapes (no `dangerouslySetInnerHTML` in the codebase)
- Helmet security headers
- No CSP yet (planned)

**Production recommendation:** Migrate to `httpOnly` cookies.

## Authorization

Three layers:

1. **Route middleware** — `requireAuth`, `requireRole('admin')`
2. **Object ownership** — vendors can only edit their own products/orders
3. **Vendor approval** — `requireApprovedVendor` blocks pending/rejected vendors

## Input Validation

### Server-side (never trust the client)

**Prices:** Re-fetched from catalog in `orderIntake.js`. Client-submitted prices are ignored.

**Vendor attribution:** Set from the JWT token, not from request body.

**Product fields:** Whitelisted via `PRODUCT_FIELDS` array in `products.js`:

```javascript
const PRODUCT_FIELDS = ['name', 'description', 'category', 'price', 'oldPrice', 'image', 'inStock', 'badge', 'rating', 'reviews', 'tags']
```

**Image paths:** Must start with `/uploads/`:

```javascript
data.images = req.body.images.filter(p => typeof p === 'string' && p.startsWith('/uploads/'))
```

### MongoDB Query Safety

All query parameters are coerced to primitive types before use:

```javascript
// Safe: String coercion prevents operator injection
if (vendorId) query.vendorId = vendorId  // vendorId is a string

// Safe: Number coercion
minPrice: minPrice != null ? Number(minPrice) : undefined
```

No `$where`, `$regex` with user input, or raw query construction.

## File Upload Security

**File:** `server/routes/upload.js`

| Control | Implementation |
|---------|---------------|
| **MIME type** | Whitelist: `image/jpeg`, `image/png`, `image/webp` |
| **Extension** | Whitelist: `.jpg`, `.jpeg`, `.png`, `.webp` |
| **File size** | 5MB per file |
| **Disk space** | 500MB total upload directory |
| **Filename** | Generated: `product-{timestamp}-{random}{ext}` (user input ignored) |
| **Auth** | Vendor/Admin only, approved vendors only |

Uploaded images are served publicly via `express.static('/uploads')` — this is intentional (product images must be visible).

## Rate Limiting

**File:** `server/middleware/rateLimit.js`

Per-IP, per-endpoint rate limiting. Key uses `req.originalUrl` (not `req.path`) to avoid bucket collisions between mounted routers.

| Endpoint | Limit | Window |
|----------|-------|--------|
| Auth (login/register) | 15/min | 60s |
| Orders (POST) | 5/min | 60s |
| Reviews (POST) | 10/min | 60s |
| Reviews helpful (POST) | 20/min | 60s |
| AI generation (POST) | 5/min | 60s |

## Password Security

- Stored as bcrypt hash (10 rounds)
- Minimum 6 characters
- Password change requires current password
- `publicUser()` strips `passwordHash` from all responses
- Generic error messages don't reveal email existence

## Known Limitations

1. **No CSP** — Content Security Policy is disabled. Any XSS would have full access.
2. **JWT in localStorage** — Vulnerable to XSS token theft.
3. **No account lockout** — Rate limiting is per-IP, not per-account. Distributed brute-force possible.
4. **No CSRF protection** — JWT in Authorization header is not vulnerable to CSRF, but if migrated to cookies, CSRF tokens would be needed.
5. **In-memory rate limiter** — Not suitable for multi-process deployments.
6. **In-memory DLQ** — Server restart loses queued notifications.
