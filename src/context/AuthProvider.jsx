import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext'
import { api, fetchCsrfToken } from '../api'

/**
 * AuthProvider uses HttpOnly cookies for JWT authentication.
 *
 * - No tokens are stored in localStorage (XSS protection).
 * - The JWT lives in an HttpOnly Secure SameSite cookie set by the server.
 * - A CSRF synchronizer token lives in a readable cookie (_csrf) set by the server.
 * - On boot, we fetch a CSRF token and validate the session via GET /api/auth/me.
 * - On login/register, the server sets both cookies automatically.
 * - On logout, we call POST /api/auth/logout to clear both cookies.
 */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // True while we validate the session cookie on boot
  const [initializing, setInitializing] = useState(true)

  // On boot: fetch CSRF token and validate existing session cookie
  useEffect(() => {
    let alive = true

    async function init() {
      try {
        // Fetch a CSRF token — sets the _csrf cookie for state-changing requests
        await fetchCsrfToken()
      } catch {
        // CSRF fetch failed — proceed anyway, we'll get one after login
      }

      try {
        // Check if there's a valid session cookie (HttpOnly JWT)
        // credentials: 'include' sends the cookie automatically
        const { user: fresh } = await api.me()
        if (!alive) return
        setUser(fresh)
      } catch {
        if (!alive) return
        setUser(null)
      } finally {
        if (alive) setInitializing(false)
      }
    }

    init()
    return () => { alive = false }
  }, [])

  const login = async (email, password) => {
    const { user: fresh } = await api.login(email, password)
    // Server sets HttpOnly JWT cookie + _csrf cookie
    // Fetch a fresh CSRF token to ensure it's in sync
    await fetchCsrfToken().catch(() => {})
    setUser(fresh)
    return fresh
  }

  const register = async (payload) => {
    const { user: fresh } = await api.register(payload)
    // Server sets HttpOnly JWT cookie + _csrf cookie
    await fetchCsrfToken().catch(() => {})
    setUser(fresh)
    return fresh
  }

  const logout = async () => {
    try {
      await api.logout()
    } catch {
      // Logout API may fail (e.g. network), but we clear local state regardless
    }
    // Server clears HttpOnly JWT cookie + _csrf cookie
    // Also clear CSRF cookie client-side for immediate effect
    document.cookie = '_csrf=; Path=/; Max-Age=0; SameSite=Lax'
    setUser(null)
  }

  const value = useMemo(
    () => ({ user, initializing, login, register, logout }),
    [user, initializing]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
