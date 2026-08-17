import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAsync } from '../hooks/useAsync'
import { formatNaira } from '../data/catalog'
import { CheckIcon, ChevronDownIcon, MapPinIcon, PhoneIcon, TrashIcon, TruckIcon } from '../components/Icons'

const paymentBadge = (status) =>
  ({ pending: 'bg-gray-100 text-gray-500', captured: 'bg-accent/10 text-accent', refunded: 'bg-danger/10 text-danger' })[status] ||
  'bg-gray-100 text-gray-500'

const ledgerBadge = (type) =>
  ({
    capture: 'bg-accent/10 text-accent',
    commission: 'bg-gray-100 text-gray-500',
    payout: 'bg-primary/10 text-primary',
  })[type] || 'bg-gray-100 text-gray-500'

const statusBadge = (status) =>
  ({
    pending: 'bg-gray-100 text-gray-600',
    processing: 'bg-primary/10 text-primary',
    shipped: 'bg-accent/10 text-accent',
    delivered: 'bg-accent/10 text-accent',
    cancelled: 'bg-danger/10 text-danger',
  })[status] || 'bg-gray-100 text-gray-600'

const shortId = (id) => (id.length > 10 ? `#${id.slice(-8).toUpperCase()}` : `#${id}`)

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

export default function AdminDashboard() {
  const { data, loading, error, reload } = useAsync(
    useCallback(() => Promise.all([api.users(), api.products(), api.orders(), api.ledger(), api.ledgerPayables()]), [])
  )
  const users = data?.[0]?.users || []
  const products = data?.[1] || []
  const orders = data?.[2]?.orders || []
  const ledgerEntries = data?.[3]?.entries || []
  const payables = data?.[4]?.payables || []
  // Built from `data` (stable between fetches), not `users` - `data?.[0] || []`
  // would recreate the array every render and defeat the memo.
  const vendorName = useMemo(() => {
    const map = {}
    for (const u of data?.[0]?.users || []) map[u.id] = u.name
    return map
  }, [data])
  // local errors from deletes/order actions; load errors come from the hook
  const [deleteError, setDeleteError] = useState('')
  const [actionError, setActionError] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [payoutNote, setPayoutNote] = useState('')

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete product "${name}"? This cannot be undone.`)) return
    setDeleteError('')
    try {
      await api.deleteProduct(id)
      reload()
    } catch (err) {
      setDeleteError(err.message)
    }
  }

  const handleStatus = async (id, status) => {
    setActionError('')
    try {
      await api.updateOrderStatus(id, status)
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const markReceived = async (orderId, vid) => {
    setActionError('')
    try {
      await api.updateOrderFulfillment(orderId, 'received', vid)
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleCapture = async (id) => {
    setActionError('')
    try {
      await api.capturePayment(id)
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleRunPayouts = async () => {
    setActionError('')
    try {
      const { paid } = await api.runPayouts()
      setPayoutNote(paid.length ? `${paid.length} seller${paid.length === 1 ? '' : 's'} paid out.` : 'Nothing was payable yet.')
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleRefund = async (orderId, item) => {
    const amount = item.price * item.qty
    if (!window.confirm(`Refund ${formatNaira(amount)} for "${item.name}"?\nThe seller's share is reversed from escrow or clawed back automatically.`)) return
    setActionError('')
    try {
      const { refundedAmount } = await api.refundOrder(orderId, [item.productId])
      setPayoutNote(`Refunded ${formatNaira(refundedAmount)}.`)
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const roleBadge = (role) =>
    role === 'admin'
      ? 'bg-danger text-white'
      : role === 'vendor'
        ? 'bg-primary text-white'
        : 'bg-gray-200 text-secondary'

  if (loading) {
    return <div className="min-h-[50vh] grid place-items-center text-sm text-gray-500">Loading...</div>
  }

  const groupItemsByVendor = (order) => {
    const byVendor = {}
    for (const i of order.items) {
      ;(byVendor[i.vendorId] ||= []).push(i)
    }
    return Object.entries(byVendor)
  }

  const groupState = (items) => {
    if (items.every((i) => i.fulfillment === 'received')) return 'received'
    if (items.every((i) => i.fulfillment === 'sent')) return 'sent'
    return 'pending'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 mt-4 mb-10">
      <div className="bg-white rounded-lg shadow-card p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-base md:text-lg font-black text-secondary">Admin Dashboard</h1>
          <p className="text-xs text-gray-500">{users.length} sellers · {products.length} products · {orders.length} orders</p>
        </div>
        <Link to="/" className="text-xs font-semibold text-primary hover:underline">View storefront</Link>
      </div>

      {(error || deleteError || actionError) && (
        <p className="mt-4 bg-danger/10 border border-danger/30 text-danger text-xs font-semibold rounded px-3 py-2">
          {error?.message || deleteError || actionError}
        </p>
      )}

      {/* ---- order collation ---- */}
      <div className="mt-4 bg-white rounded-lg shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-black text-secondary uppercase tracking-wide">Order fulfilment</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Collate sellers' items at the warehouse, then ship each order to the buyer as one package.
          </p>
        </div>

        {orders.length === 0 ? (
          <p className="text-xs text-gray-500 py-10 text-center">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {orders.map((o) => {
              const received = o.items.filter((i) => i.fulfillment === 'received').length
              const allReceived = received === o.items.length
              const open = expanded === o.id
              return (
                <li key={o.id}>
                  {/* row */}
                  <button
                    onClick={() => setExpanded(open ? null : o.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-background/60 text-left"
                  >
                    <span className={`w-6 h-6 rounded-full grid place-items-center shrink-0 ${allReceived ? 'bg-accent/15 text-accent' : 'bg-gray-100 text-gray-400'}`}>
                      {allReceived ? <CheckIcon className="w-3.5 h-3.5" /> : <TruckIcon className="w-3.5 h-3.5" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-secondary">
                        {shortId(o.id)}
                        <span className="font-medium text-gray-400 ml-2">{formatDate(o.createdAt)}</span>
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                        {o.customerName} · {o.customerPhone} · {o.items.length} item{o.items.length === 1 ? '' : 's'} from {new Set(o.items.map((i) => i.vendorId)).size} seller{new Set(o.items.map((i) => i.vendorId)).size === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-block text-[9px] font-black uppercase tracking-wide rounded px-2 py-1 ${statusBadge(o.status)}`}>{o.status}</span>
                      <p className="text-[10px] text-gray-400 mt-1">{received} of {o.items.length} items received</p>
                    </div>
                    <ChevronDownIcon className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>

                  {/* expanded detail */}
                  {open && (
                    <div className="px-4 pb-4 border-t border-gray-100 bg-background/40">
                      {/* buyer - the admin ships to the buyer */}
                      <div className="pt-3 pb-3 flex flex-wrap gap-x-6 gap-y-1 items-center">
                        <p className="text-xs font-bold text-secondary">{o.customerName}</p>
                        <a href={`tel:${String(o.customerPhone).replace(/[^0-9+]/g, '')}`} className="text-xs text-primary font-semibold flex items-center gap-1">
                          <PhoneIcon className="w-3.5 h-3.5" /> {o.customerPhone}
                        </a>
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                          <MapPinIcon className="w-3.5 h-3.5 text-accent" /> {o.customerAddress}
                        </p>
                        <span className="text-xs font-bold text-secondary ml-auto">Total: {formatNaira(o.total)}</span>
                      </div>

                      {/* per-seller groups */}
                      <div className="space-y-2">
                        {groupItemsByVendor(o).map(([vid, items]) => {
                          const state = groupState(items)
                          return (
                            <div key={vid} className="bg-white rounded-lg border border-gray-200 p-3">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <p className="text-xs font-black text-secondary">{vendorName[vid] || 'Vendor'}</p>
                                {state === 'received' ? (
                                  <span className="text-[10px] font-black text-accent bg-accent/10 rounded px-2 py-1 flex items-center gap-1">
                                    <CheckIcon className="w-3 h-3" /> Received
                                  </span>
                                ) : state === 'sent' ? (
                                  <button
                                    onClick={() => markReceived(o.id, vid)}
                                    className="text-[10px] font-bold text-white bg-primary rounded px-2 py-1.5 hover:bg-primary/90"
                                  >
                                    Mark received
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 rounded px-2 py-1">
                                    Awaiting dispatch from seller
                                  </span>
                                )}
                              </div>
                              <ul className="mt-2 divide-y divide-gray-50">
                                {items.map((i) => (
                                  <li key={i.productId} className="py-1.5 flex items-center gap-2">
                                    <img src={i.image} alt="" className="w-8 h-8 object-cover rounded bg-background border border-gray-100" />
                                    <p className="text-[11px] text-secondary leading-snug line-clamp-1 flex-1 min-w-0">{i.name}</p>
                                    <p className="text-[10px] text-gray-500 shrink-0">{formatNaira(i.price)} × {i.qty}</p>
                                    <p className="text-[11px] font-bold text-secondary shrink-0 w-16 text-right">{formatNaira(i.price * i.qty)}</p>
                                    {i.refunded ? (
                                      <span className="text-[9px] font-black uppercase text-danger bg-danger/10 rounded px-1.5 py-0.5 shrink-0">
                                        Refunded
                                      </span>
                                    ) : o.payment?.status === 'captured' ? (
                                      <button
                                        onClick={() => handleRefund(o.id, i)}
                                        className="text-[10px] font-bold text-danger hover:underline shrink-0"
                                      >
                                        Refund
                                      </button>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        })}
                      </div>

                      {/* order actions */}
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        {o.status === 'pending' && (
                          <button
                            onClick={() => handleStatus(o.id, 'processing')}
                            className="text-[11px] font-bold text-secondary border border-gray-300 rounded px-3 py-2 hover:bg-background"
                          >
                            Start processing
                          </button>
                        )}
                        <button
                          onClick={() => handleStatus(o.id, 'shipped')}
                          disabled={!allReceived || !['pending', 'processing'].includes(o.status)}
                          title={allReceived ? '' : 'Wait until every seller\u2019s items are received at the warehouse'}
                          className={`text-[11px] font-bold rounded px-3 py-2 transition-colors ${
                            allReceived && ['pending', 'processing'].includes(o.status)
                              ? 'text-white bg-accent hover:bg-accent/90'
                              : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1"><TruckIcon className="w-3.5 h-3.5" /> Ship to buyer</span>
                        </button>
                        <button
                          onClick={() => handleStatus(o.id, 'cancelled')}
                          className="text-[11px] font-bold text-danger border border-danger/30 rounded px-3 py-2 hover:bg-danger/5"
                        >
                          Cancel order
                        </button>
                        {!allReceived && (
                          <span className="text-[10px] text-gray-400">{received} of {o.items.length} items at the warehouse before this can ship</span>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* ---- payments & payouts ---- */}
      <div className="mt-4 bg-white rounded-lg shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-black text-secondary uppercase tracking-wide">Payments &amp; Payouts</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Buyer money sits in escrow until delivery + the 7-day return window; commission is {Math.round(0.1 * 100)}% of each seller's share.
          </p>
        </div>

        <div className="p-4 grid lg:grid-cols-3 gap-4">
          {/* order payments */}
          <div className="self-start">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-wide mb-2">Order payments</h3>
            <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center gap-2 px-3 py-2">
                  <p className="text-[11px] font-bold text-secondary">{shortId(o.id)}</p>
                  <span className="text-[10px] text-gray-400 uppercase">{o.payment?.method || 'cod'}</span>
                  <span className={`ml-auto text-[9px] font-black uppercase rounded px-1.5 py-0.5 ${paymentBadge(o.payment?.status)}`}>
                    {o.payment?.status || 'pending'}
                  </span>
                  {o.payment?.status === 'pending' && (
                    <button
                      onClick={() => handleCapture(o.id)}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      Mark captured
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* payables */}
          <div className="self-start">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-wide mb-2">Payable now</h3>
            {payables.length === 0 ? (
              <p className="text-[11px] text-gray-500 border border-dashed border-gray-200 rounded-lg p-3">
                Nothing payable yet — payouts unlock 7 days after an order is delivered.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg mb-2">
                {payables.map((p) => (
                  <li key={`${p.orderId}:${p.vendorId}`} className="flex items-center gap-2 px-3 py-2">
                    <p className="text-[11px] font-bold text-secondary">{shortId(p.orderId)}</p>
                    <p className="text-[10px] text-gray-500 truncate flex-1">{vendorName[p.vendorId] || 'Vendor'}</p>
                    <p className="text-[11px] font-bold text-secondary">{formatNaira(p.amount)}</p>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={handleRunPayouts}
              disabled={payables.length === 0}
              className="w-full text-[11px] font-bold text-white bg-accent rounded py-2 hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Run payouts ({payables.length})
            </button>
            {payoutNote && <p className="text-[10px] text-accent font-semibold mt-1.5">{payoutNote}</p>}
          </div>

          {/* ledger trail */}
          <div className="self-start">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-wide mb-2">Ledger (recent)</h3>
            {ledgerEntries.length === 0 ? (
              <p className="text-[11px] text-gray-500 border border-dashed border-gray-200 rounded-lg p-3">
                No money has moved yet — captures and payouts appear here.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg max-h-[220px] overflow-y-auto">
                {ledgerEntries.slice(0, 20).map((e) => (
                  <li key={e.id} className="px-3 py-2">
                    <p className="flex items-center gap-1.5">
                      <span className={`text-[8px] font-black uppercase tracking-wide rounded px-1 py-0.5 ${ledgerBadge(e.type)}`}>{e.type}</span>
                      <span className="text-[10px] text-gray-500 font-medium">{e.from} → {e.to}</span>
                    </p>
                    <p className="text-[11px] font-bold text-secondary mt-0.5">
                      {formatNaira(e.amount)} <span className="text-[10px] font-medium text-gray-400">· {shortId(e.orderId)}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid lg:grid-cols-2 gap-4">
        {/* accounts */}
        <div className="bg-white rounded-lg shadow-card p-4 self-start">
          <h2 className="text-sm font-black text-secondary uppercase tracking-wide mb-3">Platform accounts</h2>
          <ul className="divide-y divide-gray-100">
            {users.map((u) => (
              <li key={u.id} className="py-3 flex items-center gap-3">
                {u.logo ? (
                  <img src={u.logo} alt={u.name} className="w-10 h-10 rounded-lg" />
                ) : (
                  <span className="w-10 h-10 rounded-lg bg-secondary text-white font-black grid place-items-center">
                    {u.name.charAt(0)}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-secondary truncate">{u.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{u.email}</p>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-wide rounded px-2 py-0.5 ${roleBadge(u.role)}`}>
                  {u.role}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* all products */}
        <div className="bg-white rounded-lg shadow-card p-4 self-start">
          <h2 className="text-sm font-black text-secondary uppercase tracking-wide mb-3">All products</h2>
          {products.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">No products in the marketplace.</p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
              {products.map((p) => (
                <li key={p.id} className="py-3 flex gap-3">
                  <img src={p.image} alt="" className="w-14 h-14 object-cover rounded border border-gray-100 bg-background" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-secondary leading-snug line-clamp-2">{p.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{p.vendor} · {formatNaira(p.price)}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="self-start p-1.5 text-gray-400 hover:text-danger"
                    aria-label={`Delete ${p.name}`}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
