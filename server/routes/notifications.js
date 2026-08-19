import { Router } from 'express'
import { repo } from '../store.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/notifications - get current user's notifications
router.get('/', requireAuth, async (req, res) => {
  const { unread } = req.query
  const notifications = await repo.findNotifications({
    userId: req.user.id,
    unreadOnly: unread === 'true',
  })
  res.json({ notifications })
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
