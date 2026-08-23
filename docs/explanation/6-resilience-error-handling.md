# Resilience & Error Handling

How NaijaMart handles failures in external services and internal errors.

## Design Philosophy

The app must work **without any external service configured**. WhatsApp, email, and AI are optional enhancements. When they fail, the core functionality (browse, buy, sell) is unaffected.

## Resilience Patterns

### 1. Retry with Exponential Backoff

**File:** `server/lib/resilience.js`

Retries a failed operation with increasing delays and random jitter:

```javascript
await retry(fn, {
  retries: 3,         // Try up to 3 times
  baseDelayMs: 1000,  // Start with 1s delay
  maxDelayMs: 30000,  // Cap at 30s
  label: 'operation'
})
```

**Delay formula:** `min(baseDelay * 2^attempt + random(500), maxDelay)`

Example: 1s → 2s → 4s (with jitter)

### 2. Circuit Breaker

**File:** `server/lib/resilience.js`

Stops calling a failing service after repeated failures:

| State | Behavior |
|-------|----------|
| **Closed** (normal) | Calls pass through. Failures are counted. |
| **Open** (broken) | All calls fail immediately. No network requests. |
| **Half-open** (testing) | One test call allowed through. If it succeeds → closed. If it fails → open again. |

**Per-service configuration:**

| Service | Threshold | Window | Cooldown |
|---------|-----------|--------|----------|
| WhatsApp | 5 failures | 60s | 120s |
| Resend | 5 failures | 60s | 120s |
| OpenAI | 3 failures | 60s | 180s |

**Why different thresholds?** OpenAI has a lower threshold (3) because it's more expensive per call. WhatsApp and Resend have higher thresholds (5) because transient failures are more common.

### 3. Timeout

**File:** `server/lib/resilience.js`

Aborts a promise if it takes too long:

```javascript
await withTimeout(fetch(url), 10_000, 'whatsapp')
```

| Service | Timeout |
|---------|---------|
| WhatsApp | 10s |
| Resend | 15s |
| OpenAI | 15s |

### 4. Dead Letter Queue

**File:** `server/lib/resilience.js`

In-memory queue for failed notifications. Limited to 1000 entries (oldest dropped when full).

```javascript
enqueueDeadLetter({ type: 'whatsapp', userId, orderId, phone, message, error })
```

Check queue size: `GET /api/health` → `dependencies.deadLetters`

**Warning:** Volatile — server restart loses all queued items. Production should use Redis or DB persistence.

## Error Handling Patterns

### Typed HTTP Errors

**File:** `server/lib/errors.js`

```javascript
class AppError extends Error {
  constructor(message, statusCode = 500) { ... }
}

class ValidationError extends AppError {
  constructor(message) { super(message, 400) }
}
```

Routes throw typed errors; the global error handler maps them to responses:

```javascript
// Global error handler
app.use((err, req, res, next) => {
  if (err instanceof AppError) return res.status(err.statusCode).json({ message: err.message })
  if (err.name === 'MulterError') return res.status(400).json({ message: err.message })
  console.error(err)
  res.status(500).json({ message: 'Something went wrong' })
})
```

**Never leaks internal details** — unexpected errors return a generic message.

### Fire-and-Forget

External service calls are async and never block the response:

```javascript
notifyVendors(order, repo).catch(err => console.error('WhatsApp error:', err.message))
sendOrderConfirmation(order).catch(() => {})
```

The user gets their response immediately. Notifications happen in the background.

### Graceful Degradation

Each external service is optional:

| Service | Not configured | Configured but failing |
|---------|---------------|----------------------|
| WhatsApp | Logs wa.me link to console | Retry → Circuit breaker → DLQ |
| Email | Silently skipped | Retry → Circuit breaker → DLQ |
| OpenAI | Returns 503 message | Retry → Circuit breaker |
| MongoDB | Falls back to in-memory | Connection error → in-memory fallback |

### Graceful Shutdown

On `SIGTERM` / `SIGINT`:

1. Stop accepting new connections
2. Finish in-flight requests
3. Close MongoDB connection
4. Exit cleanly

Force kill after 10 seconds if stuck.

## Health Check

`GET /api/health` reports:

```json
{
  "ok": true,
  "uptime": 12345,
  "memory": "83MB",
  "dependencies": {
    "mongodb": { "status": "ok", "mode": "connected" },
    "whatsapp": { "state": "closed", "recentFailures": 0 },
    "resend": { "state": "closed", "recentFailures": 0 },
    "openai": { "state": "closed", "recentFailures": 0 },
    "deadLetters": 0
  }
}
```

The `ok` field is `false` if MongoDB is degraded or any critical circuit is open.

## Why This Matters

In production, external services **will** fail. WhatsApp has outages. Email providers have downtime. OpenAI has rate limits. The circuit breaker pattern prevents cascading failures — a WhatsApp outage doesn't slow down order processing. The DLQ ensures no notification is permanently lost. The health check gives ops visibility into service health.
