// Resilience utilities for external API calls.
//
// - retry: retry a function with exponential backoff + jitter
// - circuitBreaker: stop calling a failing service for a cooldown period
// - withTimeout: abort a promise if it takes too long
// - deadLetterQueue: persist failed notifications for later retry

// ─── Retry with exponential backoff ────────────────────────────────────────

export async function retry(fn, { retries = 3, baseDelayMs = 1000, maxDelayMs = 30_000, label = 'operation' } = {}) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt === retries) break

      // Exponential backoff with jitter: delay * 2^attempt + random jitter
      const delay = Math.min(baseDelayMs * 2 ** attempt + Math.random() * 500, maxDelayMs)
      console.warn(`[${label}] Attempt ${attempt + 1} failed: ${err.message}. Retrying in ${Math.round(delay)}ms...`)
      await sleep(delay)
    }
  }
  console.error(`[${label}] All ${retries + 1} attempts failed`)
  throw lastError
}

// ─── Circuit Breaker ───────────────────────────────────────────────────────
// Tracks failures per service. After `threshold` failures within `windowMs`,
// the circuit "opens" and blocks calls for `cooldownMs`. After cooldown, it
// enters "half-open" and lets one test call through.

export class CircuitBreaker {
  constructor(name, { threshold = 5, windowMs = 60_000, cooldownMs = 120_000 } = {}) {
    this.name = name
    this.threshold = threshold
    this.windowMs = windowMs
    this.cooldownMs = cooldownMs
    this.failures = []
    this.state = 'closed' // closed = normal, open = blocking, halfOpen = testing
    this.halfOpenTimer = null
  }

  get isOpen() {
    if (this.state === 'open') {
      // Check if cooldown has passed
      const lastFailure = this.failures[this.failures.length - 1]
      if (lastFailure && Date.now() - lastFailure > this.cooldownMs) {
        this.state = 'halfOpen'
        return false // allow one test call
      }
      return true
    }
    return false
  }

  recordSuccess() {
    // Reset on success — circuit is healthy
    this.failures = []
    this.state = 'closed'
    if (this.halfOpenTimer) {
      clearTimeout(this.halfOpenTimer)
      this.halfOpenTimer = null
    }
  }

  recordFailure() {
    const now = Date.now()
    this.failures.push(now)
    // Prune old failures outside the window
    this.failures = this.failures.filter((t) => now - t < this.windowMs)

    if (this.failures.length >= this.threshold) {
      this.state = 'open'
      console.warn(`[CircuitBreaker:${this.name}] OPEN — ${this.failures.length} failures in ${this.windowMs / 1000}s. Cooling down for ${this.cooldownMs / 1000}s.`)
    }
  }

  async execute(fn) {
    if (this.isOpen) {
      const err = new Error(`Circuit breaker open for ${this.name} — service unavailable`)
      err.circuitOpen = true
      throw err
    }

    try {
      const result = await fn()
      this.recordSuccess()
      return result
    } catch (err) {
      this.recordFailure()
      throw err
    }
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      recentFailures: this.failures.length,
      threshold: this.threshold,
    }
  }
}

// ─── Timeout wrapper ───────────────────────────────────────────────────────

export function withTimeout(promise, ms, label = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`[${label}] Timeout after ${ms}ms`)), ms)
    ),
  ])
}

// ─── Dead Letter Queue ─────────────────────────────────────────────────────
// In production, this would be Redis or a database table. For now, an
// in-memory queue that persists failed notifications for retry.

const deadLetterQueue = []
const MAX_DLQ_SIZE = 1000

export function enqueueDeadLetter(entry) {
  if (deadLetterQueue.length >= MAX_DLQ_SIZE) {
    deadLetterQueue.shift() // drop oldest if full
  }
  deadLetterQueue.push({
    ...entry,
    failedAt: new Date().toISOString(),
    retries: (entry.retries || 0) + 1,
  })
  console.warn(`[DLQ] Enqueued: ${entry.type || 'unknown'} for ${entry.userId || 'unknown'} — ${entry.error || 'no error'}`)
}

export function getDeadLetters() {
  return [...deadLetterQueue]
}

export function clearDeadLetters() {
  deadLetterQueue.length = 0
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Pre-built circuit breakers for each external service
export const circuits = {
  whatsapp: new CircuitBreaker('whatsapp', { threshold: 5, windowMs: 60_000, cooldownMs: 120_000 }),
  resend: new CircuitBreaker('resend', { threshold: 5, windowMs: 60_000, cooldownMs: 120_000 }),
  openai: new CircuitBreaker('openai', { threshold: 3, windowMs: 60_000, cooldownMs: 180_000 }),
}
