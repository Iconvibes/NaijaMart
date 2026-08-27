import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../context/useAuth'

// Singleton socket — shared across hook instances
let socket = null

export function useSocket() {
  const { user } = useAuth()
  const [connected, setConnected] = useState(false)
  const [lastNotification, setLastNotification] = useState(null)

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect()
        socket = null
      }
      return
    }

    if (socket?.connected) return

    // Use withCredentials to send HttpOnly JWT cookie with the handshake.
    // The server reads the token from the cookie header.
    socket = io(window.location.origin, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('notification', (data) => {
      setLastNotification(data)
      // Show a browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification('NaijaMart', { body: data.message, icon: '/favicon.svg' })
      }
    })

    return () => {
      if (socket) {
        socket.disconnect()
        socket = null
      }
    }
  }, [user])

  return { connected, lastNotification }
}
