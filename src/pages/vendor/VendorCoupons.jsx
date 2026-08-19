import { useState } from 'react'
import { api } from '../../api'
import { useAsync } from '../../hooks/useAsync'

export default function VendorCoupons() {
  const { data, loading, reload } = useAsync(() => api.vendorCoupons())
  const coupons = data?.coupons || []

  const [form, setForm] = useState({
    code: '',
    discountType: 'percent',
    discountValue: '',
    minOrder: '',
    maxUses: '',
    expiresAt: '',
  })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setCreating(true)
    try {
      await api.createCoupon({
        code: form.code.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrder: form.minOrder ? Number(form.minOrder) : 0,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt || null,
      })
      setSuccess('Coupon created!')
      setForm({ code: '', discountType: 'percent', discountValue: '', minOrder: '', maxUses: '', expiresAt: '' })
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (id) => {
    try {
      await api.toggleCoupon(id)
      reload()
    } catch {
      // silently fail
    }
  }

  const inputCls = 'w-full border border-gray-300 rounded text-xs px-3 py-2.5 outline-none focus:border-primary bg-white'

  if (loading) {
    return <div className="text-xs text-gray-500 py-10 text-center">Loading coupons...</div>
  }

  return (
    <div className="space-y-4">
      {/* Create coupon */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-black text-secondary">Create Coupon</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">Create discount codes for your products</p>
        </div>

        <form onSubmit={handleCreate} className="p-4 space-y-3 max-w-lg">
          {error && (
            <p className="bg-danger/10 border border-danger/30 text-danger text-xs font-semibold rounded px-3 py-2">{error}</p>
          )}
          {success && (
            <p className="bg-accent/10 border border-accent/30 text-accent text-xs font-semibold rounded px-3 py-2">{success}</p>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold text-secondary mb-1 block">Coupon Code *</span>
              <input
                required
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. SALE10"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-secondary mb-1 block">Discount *</span>
              <div className="flex gap-2">
                <select
                  value={form.discountType}
                  onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value }))}
                  className="w-24 border border-gray-300 rounded text-xs px-2 py-2.5 outline-none focus:border-primary bg-white"
                >
                  <option value="percent">%</option>
                  <option value="fixed">₦</option>
                </select>
                <input
                  required
                  type="number"
                  min="1"
                  value={form.discountValue}
                  onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                  placeholder={form.discountType === 'percent' ? '10' : '500'}
                  className="flex-1 border border-gray-300 rounded text-xs px-3 py-2.5 outline-none focus:border-primary bg-white"
                />
              </div>
            </label>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs font-bold text-secondary mb-1 block">Min Order (₦)</span>
              <input
                type="number"
                min="0"
                value={form.minOrder}
                onChange={(e) => setForm((f) => ({ ...f, minOrder: e.target.value }))}
                placeholder="0"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-secondary mb-1 block">Max Uses</span>
              <input
                type="number"
                min="1"
                value={form.maxUses}
                onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                placeholder="Unlimited"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-secondary mb-1 block">Expires</span>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className={inputCls}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="bg-primary text-white text-xs font-black rounded px-5 py-2.5 hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {creating ? 'Creating...' : 'Create Coupon'}
          </button>
        </form>
      </div>

      {/* Existing coupons */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-black text-secondary">Your Coupons ({coupons.length})</h2>
        </div>

        {coupons.length === 0 ? (
          <p className="text-xs text-gray-500 py-10 text-center">No coupons yet. Create one above!</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {coupons.map((c) => (
              <li key={c.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-secondary">{c.code}</span>
                    <span className={`text-[9px] font-black uppercase rounded px-1.5 py-0.5 ${
                      c.active ? 'bg-accent/10 text-accent' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {c.discountType === 'percent' ? `${c.discountValue}% off` : `₦${c.discountValue.toLocaleString()} off`}
                    {c.minOrder > 0 && ` · Min order ₦${c.minOrder.toLocaleString()}`}
                    {c.maxUses && ` · ${c.usedCount}/${c.maxUses} used`}
                    {c.expiresAt && ` · Expires ${new Date(c.expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}
                  </p>
                </div>
                <button
                  onClick={() => handleToggle(c.id)}
                  className={`text-[10px] font-bold px-2 py-1 rounded ${
                    c.active
                      ? 'text-danger border border-danger/30 hover:bg-danger/5'
                      : 'text-accent border border-accent/30 hover:bg-accent/5'
                  }`}
                >
                  {c.active ? 'Disable' : 'Enable'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
