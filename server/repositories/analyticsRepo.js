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

    const avgOrderValue = recentOrders.length > 0 ? Math.round(gmv / recentOrders.length) : 0

    // Daily order volume (count per day)
    const dailyOrderVolume = {}
    for (const order of recentOrders) {
      const day = new Date(order.createdAt).toISOString().split('T')[0]
      dailyOrderVolume[day] = (dailyOrderVolume[day] || 0) + 1
    }
    const orderVolumeData = Object.entries(dailyOrderVolume)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, orders: count }))

    // Top products by quantity sold
    const productSales = {}
    for (const order of recentOrders) {
      for (const item of order.items) {
        const key = item.name
        if (!productSales[key]) productSales[key] = { name: key, qty: 0, revenue: 0, vendorId: item.vendorId }
        productSales[key].qty += item.qty
        productSales[key].revenue += item.price * item.qty
      }
    }
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)

    // Vendor performance: orders count, revenue, items sold per vendor
    const vendorPerf = {}
    for (const order of recentOrders) {
      for (const item of order.items) {
        const vid = String(item.vendorId)
        if (!vendorPerf[vid]) vendorPerf[vid] = { vendorId: vid, orders: 0, revenue: 0, itemsSold: 0 }
        vendorPerf[vid].revenue += item.price * item.qty
        vendorPerf[vid].itemsSold += item.qty
      }
      // Count unique orders per vendor
      const vendorIdsInOrder = new Set(order.items.map((i) => String(i.vendorId)))
      for (const vid of vendorIdsInOrder) {
        vendorPerf[vid].orders = (vendorPerf[vid].orders || 0) + 1
      }
    }
    const vendorPerformance = Object.values(vendorPerf)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Fulfillment health: how many orders are stuck
    const fulfillmentHealth = {
      awaitingDispatch: orders.filter((o) => o.status === 'pending' || o.status === 'processing').length,
      shipped: orders.filter((o) => o.status === 'shipped').length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
    }

    return {
      gmv,
      totalCommission,
      totalOrders: recentOrders.length,
      totalVendors,
      totalCustomers,
      avgOrderValue,
      topVendors,
      gmvData,
      statusCounts,
      orderVolumeData,
      topProducts,
      vendorPerformance,
      fulfillmentHealth,
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

    const totalOrders = statusResult.reduce((s, r) => s + r.count, 0)
    const avgOrderValue = totalOrders > 0 ? Math.round(gmv / totalOrders) : 0

    // Daily order volume
    const orderVolumeData = gmvData.map((d) => ({ date: d.date, orders: 0 }))
    // Use statusResult for daily counts via a separate aggregation
    const volumeResult = await Order.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    const orderVolumeDataFinal = volumeResult.map((d) => ({ date: d._id, orders: d.count }))

    // Top products
    const productResult = await Order.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', qty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } }, vendorId: { $first: '$items.vendorId' } } },
      { $sort: { qty: -1 } },
      { $limit: 10 },
    ])
    const topProducts = productResult.map((p) => ({ name: p._id, qty: p.qty, revenue: p.revenue, vendorId: String(p.vendorId) }))

    // Vendor performance
    const vendorPerformance = vendorResult.map((v) => ({
      vendorId: String(v._id),
      revenue: v.revenue,
      orders: recentOrders.filter((o) => o.items.some((i) => String(i.vendorId) === String(v._id))).length,
      itemsSold: recentOrders.reduce((sum, o) => sum + o.items.filter((i) => String(i.vendorId) === String(v._id)).reduce((s, i) => s + i.qty, 0), 0),
    }))

    // Fulfillment health (all-time, not just period)
    const allOrders = await this._orders.findOrders({})
    const fulfillmentHealth = {
      awaitingDispatch: allOrders.filter((o) => o.status === 'pending' || o.status === 'processing').length,
      shipped: allOrders.filter((o) => o.status === 'shipped').length,
      delivered: allOrders.filter((o) => o.status === 'delivered').length,
      cancelled: allOrders.filter((o) => o.status === 'cancelled').length,
    }

    return {
      gmv,
      totalCommission,
      totalOrders,
      totalVendors: userMap.vendor || 0,
      totalCustomers: userMap.customer || 0,
      avgOrderValue,
      topVendors: vendorResult.map((v) => ({ vendorId: String(v._id), revenue: v.revenue })),
      gmvData,
      statusCounts,
      orderVolumeData: orderVolumeDataFinal,
      topProducts,
      vendorPerformance,
      fulfillmentHealth,
    }
  },
}

export default analyticsRepo
