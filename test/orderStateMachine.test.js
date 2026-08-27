import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canTransition, legalTransitions, assertTransition } from '../server/services/orderStateMachine.js'

test('pending can transition to processing and cancelled', () => {
  assert.equal(canTransition('pending', 'processing'), true)
  assert.equal(canTransition('pending', 'cancelled'), true)
  assert.equal(canTransition('pending', 'shipped'), false)
  assert.equal(canTransition('pending', 'delivered'), false)
})

test('processing can transition to shipped and cancelled', () => {
  assert.equal(canTransition('processing', 'shipped'), true)
  assert.equal(canTransition('processing', 'cancelled'), true)
  assert.equal(canTransition('processing', 'pending'), false)
  assert.equal(canTransition('processing', 'delivered'), false)
})

test('shipped can transition to delivered and cancelled', () => {
  assert.equal(canTransition('shipped', 'delivered'), true)
  assert.equal(canTransition('shipped', 'cancelled'), true)
  assert.equal(canTransition('shipped', 'pending'), false)
  assert.equal(canTransition('shipped', 'processing'), false)
})

test('delivered is terminal - no transitions allowed', () => {
  assert.equal(canTransition('delivered', 'pending'), false)
  assert.equal(canTransition('delivered', 'shipped'), false)
  assert.equal(canTransition('delivered', 'cancelled'), false)
  assert.equal(canTransition('delivered', 'delivered'), true) // idempotent
})

test('cancelled is terminal - no transitions allowed', () => {
  assert.equal(canTransition('cancelled', 'pending'), false)
  assert.equal(canTransition('cancelled', 'processing'), false)
  assert.equal(canTransition('cancelled', 'shipped'), false)
  assert.equal(canTransition('cancelled', 'cancelled'), true) // idempotent
})

test('same status is always allowed (idempotent)', () => {
  assert.equal(canTransition('pending', 'pending'), true)
  assert.equal(canTransition('processing', 'processing'), true)
  assert.equal(canTransition('shipped', 'shipped'), true)
})

test('invalid statuses are rejected', () => {
  assert.equal(canTransition('bogus', 'pending'), false)
  assert.equal(canTransition('pending', 'bogus'), false)
})

test('legalTransitions returns correct allowed targets', () => {
  assert.deepEqual(new Set(legalTransitions('pending')), new Set(['processing', 'cancelled']))
  assert.deepEqual(new Set(legalTransitions('processing')), new Set(['shipped', 'cancelled']))
  assert.deepEqual(new Set(legalTransitions('shipped')), new Set(['delivered', 'cancelled']))
  assert.deepEqual(legalTransitions('delivered'), [])
  assert.deepEqual(legalTransitions('cancelled'), [])
})

test('assertTransition throws on invalid transition', () => {
  assert.doesNotThrow(() => assertTransition('pending', 'processing'))
  assert.throws(
    () => assertTransition('delivered', 'pending'),
    /Invalid order status transition/
  )
})
