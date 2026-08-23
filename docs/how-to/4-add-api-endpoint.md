# Add a New API Endpoint

How to add a new route to the Express API.

## Pattern

Every endpoint follows this structure:

```
server/routes/<name>.js   → Route handler (validation, auth, response)
server/store.js           → Data access (dual-branch: in-memory + MongoDB)
server/models/<Name>.js   → Mongoose schema (MongoDB only)
```

## Steps

### 1. Define the Mongoose schema (if new collection)

Create `server/models/YourModel.js`:

```javascript
import mongoose from 'mongoose'

const yourSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  // ... fields
}, { timestamps: true })

export default mongoose.model('YourModel', yourSchema)
```

### 2. Add store methods

In `server/store.js`, add methods following the dual-branch pattern:

```javascript
import YourModel from './models/YourModel.js'

// In-memory store
const mem = {
  // ...existing...
  yours: [],
  yid: 0,
}

// Add to the mem object initialization
export const repo = {
  // ...existing methods...

  async createYourThing(data) {
    if (isMemoryDb()) {
      const item = { id: `y${++mem.yid}`, createdAt: new Date().toISOString(), ...data }
      mem.yours.push(item)
      return item
    }
    const doc = await YourModel.create(data)
    return { ...doc.toObject(), id: doc._id }
  },

  async findYourThings(query) {
    if (isMemoryDb()) {
      // Implement in-memory filtering
      return mem.yours.map(toYourObj)
    }
    const docs = await YourModel.find(query).sort({ createdAt: -1 })
    return docs.map((d) => ({ ...d.toObject(), id: d._id }))
  },
}
```

**Critical:** Every store method MUST have both `if (isMemoryDb())` and `else` branches. See [In-Memory vs MongoDB Store](8-work-with-in-memory-vs-mongodb.md).

### 3. Create the route file

Create `server/routes/yourRoutes.js`:

```javascript
import { Router } from 'express'
import { repo } from '../store.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// GET /api/your-things - public
router.get('/', async (req, res) => {
  const things = await repo.findYourThings({})
  res.json({ things })
})

// POST /api/your-things - authenticated
router.post('/', requireAuth, async (req, res) => {
  const { name } = req.body || {}
  if (!name) return res.status(400).json({ message: 'Name is required' })

  const thing = await repo.createYourThing({ name, userId: req.user.id })
  res.status(201).json({ thing })
})

export default router
```

### 4. Register the route

In `server/index.js`, add:

```javascript
import yourRoutes from './routes/yourRoutes.js'

// After other route registrations
app.use('/api/your-things', yourRoutes)
```

### 5. Add the frontend API method

In `src/api.js`:

```javascript
yourThings: () => request('/your-things'),
createYourThing: (payload) => request('/your-things', { method: 'POST', body: payload }),
```

## Auth Middleware Options

| Middleware | Use when |
|-----------|----------|
| None | Public endpoint |
| `requireAuth` | Any logged-in user |
| `requireAuth, requireRole('admin')` | Admin only |
| `requireAuth, requireRole('vendor', 'admin')` | Vendor or admin |
| `requireAuth, requireRole('vendor'), requireApprovedVendor` | Approved vendor only |

## Rate Limiting

Add rate limiting to prevent abuse:

```javascript
import { rateLimit } from '../middleware/rateLimit.js'

const myRateLimit = rateLimit({ windowMs: 60_000, max: 10, message: 'Too many requests' })
router.post('/', requireAuth, myRateLimit, async (req, res) => { ... })
```

**Important:** Rate limiter keys use `req.originalUrl` (full path), not `req.path` (which is `/` for mounted routers). This is already handled by the middleware.

## Validation Pattern

Validate at the route level before calling store methods:

```javascript
const { name, email, amount } = req.body || {}
if (!name || !email) {
  return res.status(400).json({ message: 'Name and email are required' })
}
if (typeof amount !== 'number' || amount <= 0) {
  return res.status(400).json({ message: 'Amount must be a positive number' })
}
```

Use `AppError` or `ValidationError` from `server/lib/errors.js` for typed errors that map to HTTP status codes.

## See Also

- [Data Models Reference](../reference/4-data-models.md)
- [API Endpoints Reference](../reference/1-api-endpoints.md)
- [Add a New Data Model](6-add-data-model.md)
