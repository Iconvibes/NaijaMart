import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext'
import { api } from '../api'

const TOKEN_KEY = 'naijamart_token'
const USER_KEY = 'naijamart_user'

function loadStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadStoredUser)
  // Only true when a stored token needs re-validating against the API
  const [initializing, setInitializing] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)))

  // On boot, re-validate the stored token against the API
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return
    let alive = true
    api
      .me()
      .then(({ user: fresh }) => {
        if (!alive) return
        setUser(fresh)
        localStorage.setItem(USER_KEY, JSON.stringify(fresh))
      })
      .catch(() => {
        if (!alive) return
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setUser(null)
      })
      .finally(() => {
        if (alive) setInitializing(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const login = async (email, password) => {
    const { token, user: fresh } = await api.login(email, password)
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(fresh))
    setUser(fresh)
    return fresh
  }

  const register = async (payload) => {
    const { token, user: fresh } = await api.register(payload)
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(fresh))
    setUser(fresh)
    return fresh
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }

  const value = useMemo(
    () => ({ user, initializing, login, register, logout }),
    [user, initializing]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
