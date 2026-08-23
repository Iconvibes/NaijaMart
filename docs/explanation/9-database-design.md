# Database Design & Dual-Store Pattern

Why NaijaMart has two data stores and how the dual-branch pattern works.

## Why Two Stores?

NaijaMart is designed to **work without a database** for demos and quick starts. When MongoDB is unavailable, all data lives in JavaScript objects in memory. This means:

- No database installation required
- `npm install && npm run dev:full` is all you need
- Data is seeded automatically on first run
- Same API, same frontend, same tests in both modes

## The `isMemoryDb()` Flag

**File:** `server/db.js`

```javascript
let mode = 'memory'

export const isMemoryDb = () => mode === 'memory'

export async function connectDb() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/naijamart'
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 })
    mode = 'mongo'
  } catch {
    mode = 'memory'
  }
}
```

The flag is set once at startup and never changes during runtime. Even if MongoDB connection drops later, the app stays in whatever mode it started in.

## Dual-Branch Pattern

Every method in `server/store.js` has two code paths:

```javascript
async findProducts(query) {
  // Branch 1: In-memory
  if (isMemoryDb()) {
    let list = mem.products
    // Filter, sort, paginate in JavaScript
    return { products: list.map(toProductObj), total, page, limit }
  }

  // Branch 2: MongoDB
  const docs = await Product.find(query).sort(sortObj).skip(skip).limit(limit)
  return {
    products: docs.map(d => toProductObj({ ...d.toObject(), id: d._id })),
    total, page, limit,
  }
}
```

### In-Memory Data Structures

```javascript
const mem = {
  users: [],      // Array of user objects
  products: [],   // Array of product objects
  orders: [],     // Array of order objects
  // ... other collections
  uid: 0,         // Auto-increment counters
  pid: 0,
  oid: 0,
  // ...
}
```

IDs are simple strings: `u1`, `p1`, `o1`, `l1`, etc.

### MongoDB Documents

Standard Mongoose schemas with ObjectId references. IDs are 24-character hex strings.

## The `toXxxObj` Converter

Every collection has a converter that normalizes both sources to the same shape:

```javascript
const toProductObj = (p) => ({
  id: String(p.id),           // String for both (ObjectId → string)
  name: p.name,
  price: p.price,
  vendorId: String(p.vendorId), // Normalize IDs
  createdAt: p.createdAt,
})
```

This ensures the API returns the same JSON shape regardless of which store is active.

## Data Flow

```
Route Handler
    │
    ▼
repo.findProducts(query)
    │
    ├── isMemoryDb()?
    │   ├── YES → filter mem.products array
    │   └── NO  → Product.find(query) via Mongoose
    │
    ▼
toProductObj() normalizes both to same shape
    │
    ▼
res.json({ products })
```

## Writing New Store Methods

When adding a new collection:

1. **Create Mongoose schema** in `server/models/`
2. **Add in-memory arrays** and counters to `mem`
3. **Add `toXxxObj`** converter
4. **Add repo methods** with both branches
5. **Update `seed.js`** if the collection needs seed data

**Critical rule:** Every store method MUST have both branches. If you only implement the MongoDB branch, the in-memory mode breaks and the demo stops working.

## Performance Characteristics

| Aspect | In-Memory | MongoDB |
|--------|-----------|---------|
| **Startup** | Instant | Depends on DB connection |
| **Read speed** | O(n) array scans | Indexed queries, much faster at scale |
| **Write speed** | O(1) push | Indexed inserts |
| **Persistence** | None (lost on restart) | Full persistence |
| **Concurrency** | Single-process only | Multi-process safe |
| **Memory** | All data in Node.js heap | DB handles storage |

## Seeding

**File:** `server/seed.js`

On first run (empty database), the app seeds:
- 1 admin account
- 5 vendor accounts with logos
- ~50 catalog products mapped to vendors

Seed data is imported from `src/data/catalog.js` (shared between frontend static data and backend seeding).

## Migration Path

To move from in-memory to MongoDB:

1. Set `MONGODB_URI` in `.env`
2. Restart the server
3. Seed data is created automatically in MongoDB
4. All subsequent operations use MongoDB

There's no data migration tool — the in-memory store is for demos only. Production deployments should always use MongoDB from the start.
