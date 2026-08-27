import crypto from 'node:crypto'

// ─── Cookie Helpers ─────────────────────────────────────────────────────────
// We parse cookies manually to avoid adding cookie-parser as a dependency.

const IS_PROD = process.env.NODE_ENV === 'production'

/** Set a cookie on the response with appropriate security flags. */
export function setCookie(res, name, value, { httpOnly = false, maxAge, path = '/' } = {}) {
  const parts = [
    `${name}=${value}`,
    `Path=${path}`,
    `SameSite=Lax`,
    httpOnly ? 'HttpOnly' : '',
    IS_PROD ? 'Secure' : '',
    maxAge ? `Max-Age=${maxAge}` : '',
  ].filter(Boolean)
  res.append('Set-Cookie', parts.join('; '))
}

/** Clear a cookie by setting it with Max-Age=0. */
export function clearCookie(res, name, { httpOnly = false, path = '/' } = {}) {
  const parts = [
    `${name}=`,
    `Path=${path}`,
    `SameSite=Lax`,
    httpOnly ? 'HttpOnly' : '',
    IS_PROD ? 'Secure' : '',
    'Max-Age=0',
  ].filter(Boolean)
  res.append('Set-Cookie', parts.join('; '))
}

/** Parse cookies from the raw Cookie header into an object. */
export function parseCookies(req) {
  const header = req.headers.cookie || ''
  const cookies = {}
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=')
    if (idx === -1) continue
    const key = pair.slice(0, idx).trim()
    const val = pair.slice(idx + 1).trim()
    if (key) cookies[key] = val
  }
  return cookies
}

// ─── CSRF Token ─────────────────────────────────────────────────────────────

const CSRF_COOKIE = '_csrf'
const CSRF_HEADER = 'x-csrf-token'
const CSRF_TOKEN_LENGTH = 32
// 7 days in seconds
const CSRF_MAX_AGE = 7 * 24 * 60 * 60

/**
 * Generate a new CSRF token, set it in a readable (non-HttpOnly) cookie,
 * and return the token value for the response body.
 *
 * The frontend reads this cookie with document.cookie and sends the
 * value back in the x-csrf-token header on state-changing requests.
 */
export function issueCsrfToken(res) {
  const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
  setCookie(res, CSRF_COOKIE, token, { maxAge: CSRF_MAX_AGE })
  return token
}

/**
 * Clear the CSRF cookie on logout.
 */
export function clearCsrfToken(res) {
  clearCookie(res, CSRF_COOKIE)
}

// ─── CSRF Validation Middleware ──────────────────────────────────────────────

/**
 * Middleware that validates the CSRF synchronizer token.
 *
 * Compares the token from the x-csrf-token request header against the
 * token stored in the _csrf cookie. Both are plain strings — this is
 * the standard double-submit cookie pattern.
 *
 * Safe methods (GET, HEAD, OPTIONS) are exempt.
 */
export function validateCsrf(req, res, next) {
  // Safe methods don't need CSRF protection
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next()
  }

  const cookies = parseCookies(req)
  const cookieToken = cookies[CSRF_COOKIE]
  const headerToken = req.headers[CSRF_HEADER]

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ message: 'CSRF token missing' })
  }

  // Use constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    return res.status(403).json({ message: 'CSRF token invalid' })
  }

  next()
}


