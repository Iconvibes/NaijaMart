import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const demoAccounts = [
  { role: 'Admin', email: 'admin@naijamart.com', password: 'admin123' },
  { role: 'Vendor', email: 'techhub.ng@naijamart.com', password: 'vendor123' },
]

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const from = location.state?.from || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user = await login(email.trim(), password)
      const dest = user.role === 'admin' ? '/admin' : user.role === 'vendor' ? '/vendor' : from
      navigate(dest, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const fillDemo = (demo) => {
    setEmail(demo.email)
    setPassword(demo.password)
    setError('')
  }

  return (
    <div className="max-w-md mx-auto px-4 mt-8 mb-10">
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="bg-secondary px-4 py-3">
          <h1 className="text-white text-base font-black">Welcome back</h1>
          <p className="text-white/70 text-xs mt-0.5">Log in to shop or manage your store</p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <p className="bg-danger/10 border border-danger/30 text-danger text-xs font-semibold rounded px-3 py-2">
              {error}
            </p>
          )}

          <label className="block">
            <span className="text-xs font-bold text-secondary mb-1 block">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded text-sm px-3 py-2.5 outline-none focus:border-primary"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-secondary mb-1 block">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded text-sm px-3 py-2.5 outline-none focus:border-primary"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-primary text-white text-sm font-black rounded py-3 hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {busy ? 'Logging in...' : 'Login'}
          </button>

          <p className="text-xs text-gray-500 text-center">
            New to NaijaMart?{' '}
            <Link to="/register" className="text-primary font-bold hover:underline">Create an account</Link>
          </p>
        </form>

        {/* demo accounts for quick testing */}
        <div className="border-t border-gray-100 bg-background px-5 py-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-2">Demo accounts</p>
          <div className="flex gap-2">
            {demoAccounts.map((d) => (
              <button
                key={d.role}
                type="button"
                onClick={() => fillDemo(d)}
                className="flex-1 bg-white border border-gray-200 rounded px-2 py-2 text-left hover:border-primary transition-colors"
              >
                <span className="block text-[11px] font-black text-secondary">{d.role}</span>
                <span className="block text-[9px] text-gray-500 truncate">{d.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
