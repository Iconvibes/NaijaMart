// Simple in-memory rate limiter. Tracks requests by IP + route key.
// Not suitable for multi-process deployments — use a Redis-backed
// limiter (e.g. express-rate-limit) in production.

const buckets = new Map()

// Periodically clean up stale entries to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, entries] of buckets) {
    const fresh = entries.filter((t) => t > now - 60_000)
    if (fresh.length === 0) buckets.delete(key)
    else buckets.set(key, fresh)
  }
}, 60_000)

export function rateLimit({ windowMs = 60_000, max = 10, message = 'Too many requests, please try again later' } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown'
    const key = `${ip}:${req.route?.path || req.path}`
    const now = Date.now()

    const entries = (buckets.get(key) || []).filter((t) => t > now - windowMs)

    if (entries.length >= max) {
      return res.status(429).json({ message })
    }

    entries.push(now)
    buckets.set(key, entries)
    next()
  }
}
