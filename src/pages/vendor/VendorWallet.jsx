import { useState } from 'react'
import { api } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { formatNaira } from '../../data/catalog'

export default function VendorWallet() {
  const { data, loading, reload } = useAsync(() => api.vendorWallet())
  const balance = data?.balance ?? 0
  const pending = data?.pendingWithdrawal
  const totalPaidOut = data?.totalPaidOut ?? 0

  const [form, setForm] = useState({ bankName: '', accountNumber: '', accountName: '', amount: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleRequest = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await api.requestWithdrawal({
        amount: Number(form.amount),
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        accountName: form.accountName,
      })
      setSuccess('Withdrawal request submitted!')
      setForm({ bankName: '', accountNumber: '', accountName: '', amount: '' })
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full border border-gray-300 rounded text-xs px-3 py-2.5 outline-none focus:border-primary bg-white'

  if (loading) {
    return <div className="text-xs text-gray-500 py-10 text-center">Loading wallet...</div>
  }

  return (
    <div className="space-y-4">
      {/* Balance card */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-black text-secondary">Wallet</h2>
        </div>
        <div className="p-4 grid sm:grid-cols-3 gap-4">
          <div className="bg-background rounded-lg p-4 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Available Balance</p>
            <p className="text-xl font-black text-secondary mt-1">{formatNaira(balance)}</p>
          </div>
          <div className="bg-background rounded-lg p-4 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Pending Withdrawal</p>
            <p className="text-xl font-black text-yellow-600 mt-1">
              {pending ? formatNaira(pending.amount) : '—'}
            </p>
          </div>
          <div className="bg-background rounded-lg p-4 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Total Paid Out</p>
            <p className="text-xl font-black text-accent mt-1">{formatNaira(totalPaidOut)}</p>
          </div>
        </div>
      </div>

      {/* Withdrawal request form */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-black text-secondary">Request Withdrawal</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Minimum ₦1,000 · Funds are released after the 7-day return window
          </p>
        </div>

        {pending ? (
          <div className="p-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700">
              You already have a withdrawal request of <strong>{formatNaira(pending.amount)}</strong> pending admin approval.
            </div>
          </div>
        ) : balance < 1000 ? (
          <div className="p-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-500">
              Your available balance ({formatNaira(balance)}) is below the minimum withdrawal of ₦1,000.
              Keep selling — payouts unlock 7 days after orders are delivered.
            </div>
          </div>
        ) : (
          <form onSubmit={handleRequest} className="p-4 space-y-3 max-w-md">
            {error && (
              <p className="bg-danger/10 border border-danger/30 text-danger text-xs font-semibold rounded px-3 py-2">{error}</p>
            )}
            {success && (
              <p className="bg-accent/10 border border-accent/30 text-accent text-xs font-semibold rounded px-3 py-2">{success}</p>
            )}

            <label className="block">
              <span className="text-xs font-bold text-secondary mb-1 block">Amount (₦)</span>
              <input
                required
                type="number"
                min={1000}
                max={balance}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="e.g. 5000"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-secondary mb-1 block">Bank Name</span>
              <input
                required
                value={form.bankName}
                onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                placeholder="e.g. GTBank"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-secondary mb-1 block">Account Number</span>
              <input
                required
                value={form.accountNumber}
                onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                placeholder="e.g. 0123456789"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-secondary mb-1 block">Account Name</span>
              <input
                required
                value={form.accountName}
                onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
                placeholder="e.g. Chioma Okafor"
                className={inputCls}
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-white text-xs font-black rounded py-2.5 hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Request Withdrawal'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
