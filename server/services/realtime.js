import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../middleware/auth.js'
import { repo } from '../store.js'

let io = null

export function initSocket(server) {
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  })

  // Auth middleware: verify JWT on connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Authentication required'))
    try {
      const payload = jwt.verify(token, JWT_SECRET)
      socket.userId = payload.id
      socket.userRole = payload.role
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    // Join a room named after the user's ID so we can target them
    socket.join(`user:${socket.userId}`)

    // Admins also join the admin room
    if (socket.userRole === 'admin') {
      socket.join('admins')
    }

    socket.on('disconnect', () => {
      socket.leave(`user:${socket.userId}`)
    })
  })

  return io
}

export function getIO() {
  return io
}

// Helper: send a notification to a specific user (persisted + realtime)
export async function notifyUser(userId, { type, message, link }) {
  // Save to database
  const notification = await repo.createNotification({ userId, type, message, link })

  // Emit via Socket.io if connected
  if (io) {
    io.to(`user:${userId}`).emit('notification', {
      id: notification.id,
      type,
      message,
      link,
      createdAt: notification.createdAt,
    })
  }

  return notification
}

// Helper: send a notification to all admins
export async function notifyAdmins({ type, message, link }) {
  if (io) {
    io.to('admins').emit('notification', {
      type,
      message,
      link,
      createdAt: new Date().toISOString(),
    })
  }
}
