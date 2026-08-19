import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAsync } from '../hooks/useAsync'

const typeIcons = {
  new_order: '🛒',
  order_status: '📦',
  payout_approved: '💰',
  payout_rejected: '❌',
  vendor_approved: '✅',
  vendor_rejected: '❌',
  new_review: '⭐',
  withdrawal_approved: '💸',
  withdrawal_rejected: '❌',
  product_approved: '✅',
  product_rejected: '❌',
  coupon_used: '🎟️',
}

export default function NotificationsPage() {
  const { data, loading, reload } = useAsync(useCallback(() => api.notifications(), []))
  const notifications = data?.notifications || []
  const [marking, setMarking] = useState(false)

  const handleMarkRead = async () => {
    setMarking(true)
    try {
      await api.markNotificationsRead()
      reload()
    } catch {
      // silently fail
    } finally {
      setMarking(false)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  if (loading) {
    return <div className="min-h-[50vh] grid place-items-center text-sm text-gray-500">Loading...</div>
  }

  return (
    <div className="max-w-3xl mx-auto px-4 mt-4 mb-10">
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-black text-secondary">Notifications</h1>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkRead}
              disabled={marking}
              className="text-[11px] font-bold text-primary hover:underline disabled:opacity-50"
            >
              {marking ? 'Marking...' : 'Mark all read'}
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-500">No notifications yet</p>
            <p className="text-xs text-gray-400 mt-1">You'll be notified about orders, payouts, and more.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notifications.map((n) => (
              <li key={n.id}>
                {n.link ? (
                  <Link
                    to={n.link}
                    className={`block px-4 py-3 hover:bg-background/60 transition-colors ${
                      !n.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <NotificationContent notification={n} />
                  </Link>
                ) : (
                  <div className={`px-4 py-3 ${!n.read ? 'bg-primary/5' : ''}`}>
                    <NotificationContent notification={n} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function NotificationContent({ notification: n }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-lg shrink-0 mt-0.5">{typeIcons[n.type] || '🔔'}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-relaxed ${!n.read ? 'font-bold text-secondary' : 'text-gray-600'}`}>
          {n.message}
        </p>
        <p className="text-[10px] text-gray-400 mt-1">
          {new Date(n.createdAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
      {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
    </div>
  )
}
