import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../context/useAuth'

export default function VendorSettings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.name || '')
  const [logo, setLogo] = useState(user?.logo || '')
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const { paths } = await api.uploadImages([file])
      if (paths.length > 0) setLogo(paths[0])
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const payload = { name: name.trim(), logo: logo || null, whatsapp: whatsapp || null }
      if (newPassword) {
        payload.currentPassword = currentPassword
        payload.newPassword = newPassword
      }
      const { user: updated } = await api.updateMe(payload)
      // Note: user state will be refreshed on next /me call.
      // No localStorage write needed — JWT lives in HttpOnly cookie.
      setSuccess('Profile updated successfully')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full border border-gray-300 rounded text-xs px-3 py-2.5 outline-none focus:border-primary bg-white'

  return (
    <div className="bg-white rounded-lg shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-black text-secondary">Profile Settings</h2>
        <p className="text-[11px] text-gray-500 mt-0.5">Manage your store name, logo and password</p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4 max-w-lg">
        {error && (
          <p className="bg-danger/10 border border-danger/30 text-danger text-xs font-semibold rounded px-3 py-2">{error}</p>
        )}
        {success && (
          <p className="bg-accent/10 border border-accent/30 text-accent text-xs font-semibold rounded px-3 py-2">{success}</p>
        )}

        {/* logo */}
        <div>
          <span className="text-xs font-bold text-secondary mb-1.5 block">Store Logo</span>
          <div className="flex items-center gap-4">
            {logo ? (
              <img src={logo} alt="Store logo" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
            ) : (
              <span className="w-16 h-16 rounded-lg bg-secondary text-white font-black text-xl grid place-items-center">
                {(user?.name || '?').charAt(0)}
              </span>
            )}
            <label className={`text-xs font-bold text-primary cursor-pointer hover:underline ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploading ? 'Uploading...' : 'Change logo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} />
            </label>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">JPG, PNG or WEBP · max 5 MB</p>
        </div>

        {/* name */}
        <label className="block">
          <span className="text-xs font-bold text-secondary mb-1 block">Store Name</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </label>

        {/* whatsapp number */}
        <div>
          <span className="text-xs font-bold text-secondary mb-1 block">WhatsApp Number</span>
          <p className="text-[10px] text-gray-500 mb-1.5">You'll receive order notifications on this number via WhatsApp</p>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="e.g. 0803 123 4567 or +234 803 123 4567"
            className={inputCls}
          />
        </div>

        {/* password section */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-xs font-black text-secondary mb-3">Change Password</h3>
          <p className="text-[10px] text-gray-500 mb-3">Leave blank to keep your current password</p>

          <label className="block mb-3">
            <span className="text-xs font-bold text-secondary mb-1 block">Current Password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className={inputCls}
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-secondary mb-1 block">New Password</span>
            <input
              type="password"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className={inputCls}
            />
          </label>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={saving || uploading}
            className="bg-primary text-white text-xs font-black rounded px-5 py-2.5 hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
