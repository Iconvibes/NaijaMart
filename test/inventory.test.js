import { test } from 'node:test'
import assert from 'node:assert/strict'
import { repo } from '../server/store.js'

async function seedProduct(overrides = {}) {
  return repo.createProduct({
    name: 'Stock Product',
    category: 'Electronics',
    price: 5000,
    image: '/images/test.jpg',
    vendorId: 'vendor-1',
    ...overrides,
  })
}

test('decrementStock reduces stock atomically', async () => {
  const p = await seedProduct({ stock: 10, inStock: true })
  const updated = await repo.decrementStock(p.id, 3)
  assert.equal(updated.stock, 7)
  assert.equal(updated.inStock, true)
})

test('decrementStock returns null when insufficient stock', async () => {
  const p = await seedProduct({ stock: 2 })
  const result = await repo.decrementStock(p.id, 5)
  assert.equal(result, null)
  // Original stock unchanged
  const fresh = await repo.findProductById(p.id)
  assert.equal(fresh.stock, 2)
})

test('decrementStock sets inStock=false when stock reaches zero', async () => {
  const p = await seedProduct({ stock: 3 })
  const updated = await repo.decrementStock(p.id, 3)
  assert.equal(updated.stock, 0)
  assert.equal(updated.inStock, false)
})

test('decrementStock on unlimited product (stock=null) always succeeds', async () => {
  const p = await seedProduct({ stock: null, inStock: true })
  const updated = await repo.decrementStock(p.id, 100)
  assert.ok(updated) // null stock means unlimited
})

test('restoreStock increases stock and sets inStock=true', async () => {
  const p = await seedProduct({ stock: 0, inStock: false })
  await repo.restoreStock(p.id, 5)
  const fresh = await repo.findProductById(p.id)
  assert.equal(fresh.stock, 5)
  assert.equal(fresh.inStock, true)
})

test('decrementStock and restoreStock work together for order rollback', async () => {
  const p = await seedProduct({ stock: 10 })

  // Reserve stock
  const updated = await repo.decrementStock(p.id, 7)
  assert.equal(updated.stock, 3)

  // Rollback
  await repo.restoreStock(p.id, 7)
  const restored = await repo.findProductById(p.id)
  assert.equal(restored.stock, 10)
  assert.equal(restored.inStock, true)
})

test('concurrent decrements respect stock limits (sequential simulation)', async () => {
  const p = await seedProduct({ stock: 5 })

  // Sequential decrements - each should succeed until stock runs out
  const r1 = await repo.decrementStock(p.id, 3)
  assert.ok(r1)
  assert.equal(r1.stock, 2)

  const r2 = await repo.decrementStock(p.id, 2)
  assert.ok(r2)
  assert.equal(r2.stock, 0)
  assert.equal(r2.inStock, false)

  const r3 = await repo.decrementStock(p.id, 1)
  assert.equal(r3, null) // insufficient
})
