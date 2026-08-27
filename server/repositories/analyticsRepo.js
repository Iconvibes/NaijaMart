import mongoose from 'mongoose'
import { isMemoryDb } from '../db.js'
import Order from '../models/Order.js'
import User from '../models/User.js'

/**
 * Analytics repository.
 *
 * Aggregation methods pull data from multiple domains (orders, users, products).
 * Cross-repo references are injected by the store facade via `configure()`.
 */
const analyticsRepo = {
  _orders: null,
  _users: null,
  _products: null,

  /** Inject cross-repo references. Called once by store.js at init time. */
  configure({ orderRepo, userRepo, productRepo }) {
    this._orders = orderRepo
    this._users = userRepo
    this._products = productRepo
  },

  async getVendorAnalytics(vendorId, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const orders = await this._orders.findOrders({ vendorId })
    const recentOrders = orders.filter((o) => new Date(o.createdAt) >= since)

    let totalRevenue = 0
    let totalOrders = recentOrders.length
    const productCounts = {}
    const dailyRevenue = {}

    for (const order of recentOrders) {
      for (const item of order.items) {
        if (String(item.vendorId) === String(vendorId)) {
          const lineTotal = item.price * item.qty
          totalRevenue += lineTotal
          productCounts[item.name] = (productCounts[item.name] || 0) + item.qty
        }
      }
      const day = new Date(order.createdAt).toISOString().split('T')[0]
      dailyRevenue[day] = (dailyRevenue[day] || 0) + order.items
        .filter((i) => String(i.vendorId) === String(vendorId))
        .reduce((s, i) => s + i.price * i.qty, 0)
    }

    const topProducts = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    const revenueData = Object.entries(dailyRevenue)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, revenue]) => ({ date, revenue }))

    return { totalRevenue, totalOrders, topProducts, revenueData }
  },

  async getAdminAnalytics(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const orders = await this._orders.findOrders({})
    const recentOrders = orders.filter((o) => new Date(o.createdAt) >= since)
    const users = await this._users.findAllUsers()

    let gmv = 0
    let totalCommission = 0
    const vendorRevenue = {}
    const dailyGMV = {}
    const statusCounts = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 }

    for (const order of recentOrders) {
      gmv += order.total
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1

      for (const item of order.items) {
        const vid = String(item.vendorId)
        vendorRevenue[vid] = (vendorRevenue[vid] || 0) + item.price * item.qty
      }

      // Commission is 10% of subtotals per vendor
      const byVendor = {}
      for (const item of order.items) {
        const vid = String(item.vendorId)
        byVendor[vid] = (byVendor[vid] || 0) + item.price * item.qty
      }
      for (const subtotal of Object.values(byVendor)) {
        totalCommission += Math.round(subtotal * 0.1)
      }

      const day = new Date(order.createdAt).toISOString().split('T')[0]
      dailyGMV[day] = (dailyGMV[day] || 0) + order.total
    }

    const topVendors = Object.entries(vendorRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([vendorId, revenue]) => ({ vendorId, revenue }))

    const gmvData = Object.entries(dailyGMV)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, gmv]) => ({ date, gmv }))

    const totalVendors = users.filter((u) => u.role === 'vendor').length
    const totalCustomers = users.filter((u) => u.role === 'customer').length

    return {
      gmv,
      totalCommission,
      totalOrders: recentOrders.length,
      totalVendors,
      totalCustomers,
      topVendors,
      gmvData,
      statusCounts,
    }
  },

  // MongoDB aggregation-based analytics (used when MongoDB is available).
  // Falls back to the in-memory method above for non-Mongo environments.
  async getAdminAnalyticsAggregated(days = 30) {
    if (isMemoryDb()) return this.getAdminAnalytics(days)

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [statusResult, gmvResult, vendorResult, userCounts] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            gmv: { $sum: '$total' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.vendorId',
            revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
    ])

    const statusCounts = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 }
    for (const s of statusResult) {
      if (s._id in statusCounts) statusCounts[s._id] = s.count
    }

    let totalCommission = 0
    const vendorRevenue = {}
    for (const v of vendorResult) {
      vendorRevenue[String(v._id)] = v.revenue
      totalCommission += Math.round(v.revenue * 0.1)
    }

    let gmv = 0
    const gmvData = gmvResult.map((d) => {
      gmv += d.gmv
      return { date: d._id, gmv: d.gmv }
    })

    const userMap = {}
    for (const u of userCounts) userMap[u._id] = u.count

    return {
      gmv,
      totalCommission,
      totalOrders: statusResult.reduce((s, r) => s + r.count, 0),
      totalVendors: userMap.vendor || 0,
      totalCustomers: userMap.customer || 0,
      topVendors: vendorResult.map((v) => ({ vendorId: String(v._id), revenue: v.revenue })),
      gmvData,
      statusCounts,
    }
  },
}

export default analyticsRepo
