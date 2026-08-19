// WhatsApp Business API notification service.
//
// Sends order notifications to vendors via WhatsApp Cloud API (Meta).
// In development mode (no API credentials), messages are logged to the
// console and a wa.me link is generated for manual testing.
//
// Resilience: uses retry with backoff, circuit breaker, and timeout to
// handle transient failures and sustained outages gracefully.

import { retry, circuits, withTimeout, enqueueDeadLetter } from '../lib/resilience.js'

const WHATSAPP_API = 'https://graph.facebook.com/v18.0'
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || ''
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || ''

const isConfigured = () => Boolean(WHATSAPP_TOKEN && WHATSAPP_PHONE_ID)

// Format a Nigerian phone number for WhatsApp (remove spaces, dashes, ensure +234 prefix)
function formatPhone(phone) {
  if (!phone) return null
  let cleaned = phone.replace(/[\s\-()]/g, '')
  // Convert 0XXXXXXXXX to +234XXXXXXXXX
  if (cleaned.startsWith('0')) {
    cleaned = '+234' + cleaned.slice(1)
  }
  // Add + if missing
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned
  }
  return cleaned
}

// Build the order notification message text
function buildOrderMessage(order, vendorItems, vendorName) {
  const itemCount = vendorItems.reduce((sum, i) => sum + i.qty, 0)
  const subtotal = vendorItems.reduce((sum, i) => sum + i.price * i.qty, 0)
  const itemNames = vendorItems.map((i) => `• ${i.name} x${i.qty} — ₦${i.price.toLocaleString('en-NG')}`).join('\n')

  return `🛒 *New Order on NaijaMart!*

Hi ${vendorName}, you have a new order:

📦 *Order #${order.id.slice(-8).toUpperCase()}*
👤 Customer: ${order.customerName}
📞 Phone: ${order.customerPhone}
📍 Address: ${order.customerAddress}

*Your items (${itemCount} unit${itemCount === 1 ? '' : 's'}):*
${itemNames}

💰 *Your subtotal: ₦${subtotal.toLocaleString('en-NG')}*
📋 Status: Pending

Log in to your Seller Center to view details and dispatch:
https://naijamart.com/vendor/orders

— NaijaMart`
}

// Send a WhatsApp message using the Cloud API — with retry, circuit breaker, and timeout
async function sendWhatsAppMessage(to, text) {
  const url = `${WHATSAPP_API}/${WHATSAPP_PHONE_ID}/messages`

  return circuits.whatsapp.execute(() =>
    retry(
      () =>
        withTimeout(
          fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${WHATSAPP_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: formatPhone(to),
              type: 'text',
              text: { body: text },
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const err = await res.json().catch(() => ({}))
              throw new Error(err.error?.message || `WhatsApp API returned ${res.status}`)
            }
            return res.json()
          }),
          10_000, // 10s timeout
          'whatsapp'
        ),
      { retries: 2, baseDelayMs: 2000, label: 'whatsapp' }
    )
  )
}

// Main notification function — call this after an order is placed.
// Finds all unique vendors in the order and sends each a WhatsApp message.
export async function notifyVendors(order, repo) {
  // Group items by vendor
  const vendorMap = new Map()
  for (const item of order.items) {
    const vid = String(item.vendorId)
    if (!vendorMap.has(vid)) vendorMap.set(vid, [])
    vendorMap.get(vid).push(item)
  }

  const results = []

  for (const [vendorId, items] of vendorMap) {
    const vendor = await repo.findUserById(vendorId)
    if (!vendor || !vendor.whatsapp) {
      results.push({ vendorId, sent: false, reason: vendor ? 'no whatsapp number' : 'vendor not found' })
      continue
    }

    const message = buildOrderMessage(order, items, vendor.name)

    if (isConfigured()) {
      // Production: send via WhatsApp Cloud API with resilience
      try {
        await sendWhatsAppMessage(vendor.whatsapp, message)
        results.push({ vendorId, sent: true, phone: vendor.whatsapp })
        console.log(`WhatsApp sent to ${vendor.name} (${vendor.whatsapp})`)
      } catch (err) {
        if (err.circuitOpen) {
          console.warn(`WhatsApp circuit breaker open — skipping notification for ${vendor.name}`)
        } else {
          console.error(`WhatsApp failed for ${vendor.name}:`, err.message)
        }
        // Queue for retry later
        enqueueDeadLetter({
          type: 'whatsapp',
          userId: vendorId,
          orderId: order.id,
          phone: vendor.whatsapp,
          message,
          error: err.message,
        })
        results.push({ vendorId, sent: false, reason: err.message })
      }
    } else {
      // Development: log the message and generate a wa.me link
      const phone = formatPhone(vendor.whatsapp)
      const waLink = `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(message)}`
      console.log(`\n📱 WhatsApp notification for ${vendor.name}:`)
      console.log(`   To: ${vendor.whatsapp}`)
      console.log(`   Link: ${waLink}`)
      console.log(`   Message preview:\n${message}\n`)
      results.push({ vendorId, sent: true, phone: vendor.whatsapp, link: waLink, dev: true })
    }
  }

  return results
}
