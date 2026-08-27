import { Router } from 'express'
import { repo } from '../store.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/notifications - get current user's notifications (paginated)
router.get('/', requireAuth, async (req, res) => {
  const { unread, page, limit } = req.query
  const pageNum = Math.max(1, Number(page) || 1)
  const limitNum = Math.min(50, Math.max(1, Number(limit) || 20))
  const notifications = await repo.findNotifications({
    userId: req.user.id,
    unreadOnly: unread === 'true',
    page: pageNum,
    limit: limitNum,
  })
  const total = await repo.countNotifications({
    userId: req.user.id,
    unreadOnly: unread === 'true',
  })
  res.json({ notifications, total, page: pageNum, limit: limitNum })
})

// GET /api/notifications/count - get unread count
router.get('/count', requireAuth, async (req, res) => {
  const count = await repo.countUnreadNotifications(req.user.id)
  res.json({ count })
})

// PATCH /api/notifications/read - mark all as read
router.patch('/read', requireAuth, async (req, res) => {
  await repo.markNotificationsRead(req.user.id)
  res.json({ ok: true })
})

export default router
