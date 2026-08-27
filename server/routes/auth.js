import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { repo } from '../store.js'
import { JWT_SECRET, requireAuth, requireRole, publicUser } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { setCookie, clearCookie, issueCsrfToken, clearCsrfToken } from '../middleware/csrf.js'

const router = Router()

// Rate limit login/register to prevent brute-force attacks
const authRateLimit = rateLimit({ windowMs: 60_000, max: 15, message: 'Too many attempts, please wait a minute' })

const JWT_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

const sign = (user) =>
  jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' })

/** Set JWT in HttpOnly cookie and issue a CSRF token. */
function setAuthCookies(res, user) {
  const token = sign(user)
  // HttpOnly cookie: JS cannot access this (XSS protection)
  setCookie(res, 'token', token, { httpOnly: true, maxAge: JWT_MAX_AGE })
  // CSRF synchronizer token: JS reads this cookie, sends it in x-csrf-token header
  const csrfToken = issueCsrfToken(res)
  return { token, csrfToken }
}

/** Clear all auth cookies. */
function clearAuthCookies(res) {
  clearCookie(res, 'token', { httpOnly: true })
  clearCsrfToken(res)
}

// GET /api/auth/csrf-token - returns a fresh CSRF token and sets the cookie.
// Frontend calls this on boot and after login/logout to stay in sync.
router.get('/csrf-token', (req, res) => {
  const csrfToken = issueCsrfToken(res)
  res.json({ csrfToken })
})

// POST /api/auth/register - customers and vendors sign up (admin is seeded only)
router.post('/register', authRateLimit, async (req, res) => {
  const { name, email, password, role, whatsapp } = req.body || {}
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
  const data = { name, email, passwordHash, role: cleanRole }
  if (cleanRole === 'vendor') {
    data.vendorStatus = 'pending'
    if (whatsapp) data.whatsapp = whatsapp.trim()
  }
  const user = await repo.createUser(data)
  const { token, csrfToken } = setAuthCookies(res, user)
  // Token in body for backward-compat API clients; cookie for browser clients
  res.status(201).json({ token, csrfToken, user: publicUser(user) })
})

// POST /api/auth/login
router.post('/login', authRateLimit, async (req, res) => {
  const { email, password } = req.body || {}
  const user = await repo.findUserByEmail(email)
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password' })
  }
  const { token, csrfToken } = setAuthCookies(res, user)
  res.json({ token, csrfToken, user: publicUser(user) })
})

// POST /api/auth/logout - clears JWT cookie and CSRF cookie
router.post('/logout', (req, res) => {
  clearAuthCookies(res)
  res.json({ message: 'Logged out' })
})

// GET /api/auth/me - re-validates the token and returns the current user
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

// PATCH /api/auth/me - update the current user's profile (name, logo, whatsapp, password)
router.patch('/me', requireAuth, async (req, res) => {
  const { name, logo, banner, bio, whatsapp, currentPassword, newPassword } = req.body || {}
  const updates = {}

  if (name && typeof name === 'string' && name.trim()) {
    updates.name = name.trim()
  }

  if (logo !== undefined) {
    updates.logo = logo || null
  }

  if (whatsapp !== undefined) {
    updates.whatsapp = whatsapp ? whatsapp.trim() : null
  }

  if (banner !== undefined) {
    updates.banner = banner || null
  }

  if (bio !== undefined) {
    updates.bio = typeof bio === 'string' ? bio.trim() : ''
  }

  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ message: 'Current password is required to set a new password' })
    }
    const user = await repo.findUserById(req.user.id)
    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) {
      return res.status(400).json({ message: 'Current password is incorrect' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' })
    }
    updates.passwordHash = await bcrypt.hash(newPassword, 10)
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No valid fields to update' })
  }

  const updated = await repo.updateUser(req.user.id, updates)
  res.json({ user: publicUser(updated) })
})

// GET /api/auth/users - admin only: every account on the platform
router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  const users = await repo.findAllUsers()
  res.json({ users: users.map(publicUser) })
})

export default router
