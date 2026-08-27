import { useCallback, useState } from 'react'
import { api } from '../api'
import { useAsync } from '../hooks/useAsync'
import { formatNaira } from '../data/catalog'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = ['#16a34a', '#ea580c', '#2563eb', '#dc2626', '#6b7280', '#8b5cf6']

function MiniStat({ label, value, sub, color = 'text-secondary', trend }) {
  return (
    <div className="bg-background rounded-lg p-3">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-black mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
      {trend != null && (
        <p className={`text-[10px] font-semibold mt-0.5 ${trend >= 0 ? 'text-accent' : 'text-danger'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </p>
      )}
    </div>
  )
}

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-lg shadow-card overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-xs font-black text-secondary uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

export default function HealthMetrics() {
  const [days, setDays] = useState(30)
  const { data: analytics, loading } = useAsync(
    useCallback(() => api.adminAnalytics(days), [days])
  )

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <svg className="animate-spin h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading health metrics...
        </div>
      </div>
    )
  }

  if (!analytics) return null

  const {
    gmv = 0, totalCommission = 0, totalOrders = 0, avgOrderValue = 0,
    totalVendors = 0, totalCustomers = 0,
    gmvData = [], orderVolumeData = [], statusCounts = {},
    topProducts = [], vendorPerformance = [], fulfillmentHealth = {},
  } = analytics

  // Compute trends (compare first half vs second half of period)
  const half = Math.floor(gmvData.length / 2)
  const firstHalfGMV = gmvData.slice(0, half).reduce((s, d) => s + d.gmv, 0)
  const secondHalfGMV = gmvData.slice(half).reduce((s, d) => s + d.gmv, 0)
  const gmvTrend = firstHalfGMV > 0 ? Math.round(((secondHalfGMV - firstHalfGMV) / firstHalfGMV) * 100) : 0

  const firstHalfOrders = orderVolumeData.slice(0, half).reduce((s, d) => s + d.orders, 0)
  const secondHalfOrders = orderVolumeData.slice(half).reduce((s, d) => s + d.orders, 0)
  const ordersTrend = firstHalfOrders > 0 ? Math.round(((secondHalfOrders - firstHalfOrders) / firstHalfOrders) * 100) : 0

  // Status pie data
  const pieData = Object.entries(statusCounts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ name: status, value: count }))

  // Fulfillment health bar data
  const fulfillmentData = [
    { name: 'Awaiting', value: fulfillmentHealth.awaitingDispatch || 0, fill: '#ea580c' },
    { name: 'Shipped', value: fulfillmentHealth.shipped || 0, fill: '#2563eb' },
    { name: 'Delivered', value: fulfillmentHealth.delivered || 0, fill: '#16a34a' },
    { name: 'Cancelled', value: fulfillmentHealth.cancelled || 0, fill: '#dc2626' },
  ]

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-secondary uppercase tracking-wide">Health Metrics</h2>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="text-[11px] font-bold text-secondary border border-gray-300 rounded px-2 py-1 outline-none focus:border-primary"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label="Revenue (GMV)" value={formatNaira(gmv)} sub={`Commission: ${formatNaira(totalCommission)}`} color="text-secondary" trend={gmvTrend} />
        <MiniStat label="Total Orders" value={totalOrders} sub={`Avg: ${formatNaira(avgOrderValue)}`} color="text-primary" trend={ordersTrend} />
        <MiniStat label="Active Vendors" value={totalVendors} sub={`Customers: ${totalCustomers}`} color="text-accent" />
        <MiniStat
          label="Fulfillment Rate"
          value={totalOrders > 0 ? `${Math.round(((fulfillmentHealth.delivered || 0) / Math.max(1, totalOrders)) * 100)}%` : '—'}
          sub={`${fulfillmentHealth.delivered || 0} delivered of ${totalOrders}`}
          color="text-accent"
        />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Revenue over time */}
        {gmvData.length > 0 && (
          <ChartCard title="Revenue Over Time">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={gmvData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(d) => {
                      try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) } catch { return d }
                    }}
                  />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v) => [formatNaira(v), 'Revenue']}
                    labelFormatter={(d) => {
                      try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d }
                    }}
                  />
                  <Line type="monotone" dataKey="gmv" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {/* Order volume over time */}
        {orderVolumeData.length > 0 && (
          <ChartCard title="Order Volume Over Time">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orderVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(d) => {
                      try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) } catch { return d }
                    }}
                  />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(v) => [`${v} orders`, 'Volume']}
                    labelFormatter={(d) => {
                      try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d }
                    }}
                  />
                  <Bar dataKey="orders" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Vendor performance */}
        {vendorPerformance.length > 0 && (
          <ChartCard title="Vendor Performance" className="lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="text-left py-2 pr-3">#</th>
                    <th className="text-left py-2 pr-3">Vendor</th>
                    <th className="text-right py-2 pr-3">Orders</th>
                    <th className="text-right py-2 pr-3">Items Sold</th>
                    <th className="text-right py-2">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {vendorPerformance.map((v, i) => (
                    <tr key={v.vendorId} className="hover:bg-background/60">
                      <td className="py-2 pr-3 text-gray-400 font-bold">{i + 1}</td>
                      <td className="py-2 pr-3 font-bold text-secondary">{v.vendorId.slice(-6).toUpperCase()}</td>
                      <td className="py-2 pr-3 text-right text-gray-600">{v.orders}</td>
                      <td className="py-2 pr-3 text-right text-gray-600">{v.itemsSold}</td>
                      <td className="py-2 text-right font-bold text-secondary">{formatNaira(v.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        )}

        {/* Fulfillment health */}
        <ChartCard title="Fulfillment Health">
          {fulfillmentData.some((d) => d.value > 0) ? (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fulfillmentData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                      {fulfillmentData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} orders`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {fulfillmentData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                    <span className="text-[10px] text-gray-500">{d.name}: {d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[11px] text-gray-500 text-center py-6">No orders to display.</p>
          )}
        </ChartCard>
      </div>

      {/* Top products */}
      {topProducts.length > 0 && (
        <ChartCard title="Top Products by Quantity Sold">
          <ul className="divide-y divide-gray-100">
            {topProducts.map((p, i) => (
              <li key={i} className="py-2.5 flex items-center gap-3">
                <span className="text-[10px] font-black text-gray-400 w-4">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-secondary line-clamp-1">{p.name}</p>
                  <p className="text-[10px] text-gray-500">{p.qty} sold</p>
                </div>
                <p className="text-xs font-bold text-secondary">{formatNaira(p.revenue)}</p>
              </li>
            ))}
          </ul>
        </ChartCard>
      )}
    </div>
  )
}
