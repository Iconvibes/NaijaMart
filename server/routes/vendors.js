import { Router } from 'express'
import { repo } from '../store.js'

const router = Router()

// GET /api/vendors - public list of marketplace sellers
router.get('/', async (req, res) => {
  const vendors = await repo.findVendors()
  res.json(vendors.map((v) => ({ id: v.id, name: v.name, logo: v.logo })))
})

export default router
