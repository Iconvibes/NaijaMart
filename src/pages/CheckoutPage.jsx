import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useCart } from '../context/useCart'
import { useAuth } from '../context/useAuth'
import { formatNaira } from '../data/catalog'
import { CheckIcon, CartIcon, ShieldIcon, TruckIcon } from '../components/Icons'

const orderRef = (id) => (id.length > 10 ? `#${id.slice(-8).toUpperCase()}` : `#${id}`)

export default function CheckoutPage() {
  const { items, cartCount, cartTotal, savings, clearCart } = useCart()
  const { user } = useAuth()
  const [customerName, setCustomerName] = useState(user?.name || '')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [placed, setPlaced] = useState(null)

  // vendors behind the items - used to tell the customer their order is split
  const vendorCount = useMemo(() => {
    const vendors = new Set()
    for (const { product } of items) vendors.add(product.vendor || '')
    return vendors.size
  }, [items])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      // The server re-snapshots each product's price + vendorId from the
      // catalog, so clients can't forge prices or vendor attribution.
      const { order } = await api.createOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        paymentMethod,
        items: items.map((i) => ({ productId: i.product.id, qty: i.qty })),
      })
      setPlaced(order)
      clearCart()
    } catch (err) {
      setError(err.message || 'Could not place your order')
    } finally {
      setBusy(false)
    }
  }

  /* ---- success confirmation ---- */
  if (placed) {
    const orderItems = placed.items || []
    const sellers = new Set(orderItems.map((i) => i.vendorId)).size
    return (
      <div className="max-w-3xl mx-auto px-4 mt-8 mb-10">
        <div className="bg-white rounded-lg shadow-card overflow-hidden text-center">
          <div className="bg-accent/10 py-8 px-4">
            <span className="mx-auto w-16 h-16 rounded-full bg-accent text-white grid place-items-center mb-3">
              <CheckIcon className="w-8 h-8" />
            </span>
            <h1 className="text-lg font-black text-secondary">Order placed successfully!</h1>
            <p className="text-xs text-gray-500 mt-1">
              Order reference <span className="font-bold text-secondary">{orderRef(placed.id)}</span> ·{' '}
              {formatNaira(placed.total)}
            </p>
          </div>

          <div className="p-5 text-left space-y-4">
            <div className="bg-background rounded-lg p-4 text-xs text-gray-600 space-y-1.5">
              <p className="flex justify-between gap-4">
                <span>Delivering to</span>
                <span className="font-bold text-secondary text-right">{placed.customerName}</span>
              </p>
              <p className="flex justify-between gap-4">
                <span>Address</span>
                <span className="font-semibold text-secondary text-right max-w-[70%]">{placed.customerAddress}</span>
              </p>
              <p className="flex justify-between gap-4">
                <span>Phone</span>
                <span className="font-semibold text-secondary">{placed.customerPhone}</span>
              </p>
            </div>

            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <TruckIcon className="w-4 h-4 text-accent shrink-0" />
              {sellers > 1
                ? 'Your items are consolidated at the NaijaMart warehouse and delivered to you as one package.'
                : 'Your item ships directly from its seller.'}
            </p>

            <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
              {orderItems.map((i) => (
                <div key={i.productId} className="flex gap-3 p-3">
                  <img src={i.image} alt="" className="w-12 h-14 object-cover rounded bg-background border border-gray-100" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-secondary leading-snug line-clamp-2">{i.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Qty: {i.qty}</p>
                  </div>
                  <span className="text-xs font-bold text-secondary shrink-0">{formatNaira(i.price * i.qty)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-baseline border-t border-gray-200 pt-3">
              <span className="text-sm font-medium text-secondary">Total</span>
              <span className="text-xl font-black text-secondary">{formatNaira(placed.total)}</span>
            </div>

            <div className="flex gap-2 pt-1">
              <Link
                to="/shop"
                className="flex-1 bg-primary text-white text-sm font-black rounded py-3 hover:bg-primary/90 transition-colors text-center"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ---- empty cart ---- */
  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 mt-8 mb-10">
        <div className="bg-white rounded-lg shadow-card p-10 text-center">
          <span className="bg-background rounded-full p-5 inline-block mb-3">
            <CartIcon className="w-10 h-10 text-gray-400" />
          </span>
          <p className="font-bold text-secondary">Your cart is empty</p>
          <p className="text-xs text-gray-500 mt-1 mb-4">Add some items before checking out.</p>
          <Link
            to="/shop"
            className="inline-block bg-primary text-white text-sm font-black rounded px-6 py-3 hover:bg-primary/90 transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 mt-4 mb-10">
      {/* breadcrumb */}
      <nav className="text-[11px] text-gray-500 mb-3" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-primary">Home</Link>
        <span className="mx-1.5">›</span>
        <Link to="/shop" className="hover:text-primary">Shop</Link>
        <span className="mx-1.5">›</span>
        <span className="text-secondary font-semibold">Checkout</span>
      </nav>

      <h1 className="text-lg font-black text-secondary mb-4">Checkout</h1>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-[1fr_360px] gap-4 items-start">
        {/* ---- delivery form ---- */}
        <div className="bg-white rounded-lg shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-black text-secondary">Delivery Details</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Where should your order be delivered?</p>
          </div>

          <div className="p-4 space-y-4">
            {error && (
              <p className="bg-danger/10 border border-danger/30 text-danger text-xs font-semibold rounded px-3 py-2">
                {error}
              </p>
            )}

            <label className="block">
              <span className="text-xs font-bold text-secondary mb-1 block">Full name</span>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Ada Obi"
                className="w-full border border-gray-300 rounded text-sm px-3 py-2.5 outline-none focus:border-primary"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-secondary mb-1 block">Phone number</span>
              <input
                type="tel"
                required
                pattern="[0-9+()\-\s]{7,}"
                title="Enter a valid phone number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. 0803 123 4567"
                className="w-full border border-gray-300 rounded text-sm px-3 py-2.5 outline-none focus:border-primary"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-secondary mb-1 block">Delivery address</span>
              <textarea
                required
                rows={3}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Street, area, city, state"
                className="w-full border border-gray-300 rounded text-sm px-3 py-2.5 outline-none focus:border-primary resize-none"
              />
            </label>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ShieldIcon className="w-4 h-4 text-accent shrink-0" />
              Your payment is held securely by NaijaMart until your order is delivered.
            </div>
          </div>
        </div>

        {/* ---- payment method ---- */}
        <div className="bg-white rounded-lg shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-black text-secondary">Payment Method</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Money is only released to sellers after delivery.</p>
          </div>
          <div className="p-4 space-y-2.5">
            {[
              { value: 'card', label: 'Card', note: 'Debit or credit card — paid now, held in escrow' },
              { value: 'transfer', label: 'Bank Transfer', note: 'Transfer to the NaijaMart account — held in escrow' },
              { value: 'cod', label: 'Pay on Delivery', note: 'Cash to the courier on arrival' },
            ].map((m) => (
              <label
                key={m.value}
                className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                  paymentMethod === m.value ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={m.value}
                  checked={paymentMethod === m.value}
                  onChange={() => setPaymentMethod(m.value)}
                  className="mt-0.5 accent-primary"
                />
                <span>
                  <span className="block text-xs font-bold text-secondary">{m.label}</span>
                  <span className="block text-[10px] text-gray-500 mt-0.5">{m.note}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* ---- order summary ---- */}
        <div className="bg-white rounded-lg shadow-card overflow-hidden lg:sticky lg:top-4">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-black text-secondary">
              Order Summary{' '}
              <span className="text-sm font-medium text-gray-400">({cartCount} {cartCount === 1 ? 'item' : 'items'})</span>
            </h2>
          </div>

          <div className="divide-y divide-gray-100 max-h-[340px] overflow-y-auto">
            {items.map(({ product, qty }) => (
              <div key={product.id} className="flex gap-3 p-3">
                <img src={product.image} alt="" className="w-14 h-16 object-cover rounded bg-background border border-gray-100" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-secondary leading-snug line-clamp-2">{product.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{product.vendor}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {formatNaira(product.price)} × {qty}
                  </p>
                </div>
                <span className="text-xs font-bold text-secondary shrink-0">{formatNaira(product.price * qty)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 p-4 space-y-2 text-xs">
            {savings > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">You're saving</span>
                <span className="text-accent font-bold">{formatNaira(savings)}</span>
              </div>
            )}
            {vendorCount > 1 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Sellers</span>
                <span className="text-secondary font-semibold">{vendorCount}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-gray-100">
              <span className="text-sm font-medium text-secondary">Total</span>
              <span className="text-xl font-black text-secondary">{formatNaira(cartTotal)}</span>
            </div>
            <p className="text-[10px] text-gray-500 flex items-center gap-1.5 pt-1">
              <TruckIcon className="w-3.5 h-3.5 text-accent" />
              Free delivery on orders over ₦50,000
            </p>

            <button
              type="submit"
              disabled={busy}
              className="w-full mt-2 bg-primary text-white text-sm font-black rounded py-3 hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {busy ? 'Placing order...' : `Place Order · ${formatNaira(cartTotal)}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
