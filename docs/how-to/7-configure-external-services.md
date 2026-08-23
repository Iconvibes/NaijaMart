# Configure External Services

How to set up WhatsApp notifications, email delivery, and AI product generation.

All external services are **optional**. The app works fully without them — they degrade gracefully with circuit breakers and dead letter queues.

## WhatsApp Business API

Sends order notifications to vendors via WhatsApp when an order is placed.

### Setup

1. Create a Meta Business account at [developers.facebook.com](https://developers.facebook.com)
2. Set up WhatsApp Cloud API
3. Get a temporary access token and phone number ID
4. Set in `.env`:
   ```
   WHATSAPP_TOKEN=your-token-here
   WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
   ```

### How it works

- When an order is placed, `notifyVendors()` in `server/services/whatsapp.js` sends a WhatsApp message to each vendor in the order
- Vendors must have a `whatsapp` number set in their profile
- If not configured, messages are logged to the console with a `wa.me` link for manual testing
- Uses retry with exponential backoff, circuit breaker, and 10s timeout
- Failed messages go to the dead letter queue

### Vendor notification message includes:
- Order ID
- Customer name, phone, address
- Items with quantities and prices
- Vendor's subtotal
- Link to Seller Center

## Resend (Email)

Sends transactional emails: order confirmations, shipping updates, vendor approval/rejection, payout confirmations.

### Setup

1. Create an account at [resend.com](https://resend.com)
2. Get your API key
3. Set in `.env`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   EMAIL_FROM=NaijaMart <noreply@yourdomain.com>
   ```
4. Verify your domain in Resend for production sending

### How it works

- Emails are fire-and-forget — never block the request handler
- If `RESEND_API_KEY` is not set, emails are silently skipped
- Uses retry (2 retries, 2s base delay), circuit breaker, and 15s timeout
- Failed emails go to the dead letter queue for later retry

### Email types:

| Event | Email sent to | Template |
|-------|--------------|----------|
| Order placed | Customer email | Order confirmation with items and total |
| Order status changed | Customer email | Shipping update (processing/shipped/delivered) |
| Vendor approved | Vendor email | Welcome to NaijaMart |
| Vendor rejected | Vendor email | Application update |
| Payout processed | Vendor email | Payout confirmation with amount |

**Note:** Customer email is collected at checkout. Guest orders without email skip email notifications.

## OpenAI (AI Product Generation)

Generates product titles, descriptions, and SEO tags from a short prompt.

### Setup

1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. Set in `.env`:
   ```
   OPENAI_API_KEY=sk-xxxxxxxxxxxx
   ```

### How it works

- `POST /api/ai/generate-product` — vendor-only, rate-limited to 5 requests/minute
- Uses `gpt-4o-mini` model
- If not configured, returns a 503 message explaining the feature is unavailable
- Uses retry (2 retries), circuit breaker (3 failures threshold), and 15s timeout

### AI prompt structure:

The system prompt instructs the model to generate:
1. Three product title options (SEO-friendly, max 80 chars)
2. Three product description options (2-3 sentences, Nigerian market focus)
3. Ten SEO tags (lowercase, single words or short phrases)

Response is parsed from JSON in the AI's output (handles markdown code block wrapping).

## Circuit Breaker Behavior

All three services use the same resilience pattern:

| Service | Failures to open | Window | Cooldown |
|---------|-----------------|--------|----------|
| WhatsApp | 5 | 60s | 120s |
| Resend | 5 | 60s | 120s |
| OpenAI | 3 | 60s | 180s |

When a circuit opens, calls fail immediately with a "service unavailable" error. After cooldown, one test call is allowed through (half-open state).

## Dead Letter Queue

Failed notifications (WhatsApp, email) are queued in-memory for retry. The queue is limited to 1000 entries. Check the queue size via `GET /api/health` → `dependencies.deadLetters`.

**Warning:** The DLQ is volatile — server restart loses all queued items. For production, implement Redis or DB persistence.

## See Also

- [Resilience & Error Handling](../explanation/6-resilience-error-handling.md)
- [Environment Variables Reference](../reference/3-environment-variables.md)
