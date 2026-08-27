import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useCart } from '../context/useCart'
import { formatNaira } from '../data/catalog'
import SEOHead from '../components/SEOHead'
import { CheckIcon, ClockIcon, PackageIcon, TruckIcon, CartIcon } from '../components/Icons'

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

const statusIcon = (s) =>
  ({ pending: ClockIcon, processing: PackageIcon, shipped: TruckIcon, delivered: CheckIcon })[s] || ClockIcon

const statusColor = (s) =>
  ({
    pending: 'bg-gray-100 text-gray-600',
    processing: 'bg-primary/10 text-primary',
    shipped: 'bg-blue-100 text-blue-600',
    delivered: 'bg-accent/10 text-accent',
    cancelled: 'bg-danger/10 text-danger',
  })[s] || 'bg-gray-100 text-gray-600'

const statusLabel = (s) =>
  ({ pending: 'Order Placed', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' })[s] || s

const paymentLabel = (s) =>
  ({ pending: 'Awaiting Payment', captured: 'Paid', refunded: 'Refunded' })[s] || s

const paymentColor = (s) =>
  ({ pending: 'text-yellow-600', captured: 'text-accent', refunded: 'text-danger' })[s] || 'text-gray-500'

const shortId = (id) => (id.length > 10 ? `#${id.slice(-8).toUpperCase()}` : `#${id}`)

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return iso }
}

const formatDateTime = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

// Status timeline step indicator
function StatusTimeline({ status }) {
  const currentIdx = ORDER_STATUSES.indexOf(status)
  const steps = ORDER_STATUSES.filter((s) => s !== 'cancelled')

  return (
    <div className="flex items-center gap-1 mt-3">
      {steps.map((step, idx) => {
        const isComplete = currentIdx >= idx || status === 'cancelled' && step === 'pending'
        const isCurrent = step === status
        return (
          <div key={step} className="flex items-center gap-1 flex-1">
            <div className={`w-2 h-2 rounded-full shrink-0 ${isComplete ? 'bg-accent' : 'bg-gray-300'} ${isCurrent ? 'ring-2 ring-accent/30' : ''}`} />
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 ${isComplete ? 'bg-accent' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function CustomerOrders() {
  const { addToCart } = useCart()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [reorderMessage, setReorderMessage] = useState('')

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    setLoading(true)
    setError('')
    try {
      const data = await api.orders()
      setOrders(data.orders || [])
    } catch (err) {
      setError(err.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  function handleReorder(order) {
    const inStockItems = order.items.filter((i) => !i.refunded)
    if (inStockItems.length === 0) return

    for (const item of inStockItems) {
      addToCart(
        { id: item.productId, name: item.name, image: item.image, price: item.price, vendor: '' },
        item.qty
      )
    }
    setReorderMessage(`Added ${inStockItems.length} item(s) to cart`)
    setTimeout(() => setReorderMessage(''), 3000)
  }

  function toggleExpand(id) {
    setExpandedId(expandedId === id ? null : id)
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 mt-6 mb-10">
        <div className="flex items-center justify-center py-20 text-sm text-gray-500">
          <svg className="animate-spin h-5 w-5 text-primary mr-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading your orders...
        </div>
      </div>
    )
  }

  return (
    <>
      <SEOHead title="My Orders — NaijaMart" description="View your order history, track deliveries, and reorder past purchases." />
      <div className="max-w-3xl mx-auto px-4 mt-6 mb-10">
        {/* Breadcrumb */}
        <nav className="text-[11px] text-gray-500 mb-3" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span className="mx-1.5">›</span>
          <Link to="/account" className="hover:text-primary">Account</Link>
          <span className="mx-1.5">›</span>
          <span className="text-secondary font-semibold">My Orders</span>
        </nav>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-black text-secondary">My Orders</h1>
          <Link to="/shop" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
            Continue Shopping →
          </Link>
        </div>

        {/* Reorder success message */}
        {reorderMessage && (
          <div className="bg-accent/10 border border-accent/30 text-accent text-xs font-semibold rounded px-4 py-2 mb-4 flex items-center gap-2">
            <CheckIcon className="w-4 h-4 shrink-0" />
            {reorderMessage}
            <Link to="/cart" className="ml-auto text-primary font-bold hover:underline">View Cart</Link>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-xs font-semibold rounded px-4 py-2 mb-4">
            {error}
          </div>
        )}

        {/* Empty state */}
        {orders.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow-card p-10 text-center">
            <span className="bg-background rounded-full p-5 inline-block mb-3">
              <PackageIcon className="w-10 h-10 text-gray-400" />
            </span>
            <p className="font-bold text-secondary">No orders yet</p>
            <p className="text-xs text-gray-500 mt-1 mb-4">When you place an order, it will appear here.</p>
            <Link
              to="/shop"
              className="inline-block bg-primary text-white text-sm font-black rounded px-6 py-3 hover:bg-primary/90 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        )}

        {/* Order list */}
        <div className="space-y-3">
          {orders.map((order) => {
            const Icon = statusIcon(order.status)
            const isExpanded = expandedId === order.id
            const itemCount = order.items?.length || 0

            return (
              <div key={order.id} className="bg-white rounded-lg shadow-card overflow-hidden">
                {/* Order header — always visible */}
                <button
                  onClick={() => toggleExpand(order.id)}
                  className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-full bg-secondary text-white grid place-items-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-secondary">{shortId(order.id)}</p>
                        <span className={`text-[10px] font-black uppercase tracking-wide rounded px-2 py-0.5 ${statusColor(order.status)}`}>
                          {statusLabel(order.status)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500">{formatDate(order.createdAt)}</p>
                      <StatusTimeline status={order.status} />
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-secondary">{formatNaira(order.total)}</p>
                      <p className={`text-[10px] font-semibold ${paymentColor(order.payment?.status)}`}>
                        {paymentLabel(order.payment?.status)}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 space-y-3">
                    {/* Delivery info */}
                    <div className="bg-background rounded-lg p-3 text-xs space-y-1">
                      <p className="font-bold text-secondary">{order.customerName}</p>
                      <p className="text-gray-500">{order.customerAddress}</p>
                      {order.customerPhone && <p className="text-gray-500">📞 {order.customerPhone}</p>}
                      {order.deliveredAt && (
                        <p className="text-accent font-semibold">✓ Delivered on {formatDateTime(order.deliveredAt)}</p>
                      )}
                    </div>

                    {/* Items */}
                    <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
                      {order.items.map((item, idx) => (
                        <li key={idx} className={`flex gap-3 p-3 ${item.refunded ? 'opacity-50' : ''}`}>
                          <img
                            src={item.image}
                            alt=""
                            className="w-12 h-14 object-cover rounded bg-background border border-gray-100"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-secondary leading-snug line-clamp-2">{item.name}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {formatNaira(item.price)} × {item.qty}
                            </p>
                            {item.fulfillment === 'sent' && (
                              <p className="text-[10px] text-accent font-semibold">📦 Shipped by seller</p>
                            )}
                            {item.refunded && (
                              <p className="text-[10px] text-danger font-semibold">↩ Refunded</p>
                            )}
                          </div>
                          <span className="text-xs font-bold text-secondary shrink-0">
                            {formatNaira(item.price * item.qty)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Totals */}
                    <div className="space-y-1 text-xs">
                      {order.discountAmount > 0 && (
                        <div className="flex justify-between text-accent">
                          <span>Coupon discount</span>
                          <span>-{formatNaira(order.discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-baseline border-t border-gray-200 pt-2">
                        <span className="font-medium text-secondary">Total</span>
                        <span className="text-lg font-black text-secondary">{formatNaira(order.total)}</span>
                      </div>
                    </div>

                    {/* Payment & order IDs */}
                    <div className="bg-background rounded-lg p-2 text-[10px] text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Order ID: {order.id}</span>
                      {order.payment?.reference && <span>Payment: {order.payment.reference}</span>}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <Link
                        to={`/track-order`}
                        className="flex-1 text-center text-xs font-semibold text-secondary border border-gray-300 rounded py-2.5 hover:bg-background transition-colors"
                      >
                        Track Order
                      </Link>
                      <button
                        onClick={() => handleReorder(order)}
                        className="flex-1 text-xs font-bold text-white bg-primary rounded py-2.5 hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CartIcon className="w-3.5 h-3.5" />
                        Reorder
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
