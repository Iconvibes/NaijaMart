import { Link } from 'react-router-dom'
import SEOHead from '../components/SEOHead'

export default function ComingSoonApp() {
  return (
    <>
      <SEOHead
        title="NaijaMart Mobile App — Coming Soon"
        description="The NaijaMart mobile app is coming soon to iOS and Android. Sign up to be notified when it launches."
      />
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          {/* Phone mockup illustration */}
          <div className="relative mx-auto w-48 h-80 mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-[2.5rem] border-2 border-primary/30" />
            <div className="absolute inset-3 bg-white rounded-[2rem] shadow-inner flex flex-col items-center justify-center gap-3 overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-primary/10 grid place-items-center">
                <span className="text-2xl font-black text-primary">N</span>
              </div>
              <p className="text-sm font-black text-secondary">NaijaMart</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-primary/20 animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <p className="text-[10px] text-gray-400 font-medium">Coming Soon</p>
            </div>
            {/* Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-full" />
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-secondary mb-3">
            The NaijaMart App is Coming Soon
          </h1>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed max-w-sm mx-auto">
            We're building something amazing. The NaijaMart mobile app will give you
            a faster, smoother shopping experience with exclusive in-app deals.
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-lg bg-accent/10 grid place-items-center mb-2">
                <span className="text-lg">⚡</span>
              </div>
              <p className="text-[11px] font-semibold text-secondary">Faster Checkout</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-lg bg-accent/10 grid place-items-center mb-2">
                <span className="text-lg">🔔</span>
              </div>
              <p className="text-[11px] font-semibold text-secondary">Real-time Alerts</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-lg bg-accent/10 grid place-items-center mb-2">
                <span className="text-lg">💰</span>
              </div>
              <p className="text-[11px] font-semibold text-secondary">App-Only Deals</p>
            </div>
          </div>

          {/* Coming soon badges */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2.5 bg-white">
              <span className="text-xl">🍎</span>
              <div className="text-left">
                <p className="text-[9px] text-gray-400 leading-none">Download on the</p>
                <p className="text-xs font-bold text-secondary">App Store</p>
              </div>
            </div>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2.5 bg-white">
              <span className="text-xl">▶️</span>
              <div className="text-left">
                <p className="text-[9px] text-gray-400 leading-none">Get it on</p>
                <p className="text-xs font-bold text-secondary">Google Play</p>
              </div>
            </div>
          </div>

          {/* PWA install prompt */}
          <div className="bg-background rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-500 mb-2">
              Don't want to wait? Install NaijaMart as a Progressive Web App right now:
            </p>
            <button
              onClick={() => {
                if (window._deferredInstallPrompt) {
                  window._deferredInstallPrompt.prompt()
                }
              }}
              className="bg-primary text-white text-xs font-bold rounded-lg px-5 py-2.5 hover:bg-primary/90 transition-colors"
            >
              Install NaijaMart Now
            </button>
            <p className="text-[10px] text-gray-400 mt-2">
              Works on Android Chrome, Edge, and Samsung Internet
            </p>
          </div>

          <Link
            to="/"
            className="inline-block text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            ← Back to Shopping
          </Link>
        </div>
      </div>
    </>
  )
}
