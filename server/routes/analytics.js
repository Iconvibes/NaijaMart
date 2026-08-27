import { Router } from 'express'
import { repo } from '../store.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// GET /api/analytics/vendor - vendor's own analytics
router.get('/vendor', requireAuth, requireRole('vendor'), async (req, res) => {
  const days = Number(req.query.days) || 30
  const analytics = await repo.getVendorAnalytics(req.user.id, days)
  res.json(analytics)
})

// GET /api/analytics/admin - platform-wide analytics
router.get('/admin', requireAuth, requireRole('admin'), async (req, res) => {
  const days = Number(req.query.days) || 30
  const analytics = await repo.getAdminAnalyticsAggregated(days)
  res.json(analytics)
})

export default router
