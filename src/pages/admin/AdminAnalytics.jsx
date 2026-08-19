import { useCallback, useState } from 'react'
import { api } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { formatNaira } from '../../data/catalog'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#16a34a', '#ea580c', '#2563eb', '#dc2626', '#6b7280']

export default function AdminAnalytics() {
  const [days, setDays] = useState(30)
  const { data, loading } = useAsync(useCallback(() => api.adminAnalytics(days), [days]))
  const analytics = data || {}

  const pieData = analytics.statusCounts
    ? Object.entries(analytics.statusCounts)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({ name: status, value: count }))
    : []

  if (loading) {
    return <div className="text-xs text-gray-500 py-10 text-center">Loading analytics...</div>
  }

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-black text-secondary">Platform Analytics</h2>
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

        <div className="p-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'GMV', value: formatNaira(analytics.gmv || 0), color: 'text-secondary' },
            { label: 'Commission', value: formatNaira(analytics.totalCommission || 0), color: 'text-accent' },
            { label: 'Orders', value: analytics.totalOrders || 0, color: 'text-secondary' },
            { label: 'Vendors', value: analytics.totalVendors || 0, color: 'text-primary' },
            { label: 'Customers', value: analytics.totalCustomers || 0, color: 'text-secondary' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-background rounded-lg p-3 text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">{kpi.label}</p>
              <p className={`text-lg font-black mt-1 ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* GMV chart */}
        {analytics.gmvData?.length > 0 && (
          <div className="bg-white rounded-lg shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-xs font-black text-secondary uppercase tracking-wide">GMV Over Time</h3>
            </div>
            <div className="p-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.gmvData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v) => [formatNaira(v), 'GMV']}
                    labelFormatter={(d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  />
                  <Line type="monotone" dataKey="gmv" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Orders by status pie */}
        {pieData.length > 0 && (
          <div className="bg-white rounded-lg shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-xs font-black text-secondary uppercase tracking-wide">Orders by Status</h3>
            </div>
            <div className="p-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} orders`, 'Count']} />
                  <Legend
                    formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
                    iconSize={10}
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Top vendors */}
      {analytics.topVendors?.length > 0 && (
        <div className="bg-white rounded-lg shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-xs font-black text-secondary uppercase tracking-wide">Top Vendors by Revenue</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {analytics.topVendors.map((v, i) => (
              <li key={v.vendorId} className="px-4 py-2.5 flex items-center gap-3">
                <span className="text-[10px] font-black text-gray-400 w-4">#{i + 1}</span>
                <p className="text-xs font-bold text-secondary flex-1">{v.vendorId.slice(-6).toUpperCase()}</p>
                <p className="text-xs font-bold text-secondary">{formatNaira(v.revenue)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
