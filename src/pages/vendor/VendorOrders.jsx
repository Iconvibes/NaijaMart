import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { formatNaira } from '../../data/catalog'
import { CheckIcon, CloseIcon, MapPinIcon, PhoneIcon, TruckIcon } from '../../components/Icons'

const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const statusBadge = (status) =>
  ({
    pending: 'bg-gray-100 text-gray-600',
    processing: 'bg-primary/10 text-primary',
    shipped: 'bg-accent/10 text-accent',
    delivered: 'bg-accent/10 text-accent',
    cancelled: 'bg-danger/10 text-danger',
  })[status] || 'bg-gray-100 text-gray-600'

const fulfillmentBadge = (f) =>
  ({
    pending: 'bg-gray-100 text-gray-500',
    sent: 'bg-primary/10 text-primary',
    received: 'bg-accent/10 text-accent',
  })[f] || 'bg-gray-100 text-gray-500'

const fulfillmentLabel = (f) =>
  ({ pending: 'Not dispatched', sent: 'Dispatched', received: 'Received at warehouse' })[f] || f

const shortId = (id) => (id.length > 10 ? `#${id.slice(-8).toUpperCase()}` : `#${id}`)

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

const unitCount = (items) => items.reduce((n, i) => n + i.qty, 0)

export default function VendorOrders() {
  const { data, loading, error: loadError, reload } = useAsync(useCallback(() => api.orders(), []))
  const orders = useMemo(() => data?.orders || [], [data])
  const warehouseAddress = data?.warehouseAddress || null
  const [statusFilter, setStatusFilter] = useState('all')
  // local errors from fulfilment actions; load errors come from the hook
  const [actionError, setActionError] = useState('')
  const [selected, setSelected] = useState(null)

  // lock page scroll while the details drawer is open
  useEffect(() => {
    document.body.style.overflow = selected ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [selected])

  const filtered = useMemo(
    () => (statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter)),
    [orders, statusFilter]
  )

  const countBy = (s) => (s === 'all' ? orders.length : orders.filter((o) => o.status === s).length)

  // Vendors dispatch their items to the warehouse (or to the buyer for
  // single-seller orders); order status itself is admin-owned.
  const handleFulfillment = async (id, fulfillment) => {
    setActionError('')
    try {
      const { order } = await api.updateOrderFulfillment(id, fulfillment)
      // keep the open drawer in sync instantly, then refetch the list
      setSelected((prev) => (prev && prev.id === order.id ? order : prev))
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const fulfillmentAction = (o) => {
    if (!o) return null
    const received = o.items.filter((i) => i.fulfillment === 'received').length
    if (received === o.items.length) return null // all arrived - nothing to do
    const pending = o.items.filter((i) => i.fulfillment === 'pending').length
    if (pending > 0) {
      return (
        <button
          onClick={() => handleFulfillment(o.id, 'sent')}
          className="w-full text-xs font-bold text-white bg-primary rounded py-2.5 hover:bg-primary/90 transition-colors"
        >
          Mark my items as sent
        </button>
      )
    }
    return (
      <button
        onClick={() => handleFulfillment(o.id, 'pending')}
        className="w-full text-xs font-semibold text-secondary border border-gray-300 rounded py-2.5 hover:bg-background transition-colors"
      >
        Undo — items are still with me
      </button>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-black text-secondary">Orders</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">{orders.length} order{orders.length === 1 ? '' : 's'} containing your products</p>
        </div>

        {(loadError || actionError) && (
          <p className="m-4 bg-danger/10 border border-danger/30 text-danger text-xs font-semibold rounded px-3 py-2">
            {loadError?.message || actionError}
          </p>
        )}

        {/* status filter tabs */}
        <div className="px-4 pt-3 flex gap-1.5 overflow-x-auto no-scrollbar border-b border-gray-100">
          {[{ value: 'all', label: 'All' }, ...STATUSES].map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`shrink-0 text-[11px] font-bold rounded-t px-3 py-2 border-b-2 ${
                statusFilter === s.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-secondary'
              }`}
            >
              {s.label}
              <span className="ml-1 text-gray-400 font-medium">({countBy(s.value)})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-xs text-gray-500 py-10 text-center">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-gray-500 py-10 text-center">
            {orders.length === 0 ? 'No orders yet - they will appear here after customers check out.' : 'No orders with this status.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-wide text-gray-500">
                  <th className="text-left px-4 py-2.5">Order</th>
                  <th className="text-left px-3 py-2.5">Date</th>
                  <th className="text-left px-3 py-2.5 hidden md:table-cell">Customer</th>
                  <th className="text-center px-3 py-2.5">Items</th>
                  <th className="text-right px-3 py-2.5">Your total</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setSelected(o)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelected(o)
                      }
                    }}
                    className="align-top hover:bg-background/60 cursor-pointer outline-none focus-visible:bg-background/80"
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-bold text-secondary">{shortId(o.id)}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelected(o)
                        }}
                        className="text-[10px] text-primary font-bold hover:underline mt-0.5"
                      >
                        View details ›
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{formatDate(o.createdAt)}</td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <p className="font-medium text-secondary">{o.customerName}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{o.customerPhone}</p>
                      {!o.multiSeller && o.customerAddress && (
                        <p className="text-[10px] text-gray-400 mt-0.5 max-w-[220px] leading-snug">{o.customerAddress}</p>
                      )}
                      {o.multiSeller && (
                        <p className="text-[10px] text-primary font-semibold mt-0.5">Part of a {o.sellerCount}-seller order</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-center -space-x-2">
                        {o.items.slice(0, 3).map((i) => (
                          <img
                            key={i.productId}
                            src={i.image}
                            alt=""
                            title={i.name}
                            className="w-7 h-7 object-cover rounded-full border-2 border-white bg-background"
                          />
                        ))}
                        {o.items.length > 3 && (
                          <span className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 text-[9px] font-bold text-gray-500 grid place-items-center">
                            +{o.items.length - 3}
                          </span>
                        )}
                      </div>
                      <p className="text-center text-[10px] text-gray-400 mt-1 line-clamp-1 max-w-[140px] mx-auto" title={o.items.map((i) => `${i.name} × ${i.qty}`).join('\n')}>
                        {o.items[0]?.name}
                        {o.items.length > 1 ? ` +${o.items.length - 1} more` : ''}
                      </p>
                      <p className="text-center text-[10px] text-gray-400 mt-0.5">
                        {unitCount(o.items)} unit{unitCount(o.items) === 1 ? '' : 's'}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-secondary">{formatNaira(o.subtotal)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block text-[10px] font-black uppercase tracking-wide rounded px-2 py-1 ${statusBadge(o.status)}`}>
                        {o.status}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {o.items.every((i) => i.fulfillment === 'received')
                          ? 'Received at warehouse'
                          : o.items.some((i) => i.fulfillment === 'sent')
                            ? 'Dispatched'
                            : 'Awaiting dispatch'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---- order details drawer ---- */}
      {selected && (
        <div className="fixed inset-0 z-[60]" aria-hidden={!selected}>
          {/* overlay */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />

          {/* panel */}
          <aside
            role="dialog"
            aria-label={`Order ${shortId(selected.id)} details`}
            className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
          >
            {/* header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div>
                <h2 className="text-base font-black text-secondary">Order {shortId(selected.id)}</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">{formatDate(selected.createdAt)}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 text-secondary hover:bg-background rounded"
                aria-label="Close order details"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* status */}
              <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
                <span className={`inline-block text-[10px] font-black uppercase tracking-wide rounded px-2 py-1 ${statusBadge(selected.status)}`}>
                  {selected.status}
                </span>
                {selected.multiSeller && (
                  <span className="text-[10px] font-bold text-primary bg-primary/10 rounded px-2 py-1">
                    Part of a {selected.sellerCount}-seller order
                  </span>
                )}
              </div>

              {/* ship to */}
              <section className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-xs font-black text-secondary uppercase tracking-wide mb-1.5">
                  {selected.multiSeller ? 'Send your items to' : 'Ship directly to the buyer'}
                </h3>
                <div className="bg-background rounded-lg p-3 flex gap-2.5">
                  <MapPinIcon className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-secondary leading-relaxed">
                      {selected.multiSeller ? warehouseAddress : selected.customerAddress}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                      {selected.multiSeller
                        ? 'Your items are consolidated with the other sellers\u2019 at the NaijaMart warehouse, then delivered to the buyer as one package.'
                        : 'You are the only seller on this order, so there is no warehouse leg \u2014 send it straight to the buyer.'}
                    </p>
                  </div>
                </div>
              </section>

              {/* customer */}
              <section className="px-4 py-3 border-b border-gray-100 space-y-1.5">
                <h3 className="text-xs font-black text-secondary uppercase tracking-wide mb-1.5">Customer</h3>
                <p className="text-sm font-bold text-secondary">{selected.customerName}</p>
                <a
                  href={`tel:${String(selected.customerPhone).replace(/[^0-9+]/g, '')}`}
                  className="text-xs text-primary font-semibold flex items-center gap-1.5 w-fit"
                >
                  <PhoneIcon className="w-3.5 h-3.5" />
                  {selected.customerPhone}
                </a>
              </section>

              {/* items */}
              <section className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-xs font-black text-secondary uppercase tracking-wide mb-2">
                  Your items ({unitCount(selected.items)} unit{unitCount(selected.items) === 1 ? '' : 's'})
                </h3>
                <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
                  {selected.items.map((i) => (
                    <li key={i.productId} className="flex gap-3 p-3">
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

                {/* dispatch action */}
                <div className="mt-3">
                  {selected.items.every((i) => i.fulfillment === 'received') ? (
                    <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-accent bg-accent/10 rounded py-2.5">
                      <CheckIcon className="w-4 h-4" /> All your items received at the warehouse
                    </p>
                  ) : (
                    fulfillmentAction(selected)
                  )}
                </div>
              </section>

              {/* subtotal */}
              <section className="px-4 py-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-medium text-secondary">Your items total</span>
                  <span className="text-lg font-black text-secondary">{formatNaira(selected.subtotal)}</span>
                </div>
                <p className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-1.5">
                  <TruckIcon className="w-3.5 h-3.5 text-accent" />
                  {selected.multiSeller
                    ? 'This is your share of the order; the buyer is billed the full total separately.'
                    : 'This is the full order total.'}
                </p>
              </section>
            </div>

            {/* footer */}
            <div className="border-t border-gray-200 p-4">
              <button
                onClick={() => setSelected(null)}
                className="w-full text-xs font-semibold text-secondary border border-gray-300 rounded py-2.5 hover:bg-background transition-colors"
              >
                Close
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
