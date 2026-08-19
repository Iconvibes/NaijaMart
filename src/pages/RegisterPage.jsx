import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('customer')
  const [whatsapp, setWhatsapp] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const payload = { name: name.trim(), email: email.trim(), password, role }
      if (role === 'vendor' && whatsapp.trim()) payload.whatsapp = whatsapp.trim()
      const user = await register(payload)
      navigate(user.role === 'vendor' ? '/vendor' : '/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 mt-8 mb-10">
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="bg-secondary px-4 py-3">
          <h1 className="text-white text-base font-black">Create your account</h1>
          <p className="text-white/70 text-xs mt-0.5">Join NaijaMart as a shopper or a seller</p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <p className="bg-danger/10 border border-danger/30 text-danger text-xs font-semibold rounded px-3 py-2">
              {error}
            </p>
          )}

          <label className="block">
            <span className="text-xs font-bold text-secondary mb-1 block">Full name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Chiamaka Eze"
              className="w-full border border-gray-300 rounded text-sm px-3 py-2.5 outline-none focus:border-primary"
            />
          </label>

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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full border border-gray-300 rounded text-sm px-3 py-2.5 outline-none focus:border-primary"
            />
          </label>

          <div>
            <span className="text-xs font-bold text-secondary mb-1 block">I want to</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'customer', title: 'Shop', sub: 'Buy from the store' },
                { value: 'vendor', title: 'Sell', sub: 'Open a vendor store' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={`border rounded px-3 py-2.5 text-left transition-colors ${
                    role === opt.value
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-300 bg-white hover:border-primary'
                  }`}
                >
                  <span className={`block text-sm font-black ${role === opt.value ? 'text-primary' : 'text-secondary'}`}>
                    {opt.title}
                  </span>
                  <span className="block text-[10px] text-gray-500">{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {role === 'vendor' && (
            <label className="block">
              <span className="text-xs font-bold text-secondary mb-1 block">WhatsApp Number (for order notifications)</span>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="e.g. 0803 123 4567"
                className="w-full border border-gray-300 rounded text-sm px-3 py-2.5 outline-none focus:border-primary"
              />
            </label>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-primary text-white text-sm font-black rounded py-3 hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {busy ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-bold hover:underline">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
