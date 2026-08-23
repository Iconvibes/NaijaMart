# Work with the In-Memory vs MongoDB Store

How to understand and work with NaijaMart's dual-store architecture.

## The Pattern

NaijaMart runs fully without a database. When MongoDB is not configured or unreachable, all data lives in JavaScript objects in memory. Every store method has two branches:

```javascript
async findProducts(query) {
  if (isMemoryDb()) {
    // In-memory: filter arrays in JS
    return mem.products.filter(...).map(toProductObj)
  }
  // MongoDB: use Mongoose queries
  return Product.find(query).sort(...).map(toProductObj)
}
```

## When Each Mode is Used

| Mode | Trigger | Behavior |
|------|---------|----------|
| **In-memory** | No `MONGODB_URI` set, or MongoDB unreachable | Data lost on server restart |
| **MongoDB** | `MONGODB_URI` set and MongoDB reachable | Persistent storage |

Check current mode: `GET /api/health` → `dependencies.mongodb.mode` (`"in-memory"` or `"connected"`)

## How to Switch

**To use in-memory (default):** Don't set `MONGODB_URI` in `.env`.

**To use MongoDB:** Set `MONGODB_URI` in `.env`:
```
MONGODB_URI=mongodb://127.0.0.1:27017/naijamart
```

The app auto-detects on startup. If MongoDB is unreachable, it falls back to in-memory with a warning.

## Writing Code That Works in Both Modes

### ID handling

In-memory IDs are strings (`u1`, `p1`, `o1`). MongoDB IDs are ObjectIds.

```javascript
// ALWAYS use String() for comparisons
if (String(item.vendorId) === String(userId)) { ... }

// ALWAYS check isValidObjectId before MongoDB queries
if (!mongoose.isValidObjectId(id)) return null
```

### Data conversion

Every model has a `toXxxObj` function that normalizes both sources:

```javascript
const toProductObj = (p) => ({
  id: String(p.id),           // String for both
  name: p.name,
  price: p.price,
  vendorId: String(p.vendorId), // String for both
  createdAt: p.createdAt,
})
```

### Counter-based IDs

In-memory mode uses simple counters:

```javascript
const mem = {
  products: [],
  pid: 0,  // Counter for product IDs
}

// Create
const product = { id: `p${++mem.pid}`, ...data }
```

### Query filtering

In-memory filtering mirrors MongoDB query patterns:

```javascript
// MongoDB
const docs = await Product.find({ vendorId, status: 'active' })

// In-memory equivalent
let list = mem.products
if (vendorId) list = list.filter((x) => String(x.vendorId) === String(vendorId))
if (status) list = list.filter((x) => x.status === status)
```

## Testing in Both Modes

```bash
# Test with in-memory (default)
npm test

# Test with MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/naijamart-test npm test
```

All 35 unit tests run against the in-memory store by default.

## Gotchas

- **`repo` methods use `this`** — don't destructure them. `const { createUser } = repo` breaks because `createUser` calls `this.findUserBySlug()`.
- **In-memory data is volatile** — server restart loses everything. Seed data is re-created automatically on empty database.
- **The `isMemoryDb()` flag is set once at startup** — it doesn't change during runtime even if MongoDB connection drops.

## See Also

- [Database Design & Dual-Store Pattern](../explanation/9-database-design.md)
- [Data Models Reference](../reference/4-data-models.md)
