import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/useAuth'
import { formatNaira } from '../data/catalog'
import { CheckIcon, ClockIcon, PackageIcon, TruckIcon } from '../components/Icons'

const statusIcon = (s) =>
  ({ pending: ClockIcon, processing: PackageIcon, shipped: TruckIcon, delivered: CheckIcon })[s] || ClockIcon

const statusColor = (s) =>
  ({
    pending: 'bg-gray-100 text-gray-600',
    processing: 'bg-primary/10 text-primary',
    shipped: 'bg-accent/10 text-accent',
    delivered: 'bg-accent/10 text-accent',
    cancelled: 'bg-danger/10 text-danger',
  })[s] || 'bg-gray-100 text-gray-600'

const shortId = (id) => (id.length > 10 ? `#${id.slice(-8).toUpperCase()}` : `#${id}`)

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

export default function AccountPage() {
  const { user } = useAuth()
  const [orderId, setOrderId] = useState('')
  const [phone, setPhone] = useState('')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLookup = async (e) => {
    e.preventDefault()
    setError('')
    setOrder(null)
    setLoading(true)
    try {
      const result = await api.lookupOrder(orderId.trim(), phone.trim())
      setOrder(result.order)
    } catch (err) {
      setError(err.message || 'Order not found')
    } finally {
      setLoading(false)
    }
  }

  const Icon = order ? statusIcon(order.status) : ClockIcon

  return (
    <div className="max-w-3xl mx-auto px-4 mt-6 mb-10">
      <h1 className="text-lg font-black text-secondary mb-4">
        {user ? `Hello, ${user.name.split(' ')[0]}` : 'My Account'}
      </h1>

      {/* quick links */}
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <Link to="/shop" className="bg-white rounded-lg shadow-card p-4 hover:shadow-md transition-shadow">
          <span className="text-2xl block mb-1">🛍️</span>
          <p className="text-xs font-bold text-secondary">Continue Shopping</p>
          <p className="text-[10px] text-gray-500">Browse all products</p>
        </Link>
        <Link to="/track-order" className="bg-white rounded-lg shadow-card p-4 hover:shadow-md transition-shadow">
          <span className="text-2xl block mb-1">📦</span>
          <p className="text-xs font-bold text-secondary">Track an Order</p>
          <p className="text-[10px] text-gray-500">Check delivery status</p>
        </Link>
        <Link to="/deals" className="bg-white rounded-lg shadow-card p-4 hover:shadow-md transition-shadow">
          <span className="text-2xl block mb-1">🔥</span>
          <p className="text-xs font-bold text-secondary">Today's Deals</p>
          <p className="text-[10px] text-gray-500">Don't miss out</p>
        </Link>
      </div>

      {/* order lookup */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-black text-secondary">Look up an order</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">Enter your order ID and the phone number used at checkout</p>
        </div>

        <form onSubmit={handleLookup} className="p-4 space-y-4">
          {error && (
            <p className="bg-danger/10 border border-danger/30 text-danger text-xs font-semibold rounded px-3 py-2">{error}</p>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold text-secondary mb-1 block">Order ID</span>
              <input
                type="text"
                required
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. 66a1b2c3d4e5f6a7b8c9d0e1"
                className="w-full border border-gray-300 rounded text-sm px-3 py-2.5 outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-secondary mb-1 block">Phone number</span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Your checkout phone number"
                className="w-full border border-gray-300 rounded text-sm px-3 py-2.5 outline-none focus:border-primary"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-white text-xs font-black rounded px-5 py-2.5 hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {loading ? 'Looking up...' : 'Find Order'}
          </button>
        </form>

        {/* result */}
        {order && (
          <div className="border-t border-gray-100 p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-full bg-secondary text-white grid place-items-center">
                <Icon className="w-5 h-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-secondary">Order {shortId(order.id)}</p>
                <p className="text-[10px] text-gray-500">{formatDate(order.createdAt)}</p>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wide rounded px-2 py-1 ${statusColor(order.status)}`}>
                {order.status}
              </span>
            </div>

            <div className="bg-background rounded-lg p-3 mb-3">
              <p className="text-xs font-medium text-secondary mb-1">{order.customerName}</p>
              <p className="text-[10px] text-gray-500">{order.customerAddress}</p>
            </div>

            <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg mb-3">
              {order.items.map((i, idx) => (
                <li key={idx} className="flex gap-3 p-3">
                  <img src={i.image} alt="" className="w-10 h-12 object-cover rounded bg-background border border-gray-100" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-secondary leading-snug line-clamp-1">{i.name}</p>
                    <p className="text-[10px] text-gray-400">{formatNaira(i.price)} × {i.qty}</p>
                  </div>
                  <span className="text-xs font-bold text-secondary">{formatNaira(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>

            <div className="flex justify-between items-baseline border-t border-gray-200 pt-3">
              <span className="text-sm font-medium text-secondary">Total</span>
              <span className="text-lg font-black text-secondary">{formatNaira(order.total)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
