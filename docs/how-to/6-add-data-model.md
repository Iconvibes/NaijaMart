# Add a New Data Model

How to add a new collection to NaijaMart with full in-memory fallback support.

## The Dual-Store Pattern

Every model in NaijaMart works with **both** MongoDB and an in-memory store. This is the core architectural constraint — the app must work without a database for demos.

```
server/models/YourModel.js   → Mongoose schema (MongoDB)
server/store.js              → Dual-branch methods (in-memory + MongoDB)
```

## Steps

### 1. Create the Mongoose schema

Create `server/models/YourModel.js`:

```javascript
import mongoose from 'mongoose'

const yourSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' },
}, { timestamps: true })

// Add indexes for common queries
yourSchema.index({ userId: 1 })

export default mongoose.model('YourModel', yourSchema)
```

### 2. Add to the store

In `server/store.js`:

**a) Import the model:**
```javascript
import YourModel from './models/YourModel.js'
```

**b) Add in-memory arrays and counters:**
```javascript
const mem = {
  // ...existing...
  yours: [],
  yid: 0,
}
```

**c) Add a `toYourObj` converter:**
```javascript
const toYourObj = (y) => ({
  id: String(y.id),
  name: y.name,
  userId: String(y.userId),
  amount: y.amount,
  status: y.status || 'pending',
  createdAt: y.createdAt,
})
```

**d) Add repo methods with dual branches:**
```javascript
export const repo = {
  // ...existing methods...

  async createYourThing(data) {
    if (isMemoryDb()) {
      const item = { id: `y${++mem.yid}`, createdAt: new Date().toISOString(), ...data }
      mem.yours.push(item)
      return toYourObj(item)
    }
    const doc = await YourModel.create(data)
    return toYourObj({ ...doc.toObject(), id: doc._id })
  },

  async findYourThings({ userId, status } = {}) {
    if (isMemoryDb()) {
      let list = mem.yours
      if (userId) list = list.filter((x) => String(x.userId) === String(userId))
      if (status) list = list.filter((x) => x.status === status)
      return list.map(toYourObj)
    }
    const query = {}
    if (userId) query.userId = userId
    if (status) query.status = status
    const docs = await YourModel.find(query).sort({ createdAt: -1 })
    return docs.map((d) => toYourObj({ ...d.toObject(), id: d._id }))
  },

  async findYourThingById(id) {
    if (isMemoryDb()) {
      const item = mem.yours.find((x) => String(x.id) === String(id))
      return item ? toYourObj(item) : null
    }
    if (!mongoose.isValidObjectId(id)) return null
    const doc = await YourModel.findById(id)
    return doc ? toYourObj({ ...doc.toObject(), id: doc._id }) : null
  },

  async updateYourThing(id, data) {
    if (isMemoryDb()) {
      const item = mem.yours.find((x) => String(x.id) === String(id))
      if (!item) return null
      Object.assign(item, data)
      return toYourObj(item)
    }
    const doc = await YourModel.findByIdAndUpdate(id, data, { new: true })
    return doc ? toYourObj({ ...doc.toObject(), id: doc._id }) : null
  },
}
```

### 3. Create routes

Create `server/routes/yourRoutes.js` and register it in `server/index.js`. See [Add a New API Endpoint](4-add-api-endpoint.md).

### 4. Add API client methods

In `src/api.js`, add the frontend API calls.

## Rules

- **Every store method MUST have both branches** — `if (isMemoryDb()) { ... } else { ... }`
- **Use `String()` for ID comparisons** in in-memory mode (IDs are strings like `y1`, not ObjectIds)
- **Use `mongoose.isValidObjectId(id)`** before MongoDB queries with user-provided IDs
- **The `toXxxObj` converter** normalizes both in-memory and MongoDB documents to the same shape
- **Don't destructure repo methods** — they use `this` internally (e.g., `createUser` calls `this.findUserBySlug`)

## See Also

- [Data Models Reference](../reference/4-data-models.md)
- [Database Design & Dual-Store Pattern](../explanation/9-database-design.md)
- [In-Memory vs MongoDB Store](8-work-with-in-memory-vs-mongodb.md)
