import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canSetFulfillment, toVendorOrderView, WAREHOUSE_ADDRESS } from '../server/services/vendorOrderView.js'

// An order exactly as repo.findOrderById returns it.
function sampleOrder() {
  return {
    id: 'o1',
    customerName: 'Ada Obi',
    customerPhone: '08031234567',
    customerAddress: '12 Adeola Odeku St, Lagos',
    items: [
      { productId: 'p1', vendorId: 'v-tech', name: 'FreePods', price: 18500, qty: 2, fulfillment: 'pending' },
      { productId: 'p2', vendorId: 'v-slot', name: 'Blender', price: 27900, qty: 1, fulfillment: 'pending' },
    ],
    total: 64900,
    status: 'pending',
    createdAt: '2026-08-17T10:00:00Z',
  }
}

test('a vendor sees only their own line items and their subtotal', () => {
  const view = toVendorOrderView(sampleOrder(), 'v-tech')

  assert.equal(view.items.length, 1)
  assert.equal(view.items[0].name, 'FreePods')
  assert.equal(view.subtotal, 2 * 18500)
  assert.equal(view.sellerCount, 2)
  assert.equal(view.multiSeller, true)
})

test('multi-seller orders withhold the buyer street address from vendors', () => {
  const view = toVendorOrderView(sampleOrder(), 'v-slot')

  assert.equal(view.customerAddress, null)
  // name and phone stay - the seller may need to contact the buyer
  assert.equal(view.customerName, 'Ada Obi')
  assert.equal(view.customerPhone, '08031234567')
})

test('single-seller orders keep the buyer address - the seller ships directly', () => {
  const single = { ...sampleOrder(), items: [sampleOrder().items[0]] }
  const view = toVendorOrderView(single, 'v-tech')

  assert.equal(view.multiSeller, false)
  assert.equal(view.sellerCount, 1)
  assert.equal(view.customerAddress, '12 Adeola Odeku St, Lagos')
  assert.equal(view.subtotal, 37000)
})

test('the full order total is never exposed to a vendor (it reveals other sellers earnings)', () => {
  const view = toVendorOrderView(sampleOrder(), 'v-tech')

  assert.equal(view.total, undefined)
})

test('vendors may dispatch their items and undo a dispatch', () => {
  assert.equal(canSetFulfillment('vendor', 'pending', 'sent'), true)
  assert.equal(canSetFulfillment('vendor', 'sent', 'pending'), true)
})

test('vendors cannot confirm warehouse arrival - that is the admin', () => {
  assert.equal(canSetFulfillment('vendor', 'sent', 'received'), false)
  assert.equal(canSetFulfillment('vendor', 'pending', 'received'), false)
})

test('admins may set any fulfilment state; customers none', () => {
  assert.equal(canSetFulfillment('admin', 'sent', 'received'), true)
  assert.equal(canSetFulfillment('admin', 'pending', 'sent'), true)
  assert.equal(canSetFulfillment('customer', 'pending', 'sent'), false)
  assert.equal(canSetFulfillment('vendor', 'pending', 'bogus'), false)
})

test('the warehouse address is a stable, non-empty constant', () => {
  assert.equal(typeof WAREHOUSE_ADDRESS, 'string')
  assert.ok(WAREHOUSE_ADDRESS.length > 10)
  assert.match(WAREHOUSE_ADDRESS, /Lagos/)
})
