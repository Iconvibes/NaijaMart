import { test } from 'node:test'
import assert from 'node:assert/strict'
import { repo } from '../server/store.js'
import { placeOrder } from '../server/services/orderIntake.js'
import { ValidationError } from '../server/lib/errors.js'

// The store defaults to its in-memory adapter until connectDb() succeeds, so
// these tests exercise placeOrder against the same repo seam production uses
// with Mongo - one interface, two adapters.

async function seedProduct(overrides = {}) {
  return repo.createProduct({
    name: 'Test Product',
    category: 'Electronics',
    price: 1000,
    image: '/images/test.jpg',
    vendorId: 'vendor-1',
    ...overrides,
  })
}

const validCustomer = {
  customerName: 'Ada Obi',
  customerPhone: '08031234567',
  customerAddress: '12 Adeola Odeku St, Lagos',
}

test('creates an order with per-vendor line items and a correct total', async () => {
  const a = await seedProduct({ name: 'Item A', price: 5000, vendorId: 'vendor-1' })
  const b = await seedProduct({ name: 'Item B', price: 3000, vendorId: 'vendor-2' })

  const order = await placeOrder({
    ...validCustomer,
    items: [
      { productId: a.id, qty: 2 },
      { productId: b.id, qty: 1 },
    ],
  })

  assert.equal(order.items.length, 2)
  assert.equal(order.items[0].vendorId, 'vendor-1')
  assert.equal(order.items[1].vendorId, 'vendor-2')
  assert.equal(order.total, 2 * 5000 + 1 * 3000)
  assert.equal(order.status, 'pending')
})

test('ignores client-supplied prices and vendorIds - the server is the price authority', async () => {
  const p = await seedProduct({ name: 'Priced Right', price: 2000, vendorId: 'vendor-1' })

  const order = await placeOrder({
    ...validCustomer,
    items: [{ productId: p.id, qty: 1, price: 1, vendorId: 'evil-vendor' }],
  })

  assert.equal(order.items[0].price, 2000)
  assert.equal(order.items[0].vendorId, 'vendor-1')
})

test('requires name, phone and address', async () => {
  await assert.rejects(
    placeOrder({ customerPhone: '1', customerAddress: 'X', items: [] }),
    (err) => err instanceof ValidationError && err.message === 'Name, phone and address are required'
  )
  await assert.rejects(
    placeOrder({ ...validCustomer, customerPhone: '' }),
    (err) => err instanceof ValidationError && err.message === 'Name, phone and address are required'
  )
})

test('rejects an empty cart', async () => {
  await assert.rejects(
    placeOrder({ ...validCustomer, items: [] }),
    /Your cart is empty/
  )
  await assert.rejects(
    placeOrder({ ...validCustomer }),
    /Your cart is empty/
  )
})

test('rejects items that no longer exist', async () => {
  await assert.rejects(
    placeOrder({ ...validCustomer, items: [{ productId: 'missing-product', qty: 1 }] }),
    /missing-product no longer exists/
  )
})

test('clamps quantity to 1..99 and coerces numeric strings', async () => {
  const p = await seedProduct({ price: 100 })

  const order = await placeOrder({
    ...validCustomer,
    items: [
      { productId: p.id, qty: 0 },
      { productId: p.id, qty: 999 },
      { productId: p.id, qty: '3' },
      { productId: p.id, qty: 'garbage' },
    ],
  })

  assert.deepEqual(order.items.map((i) => i.qty), [1, 99, 3, 1])
  assert.equal(order.total, (1 + 99 + 3 + 1) * 100)
})

test('trims customer details', async () => {
  const p = await seedProduct({ price: 100 })

  const order = await placeOrder({
    customerName: '  Ada  ',
    customerPhone: ' 0803 ',
    customerAddress: ' Lagos ',
    items: [{ productId: p.id, qty: 1 }],
  })

  assert.equal(order.customerName, 'Ada')
  assert.equal(order.customerPhone, '0803')
  assert.equal(order.customerAddress, 'Lagos')
})
