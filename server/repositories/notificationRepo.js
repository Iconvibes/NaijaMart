import { isMemoryDb } from '../db.js'
import Notification from '../models/Notification.js'
import { mem, toNotificationObj } from './helpers.js'

const notificationRepo = {
  async createNotification(data) {
    if (isMemoryDb()) {
      const n = { id: `n${++mem.nid}`, createdAt: new Date().toISOString(), ...data }
      mem.notifications.push(n)
      return toNotificationObj(n)
    }
    const doc = await Notification.create(data)
    return toNotificationObj({ ...doc.toObject(), id: doc._id })
  },

  async findNotifications({ userId, unreadOnly = false, page = 1, limit = 20 } = {}) {
    if (isMemoryDb()) {
      let list = mem.notifications
      if (userId) list = list.filter((n) => String(n.userId) === String(userId))
      if (unreadOnly) list = list.filter((n) => !n.read)
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      const start = (page - 1) * limit
      return list.slice(start, start + limit).map(toNotificationObj)
    }
    const query = {}
    if (userId) query.userId = userId
    if (unreadOnly) query.read = false
    const skip = (Math.max(1, Number(page) || 1) - 1) * limit
    const docs = await Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
    return docs.map((d) => toNotificationObj({ ...d.toObject(), id: d._id }))
  },

  async countNotifications({ userId, unreadOnly = false } = {}) {
    if (isMemoryDb()) {
      let list = mem.notifications
      if (userId) list = list.filter((n) => String(n.userId) === String(userId))
      if (unreadOnly) list = list.filter((n) => !n.read)
      return list.length
    }
    const query = {}
    if (userId) query.userId = userId
    if (unreadOnly) query.read = false
    return Notification.countDocuments(query)
  },

  async countUnreadNotifications(userId) {
    if (isMemoryDb()) {
      return mem.notifications.filter((n) => String(n.userId) === String(userId) && !n.read).length
    }
    return Notification.countDocuments({ userId, read: false })
  },

  async markNotificationsRead(userId) {
    if (isMemoryDb()) {
      for (const n of mem.notifications) {
        if (String(n.userId) === String(userId)) n.read = true
      }
      return
    }
    await Notification.updateMany({ userId, read: false }, { $set: { read: true } })
  },
}

export default notificationRepo
