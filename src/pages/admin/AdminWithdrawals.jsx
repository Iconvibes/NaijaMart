import { useState } from 'react'
import { api } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { formatNaira } from '../../data/catalog'

const statusBadge = (s) =>
  ({
    requested: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-accent/10 text-accent',
    paid: 'bg-primary/10 text-primary',
    rejected: 'bg-danger/10 text-danger',
  })[s] || 'bg-gray-100 text-gray-600'

export default function AdminWithdrawals() {
  const { data, loading, reload } = useAsync(() => api.adminWithdrawals())
  const withdrawals = data?.withdrawals || []
  const [actionError, setActionError] = useState('')
  const [success, setSuccess] = useState('')

  const handleApprove = async (id) => {
    setActionError('')
    setSuccess('')
    try {
      await api.approveWithdrawal(id)
      setSuccess('Withdrawal approved')
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleReject = async (id) => {
    setActionError('')
    setSuccess('')
    try {
      await api.rejectWithdrawal(id)
      setSuccess('Withdrawal rejected')
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleProcess = async (id) => {
    setActionError('')
    setSuccess('')
    try {
      await api.processWithdrawal(id)
      setSuccess('Withdrawal marked as paid')
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  if (loading) {
    return <div className="text-xs text-gray-500 py-10 text-center">Loading withdrawals...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-black text-secondary">Withdrawal Requests</h2>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {withdrawals.filter((w) => w.status === 'requested').length} pending
        </p>
      </div>

      {(actionError || success) && (
        <p
          className={`mx-4 mt-3 text-xs font-semibold rounded px-3 py-2 ${
            actionError
              ? 'bg-danger/10 border border-danger/30 text-danger'
              : 'bg-accent/10 border border-accent/30 text-accent'
          }`}
        >
          {actionError || success}
        </p>
      )}

      {withdrawals.length === 0 ? (
        <p className="text-xs text-gray-500 py-10 text-center">No withdrawal requests yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {withdrawals.map((w) => (
            <li key={w.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-secondary">{w.vendorName || 'Vendor'}</p>
                    <span className={`text-[9px] font-black uppercase rounded px-1.5 py-0.5 ${statusBadge(w.status)}`}>
                      {w.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {formatNaira(w.amount)} → {w.bankName} · {w.accountNumber} ({w.accountName})
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Requested {new Date(w.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {w.processedAt && ` · Processed ${new Date(w.processedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {w.status === 'requested' && (
                    <>
                      <button
                        onClick={() => handleApprove(w.id)}
                        className="text-[10px] font-bold text-white bg-accent rounded px-2.5 py-1.5 hover:bg-accent/90"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(w.id)}
                        className="text-[10px] font-bold text-danger border border-danger/30 rounded px-2.5 py-1.5 hover:bg-danger/5"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {w.status === 'approved' && (
                    <button
                      onClick={() => handleProcess(w.id)}
                      className="text-[10px] font-bold text-white bg-primary rounded px-2.5 py-1.5 hover:bg-primary/90"
                    >
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>
              {w.notes && <p className="text-[10px] text-gray-400 mt-1 italic">Note: {w.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
