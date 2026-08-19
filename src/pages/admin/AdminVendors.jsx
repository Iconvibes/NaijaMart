import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { CheckIcon, CloseIcon } from '../../components/Icons'

const statusBadge = (s) =>
  ({
    approved: 'bg-accent/10 text-accent',
    pending: 'bg-yellow-100 text-yellow-700',
    rejected: 'bg-danger/10 text-danger',
  })[s] || 'bg-gray-100 text-gray-500'

export default function AdminVendors() {
  const { data, loading, reload } = useAsync(() => api.users())
  const users = data?.users || []
  const vendors = users.filter((u) => u.role === 'vendor')
  const [filter, setFilter] = useState('all')
  const [actionError, setActionError] = useState('')

  const filtered = filter === 'all' ? vendors : vendors.filter((v) => v.vendorStatus === filter)
  const pendingCount = vendors.filter((v) => v.vendorStatus === 'pending').length

  const handleApprove = async (id) => {
    setActionError('')
    try {
      await api.approveVendor(id)
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleReject = async (id) => {
    setActionError('')
    try {
      await api.rejectVendor(id)
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  if (loading) {
    return <div className="text-xs text-gray-500 py-10 text-center">Loading vendors...</div>
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <p className="bg-danger/10 border border-danger/30 text-danger text-xs font-semibold rounded px-3 py-2">
          {actionError}
        </p>
      )}

      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-secondary">Vendor Management</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {vendors.length} total · {pendingCount} pending
            </p>
          </div>
          <div className="flex gap-1">
            {['all', 'pending', 'approved', 'rejected'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[10px] font-bold rounded px-2 py-1 ${
                  filter === f ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-xs text-gray-500 py-10 text-center">No vendors with this status.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map((v) => (
              <li key={v.id} className="px-4 py-3 flex items-center gap-3">
                {v.logo ? (
                  <img src={v.logo} alt="" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <span className="w-10 h-10 rounded-lg bg-secondary text-white font-black grid place-items-center text-sm">
                    {v.name.charAt(0)}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-secondary truncate">{v.name}</p>
                    <span className={`text-[9px] font-black uppercase rounded px-1.5 py-0.5 ${statusBadge(v.vendorStatus)}`}>
                      {v.vendorStatus}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">{v.email}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Joined {new Date(v.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {v.vendorStatus === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(v.id)}
                        className="flex items-center gap-1 text-[10px] font-bold text-white bg-accent rounded px-2.5 py-1.5 hover:bg-accent/90"
                      >
                        <CheckIcon className="w-3 h-3" /> Approve
                      </button>
                      <button
                        onClick={() => handleReject(v.id)}
                        className="flex items-center gap-1 text-[10px] font-bold text-danger border border-danger/30 rounded px-2.5 py-1.5 hover:bg-danger/5"
                      >
                        <CloseIcon className="w-3 h-3" /> Reject
                      </button>
                    </>
                  )}
                  {v.vendorStatus === 'approved' && (
                    <button
                      onClick={() => handleReject(v.id)}
                      className="text-[10px] font-bold text-danger border border-danger/30 rounded px-2.5 py-1.5 hover:bg-danger/5"
                    >
                      Suspend
                    </button>
                  )}
                  {v.vendorStatus === 'rejected' && (
                    <button
                      onClick={() => handleApprove(v.id)}
                      className="text-[10px] font-bold text-accent border border-accent/30 rounded px-2.5 py-1.5 hover:bg-accent/5"
                    >
                      Re-approve
                    </button>
                  )}
                  {v.slug && (
                    <Link
                      to={`/store/${v.slug}`}
                      target="_blank"
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      View Store
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
