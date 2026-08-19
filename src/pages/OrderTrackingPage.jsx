import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { formatNaira } from '../data/catalog'
import { CheckIcon, ClockIcon, PackageIcon, TruckIcon } from '../components/Icons'

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: PackageIcon },
  { key: 'processing', label: 'Processing', icon: ClockIcon },
  { key: 'shipped', label: 'Shipped', icon: TruckIcon },
  { key: 'delivered', label: 'Delivered', icon: CheckIcon },
]

const statusIndex = (s) => statusSteps.findIndex((step) => step.key === s)

const fulfillmentBadge = (f) =>
  ({
    pending: 'bg-gray-100 text-gray-500',
    sent: 'bg-primary/10 text-primary',
    received: 'bg-accent/10 text-accent',
  })[f] || 'bg-gray-100 text-gray-500'

const fulfillmentLabel = (f) =>
  ({ pending: 'Not dispatched', sent: 'Dispatched', received: 'Received' })[f] || f

const shortId = (id) => (id.length > 10 ? `#${id.slice(-8).toUpperCase()}` : `#${id}`)

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function OrderTrackingPage() {
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

  const currentStep = order ? statusIndex(order.status) : -1

  return (
    <div className="max-w-2xl mx-auto px-4 mt-6 mb-10">
      <h1 className="text-lg font-black text-secondary mb-4">Track Your Order</h1>

      {/* lookup form */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-black text-secondary">Enter your details</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">Provide your order ID and the phone number used at checkout</p>
        </div>

        <form onSubmit={handleLookup} className="p-4 space-y-4">
          {error && (
            <p className="bg-danger/10 border border-danger/30 text-danger text-xs font-semibold rounded px-3 py-2">{error}</p>
          )}

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
              placeholder="The phone number you used at checkout"
              className="w-full border border-gray-300 rounded text-sm px-3 py-2.5 outline-none focus:border-primary"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white text-sm font-black rounded py-3 hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {loading ? 'Looking up...' : 'Track Order'}
          </button>
        </form>
      </div>

      {/* order result */}
      {order && (
        <div className="mt-4 bg-white rounded-lg shadow-card overflow-hidden">
          {/* status banner */}
          <div className="bg-secondary px-4 py-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-white text-sm font-black">Order {shortId(order.id)}</p>
                <p className="text-white/60 text-[11px] mt-0.5">{formatDate(order.createdAt)}</p>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wide rounded px-2.5 py-1 ${
                order.status === 'delivered' ? 'bg-accent text-white' :
                order.status === 'cancelled' ? 'bg-danger text-white' :
                'bg-white/20 text-white'
              }`}>
                {order.status}
              </span>
            </div>
          </div>

          {/* progress steps */}
          {order.status !== 'cancelled' && (
            <div className="px-4 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                {statusSteps.map((step, i) => {
                  const done = i <= currentStep
                  const Icon = step.icon
                  return (
                    <div key={step.key} className="flex flex-col items-center flex-1">
                      <span className={`w-8 h-8 rounded-full grid place-items-center ${
                        done ? 'bg-accent text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className={`text-[9px] mt-1 text-center font-bold ${
                        done ? 'text-secondary' : 'text-gray-400'
                      }`}>{step.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {order.status === 'cancelled' && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-bold text-danger">This order has been cancelled.</p>
            </div>
          )}

          {/* payment info */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">Payment</span>
            <div className="text-right">
              <span className="text-xs font-bold text-secondary capitalize">{order.payment?.method || 'cod'}</span>
              <span className={`ml-2 text-[9px] font-black uppercase rounded px-1.5 py-0.5 ${
                order.payment?.status === 'captured' ? 'bg-accent/10 text-accent' :
                order.payment?.status === 'refunded' ? 'bg-danger/10 text-danger' :
                'bg-gray-100 text-gray-500'
              }`}>
                {order.payment?.status || 'pending'}
              </span>
            </div>
          </div>

          {/* delivery info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-bold text-secondary mb-1">Delivering to</p>
            <p className="text-xs text-gray-600">{order.customerName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{order.customerAddress}</p>
          </div>

          {/* items */}
          <div className="px-4 py-3">
            <p className="text-xs font-bold text-secondary mb-2">Items</p>
            <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
              {order.items.map((i, idx) => (
                <li key={idx} className="flex gap-3 p-3">
                  <img src={i.image} alt="" className="w-12 h-14 object-cover rounded bg-background border border-gray-100" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-secondary leading-snug line-clamp-2">{i.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatNaira(i.price)} × {i.qty}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-block text-[9px] font-black uppercase tracking-wide rounded px-1.5 py-0.5 ${fulfillmentBadge(i.fulfillment)}`}>
                      {fulfillmentLabel(i.fulfillment)}
                    </span>
                    <p className="text-xs font-bold text-secondary mt-1">{formatNaira(i.price * i.qty)}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex justify-between items-baseline border-t border-gray-200 mt-3 pt-3">
              <span className="text-sm font-medium text-secondary">Total</span>
              <span className="text-lg font-black text-secondary">{formatNaira(order.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
