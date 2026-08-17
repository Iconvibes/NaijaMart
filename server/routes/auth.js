import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { repo } from '../store.js'
import { JWT_SECRET, requireAuth, requireRole, publicUser } from '../middleware/auth.js'

const router = Router()

const sign = (user) =>
  jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' })

// POST /api/auth/register - customers and vendors sign up (admin is seeded only)
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body || {}
  const cleanRole = role === 'vendor' ? 'vendor' : 'customer'

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' })
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' })
  }
  if (await repo.findUserByEmail(email)) {
    return res.status(409).json({ message: 'An account with this email already exists' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await repo.createUser({ name, email, passwordHash, role: cleanRole })
  res.status(201).json({ token: sign(user), user: publicUser(user) })
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}
  const user = await repo.findUserByEmail(email)
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password' })
  }
  res.json({ token: sign(user), user: publicUser(user) })
})

// GET /api/auth/me - re-validates the token and returns the current user
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

// GET /api/auth/users - admin only: every account on the platform
router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  const users = await repo.findAllUsers()
  res.json({ users: users.map(publicUser) })
})

export default router
