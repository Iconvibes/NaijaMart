import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createProductSource } from '../src/productSource.js'

// The factory is the testable seam: pure JS, no React, so a fake fetcher
// drives every caching behavior. The production singleton wires the same
// factory to the HTTP client.

const products = [{ id: 'p1', name: 'Alpha' }, { id: 'p2', name: 'Beta' }]

test('concurrent callers share one request (caches the promise)', async () => {
  let calls = 0
  const source = createProductSource({
    fetchProducts: () => {
      calls++
      return Promise.resolve(products)
    },
  })

  const [a, b, c] = await Promise.all([
    source.fetchProducts(),
    source.fetchProducts(),
    source.fetchProducts(),
  ])

  assert.equal(calls, 1, 'three concurrent callers must trigger one fetch')
  assert.equal(a, products)
  assert.equal(b, products)
  assert.equal(c, products)
})

test('resolved cache is reused on later calls', async () => {
  let calls = 0
  const source = createProductSource({
    fetchProducts: () => {
      calls++
      return Promise.resolve(products)
    },
  })

  await source.fetchProducts()
  await source.fetchProducts()

  assert.equal(calls, 1)
})

test('invalidateProducts clears the cache so the next call refetches', async () => {
  let calls = 0
  const source = createProductSource({
    fetchProducts: () => {
      calls++
      return Promise.resolve(products)
    },
  })

  await source.fetchProducts()
  source.invalidateProducts()
  await source.fetchProducts()

  assert.equal(calls, 2)
})

test('a failed fetch clears the cache so a retry refetches instead of replaying the outage', async () => {
  let calls = 0
  const source = createProductSource({
    fetchProducts: () => {
      calls++
      return calls === 1 ? Promise.reject(new Error('API down')) : Promise.resolve(products)
    },
  })

  await assert.rejects(source.fetchProducts(), /API down/)
  // Cache must be empty now - a retry issues a fresh request and succeeds.
  const data = await source.fetchProducts()
  assert.equal(data, products)
  assert.equal(calls, 2)
})

test('rejection propagates to every caller sharing the in-flight request', async () => {
  const source = createProductSource({
    fetchProducts: () => Promise.reject(new Error('boom')),
  })

  await assert.rejects(source.fetchProducts(), /boom/)
  await assert.rejects(source.fetchProducts(), /boom/)
})
