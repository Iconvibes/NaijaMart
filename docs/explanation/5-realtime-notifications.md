# Real-time Notifications

How NaijaMart delivers notifications via Socket.io, WhatsApp, and email.

## Notification Channels

| Channel | When | Audience | Reliability |
|---------|------|----------|-------------|
| **Socket.io** | New order, status change, review | Vendors, admins | Real-time (if connected) |
| **WhatsApp** | New order placed | Vendors | Retry + circuit breaker + DLQ |
| **Email** | Order confirmation, shipping update, vendor approval | Customers, vendors | Retry + circuit breaker + DLQ |
| **In-app** | All events | All users | Persisted in DB |

## Socket.io Architecture

### Server Setup (`server/services/realtime.js`)

```javascript
io = new Server(server, { cors: { origin: allowedOrigins } })

// Auth middleware: verify JWT on connection
io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  const payload = jwt.verify(token, JWT_SECRET)
  socket.userId = payload.id
  socket.userRole = payload.role
  next()
})
```

### Room-based Targeting

```
user:<userId>    → Individual user notifications
admins           → Admin-only notifications
```

When a vendor connects, they join `user:<theirId>`. When an admin connects, they also join `admins`.

### Client Connection (`src/hooks/useSocket.js`)

```javascript
socket = io(window.location.origin, { auth: { token } })

socket.on('notification', (data) => {
  // Update UI state
  // Show browser notification if permitted
  if (Notification.permission === 'granted') {
    new Notification('NaijaMart', { body: data.message })
  }
})
```

### Notification Flow

```
Order placed → notifyVendors() [WhatsApp] + notifyUser() [Socket.io] + sendOrderConfirmation() [Email]
                         ↓                    ↓                              ↓
                    WhatsApp API        Socket.io room              Resend API
                         ↓                    ↓                              ↓
                    Retry + DLQ         Direct push                 Retry + DLQ
```

All three channels fire independently and concurrently. Failure in one doesn't affect the others.

## In-App Notifications

Every notification is also persisted in the `notifications` collection:

```javascript
async function notifyUser(userId, { type, message, link }) {
  // Save to database
  const notification = await repo.createNotification({ userId, type, message, link })

  // Emit via Socket.io if connected
  if (io) {
    io.to(`user:${userId}`).emit('notification', { ... })
  }

  return notification
}
```

The client fetches notifications via `GET /api/notifications` and shows unread count via `GET /api/notifications/count`.

## WhatsApp Integration

When an order is placed:

1. Group items by vendor
2. For each vendor with a `whatsapp` number on their profile:
   - Build a formatted message with order details, items, subtotal, and Seller Center link
   - Send via WhatsApp Cloud API
   - If not configured: log a `wa.me` link to console

**Resilience:**
- Retry: 2 retries with 2s base delay
- Circuit breaker: opens after 5 failures, cools down for 120s
- Timeout: 10 seconds per request
- Dead letter queue: failed messages are stored for later retry

## Email Integration

Emails are sent for:

| Event | Recipient | When |
|-------|-----------|------|
| Order placed | Customer | Immediately after order creation |
| Status changed | Customer | On processing/shipped/delivered |
| Vendor approved | Vendor | Admin approves application |
| Vendor rejected | Vendor | Admin rejects application |
| Payout processed | Vendor | Admin marks withdrawal as paid |

**Important:** Customer email is collected at checkout. Guest orders without email skip email notifications.

**Resilience:**
- Retry: 2 retries with 2s base delay
- Circuit breaker: opens after 5 failures, cools down for 120s
- Timeout: 15 seconds per request
- Dead letter queue: failed emails stored for retry

## Browser Notifications

The client requests `Notification.permission` and shows native browser notifications when a Socket.io event arrives. This works even when the tab is not focused.

## Why Three Channels?

1. **Socket.io** — Instant feedback in the app (order appeared, status changed)
2. **WhatsApp** — Vendors check WhatsApp more than web dashboards (Nigeria market)
3. **Email** — Permanent record for customers (order confirmation, receipts)
4. **In-app** — Persistent notifications that survive page refreshes

Each channel is independent. The app works fully without any of them configured.
