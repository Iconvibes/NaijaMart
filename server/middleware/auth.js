import jwt from 'jsonwebtoken'
import { repo } from '../store.js'

export const JWT_SECRET = process.env.JWT_SECRET || 'naijamart-dev-secret'

// Verifies the Bearer token and loads the user into req.user
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ message: 'Please log in to continue' })

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = await repo.findUserById(payload.id)
    if (!user) return res.status(401).json({ message: 'This account no longer exists' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ message: 'Your session has expired - please log in again' })
  }
}

// Requires the current user to have one of the given roles
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to do that' })
  }
  next()
}

// Strips the password hash before sending a user to the client
export const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  logo: u.logo,
  whatsapp: u.whatsapp,
  createdAt: u.createdAt,
})
