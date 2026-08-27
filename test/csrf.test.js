import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

// ─── Cookie parsing ──────────────────────────────────────────────────────────

function parseCookies(header) {
  const cookies = {}
  for (const pair of (header || '').split(';')) {
    const idx = pair.indexOf('=')
    if (idx === -1) continue
    const key = pair.slice(0, idx).trim()
    const val = pair.slice(idx + 1).trim()
    if (key) cookies[key] = val
  }
  return cookies
}

// ─── CSRF token generation ───────────────────────────────────────────────────

function issueCsrfToken() {
  return crypto.randomBytes(32).toString('hex')
}

// ─── CSRF validation ─────────────────────────────────────────────────────────

function validateCsrf(cookieToken, headerToken) {
  if (!cookieToken || !headerToken) return false
  if (cookieToken.length !== headerToken.length) return false
  return crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CSRF cookie helpers', () => {
  it('parseCookies parses a standard cookie header', () => {
    const header = 'token=abc123; _csrf=def456; session=xyz'
    const cookies = parseCookies(header)
    assert.equal(cookies.token, 'abc123')
    assert.equal(cookies._csrf, 'def456')
    assert.equal(cookies.session, 'xyz')
  })

  it('parseCookies handles empty header', () => {
    assert.deepEqual(parseCookies(''), {})
    assert.deepEqual(parseCookies(null), {})
  })

  it('parseCookies handles values with equals signs', () => {
    const header = 'token=abc=def'
    const cookies = parseCookies(header)
    assert.equal(cookies.token, 'abc=def')
  })

  it('parseCookies trims whitespace', () => {
    const header = ' token = abc ; _csrf = def '
    const cookies = parseCookies(header)
    assert.equal(cookies.token, 'abc')
    assert.equal(cookies._csrf, 'def')
  })
})

describe('CSRF token generation', () => {
  it('generates a 64-char hex string', () => {
    const token = issueCsrfToken()
    assert.equal(token.length, 64)
    assert.match(token, /^[0-9a-f]{64}$/)
  })

  it('generates unique tokens', () => {
    const t1 = issueCsrfToken()
    const t2 = issueCsrfToken()
    assert.notEqual(t1, t2)
  })
})

describe('CSRF double-submit validation', () => {
  it('passes when cookie and header tokens match', () => {
    const token = issueCsrfToken()
    assert.ok(validateCsrf(token, token))
  })

  it('fails when tokens do not match', () => {
    const t1 = issueCsrfToken()
    const t2 = issueCsrfToken()
    assert.ok(!validateCsrf(t1, t2))
  })

  it('fails when cookie token is missing', () => {
    assert.ok(!validateCsrf(null, issueCsrfToken()))
  })

  it('fails when header token is missing', () => {
    assert.ok(!validateCsrf(issueCsrfToken(), null))
  })

  it('fails when both are missing', () => {
    assert.ok(!validateCsrf(null, null))
  })

  it('fails when tokens have different lengths', () => {
    assert.ok(!validateCsrf('abc', 'abcdef'))
  })

  it('uses constant-time comparison (timing-safe)', () => {
    // timingSafeEqual throws if lengths differ — our wrapper guards against that
    const token = issueCsrfToken()
    // Same-length but different value
    const tampered = '0' + token.slice(1)
    assert.ok(!validateCsrf(token, tampered))
  })
})
