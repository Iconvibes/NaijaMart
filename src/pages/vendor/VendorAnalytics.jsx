import { useCallback, useState } from 'react'
import { api } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { formatNaira } from '../../data/catalog'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function VendorAnalytics() {
  const [days, setDays] = useState(30)
  const { data, loading } = useAsync(useCallback(() => api.vendorAnalytics(days), [days]))
  const analytics = data || { totalRevenue: 0, totalOrders: 0, topProducts: [], revenueData: [] }

  if (loading) {
    return <div className="text-xs text-gray-500 py-10 text-center">Loading analytics...</div>
  }

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-black text-secondary">Analytics</h2>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-[11px] font-bold text-secondary border border-gray-300 rounded px-2 py-1 outline-none"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        <div className="p-4 grid sm:grid-cols-2 gap-4">
          <div className="bg-background rounded-lg p-4 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Revenue</p>
            <p className="text-xl font-black text-secondary mt-1">{formatNaira(analytics.totalRevenue)}</p>
          </div>
          <div className="bg-background rounded-lg p-4 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Orders</p>
            <p className="text-xl font-black text-secondary mt-1">{analytics.totalOrders}</p>
          </div>
        </div>
      </div>

      {/* Revenue chart */}
      {analytics.revenueData.length > 0 && (
        <div className="bg-white rounded-lg shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-xs font-black text-secondary uppercase tracking-wide">Revenue Over Time</h3>
          </div>
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v) => [formatNaira(v), 'Revenue']}
                  labelFormatter={(d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                />
                <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top products */}
      {analytics.topProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-xs font-black text-secondary uppercase tracking-wide">Top Products</h3>
          </div>
          <div className="p-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip formatter={(v) => [`${v} units`, 'Sold']} />
                <Bar dataKey="count" fill="#ea580c" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
