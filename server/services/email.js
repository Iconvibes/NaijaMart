// Email notification service using Resend. All sends are fire-and-forget —
// they never block the request handler. If Resend is not configured, emails
// are silently skipped (the app works fine without them).
//
// Resilience: uses retry with backoff, circuit breaker, and timeout.
// Failed emails are queued in the dead letter queue for later retry.

import { retry, circuits, withTimeout, enqueueDeadLetter } from '../lib/resilience.js'

let resendClient = null

async function getClient() {
  if (resendClient) return resendClient
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  try {
    const { Resend } = await import('resend')
    resendClient = new Resend(apiKey)
    return resendClient
  } catch {
    return null
  }
}

const FROM = process.env.EMAIL_FROM || 'NaijaMart <noreply@naijamart.com>'

async function send(to, subject, html) {
  const client = getClient()
  if (!client) return // silently skip if not configured

  try {
    await circuits.resend.execute(() =>
      retry(
        () =>
          withTimeout(
            client.emails.send({ from: FROM, to, subject, html }),
            15_000, // 15s timeout
            'resend'
          ),
        { retries: 2, baseDelayMs: 2000, label: 'resend-email' }
      )
    )
  } catch (err) {
    if (err.circuitOpen) {
      console.warn(`Resend circuit breaker open — queuing email for later: ${subject}`)
    } else {
      console.error('Email send error:', err.message)
    }
    // Queue for retry later
    enqueueDeadLetter({
      type: 'email',
      to,
      subject,
      html,
      error: err.message,
    })
  }
}

function formatNaira(amount) {
  return `₦${Number(amount).toLocaleString()}`
}

export async function sendOrderConfirmation(order) {
  if (!order.customerEmail) return // no email on file — skip silently
  const items = order.items.map((i) => `<li>${i.name} × ${i.qty} — ${formatNaira(i.price * i.qty)}</li>`).join('')
  await send(order.customerEmail, `Order Confirmation — #${String(order.id).slice(-8).toUpperCase()}`, `
    <h2>Order Confirmed!</h2>
    <p>Hi ${order.customerName},</p>
    <p>Your order <strong>#${String(order.id).slice(-8).toUpperCase()}</strong> has been placed successfully.</p>
    <p><strong>Total:</strong> ${formatNaira(order.total)}</p>
    <ul>${items}</ul>
    <p>Delivering to: ${order.customerAddress}</p>
    <p>You can track your order at any time on NaijaMart.</p>
  `)
}

export async function sendShippingUpdate(order, status) {
  if (!order.customerEmail) return // no email on file — skip silently
  const statusMessages = {
    processing: 'is being processed',
    shipped: 'has been shipped',
    delivered: 'has been delivered',
  }
  const message = statusMessages[status] || `status updated to ${status}`
  await send(order.customerEmail, `Order Update — #${String(order.id).slice(-8).toUpperCase()}`, `
    <h2>Order Update</h2>
    <p>Hi ${order.customerName},</p>
    <p>Your order <strong>#${String(order.id).slice(-8).toUpperCase()}</strong> ${message}.</p>
    ${status === 'delivered' ? '<p>Thank you for shopping with NaijaMart!</p>' : ''}
  `)
}

export async function sendPayoutConfirmation(vendor, amount) {
  await send(vendor.email, `Payout Confirmation — ${formatNaira(amount)}`, `
    <h2>Payout Processed</h2>
    <p>Hi ${vendor.name},</p>
    <p>A payout of <strong>${formatNaira(amount)}</strong> has been sent to your bank account.</p>
    <p>Thank you for selling on NaijaMart!</p>
  `)
}

export async function sendVendorApproval(vendor, approved) {
  await send(vendor.email, approved ? 'Vendor Application Approved' : 'Vendor Application Update', approved ? `
    <h2>Welcome to NaijaMart!</h2>
    <p>Hi ${vendor.name},</p>
    <p>Great news! Your vendor application has been approved. You can now start listing products.</p>
    <p>Log in to your Seller Center to get started.</p>
  ` : `
    <h2>Vendor Application Update</h2>
    <p>Hi ${vendor.name},</p>
    <p>We regret to inform you that your vendor application was not approved at this time.</p>
    <p>Please contact our support team for more details.</p>
  `)
}
