import { useEffect, useState } from 'react'
import { CloseIcon } from './Icons'

const DISMISS_KEY = 'naijamart_pwa_dismissed'

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if already dismissed
    if (localStorage.getItem(DISMISS_KEY)) return

    // Detect iOS (no beforeinstallprompt on iOS)
    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(ios)

    if (ios) {
      // On iOS, show the manual install instructions
      if (!window.navigator.standalone) {
        setShow(true)
      }
      return
    }

    // Android/Chrome: listen for the beforeinstallprompt event
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Also check if already installed
    window.addEventListener('appinstalled', () => {
      setShow(false)
      setDeferredPrompt(null)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShow(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  if (!show) return null

  return (
    <div className="fixed bottom-16 lg:bottom-4 left-4 right-4 z-[70] max-w-lg mx-auto">
      <div className="bg-secondary text-white rounded-xl shadow-2xl overflow-hidden">
        <div className="p-4 flex items-start gap-3">
          <span className="text-2xl shrink-0">📱</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black">Install NaijaMart</p>
            {isIOS ? (
              <div className="text-[11px] text-white/80 mt-1 space-y-1">
                <p>Tap the <strong>Share</strong> button below, then <strong>&quot;Add to Home Screen&quot;</strong></p>
                <p className="text-[10px] text-white/60">Safari → Share icon → Add to Home Screen</p>
              </div>
            ) : (
              <p className="text-[11px] text-white/80 mt-1">
                Add to your home screen for faster access and offline support
              </p>
            )}
          </div>
          <button onClick={handleDismiss} className="p-1 text-white/60 hover:text-white shrink-0" aria-label="Dismiss">
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
        {!isIOS && (
          <div className="px-4 pb-4 flex gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 bg-primary text-white text-xs font-bold rounded-lg py-2.5 hover:bg-primary/90 transition-colors"
            >
              Install App
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs font-semibold text-white/70 px-3 py-2.5 hover:text-white transition-colors"
            >
              Not now
            </button>
          </div>
        )}
        {isIOS && (
          <div className="px-4 pb-4">
            <button
              onClick={handleDismiss}
              className="w-full text-xs font-semibold text-white/70 px-3 py-2 hover:text-white transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
