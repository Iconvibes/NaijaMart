const columns = [
  {
    title: 'About NaijaMart',
    links: ['About Us', 'Careers', 'Terms & Conditions', 'Privacy Policy', 'Sitemap'],
  },
  {
    title: 'Help',
    links: ['Track Your Order', 'Returns & Refunds', 'Shipping & Delivery', 'Payment Methods', 'Contact Us', 'FAQ'],
  },
  {
    title: 'Make Money',
    links: ['Sell on NaijaMart', 'Become a Vendor', 'Vendor Hub', 'Advertise With Us', 'Affiliate Program'],
  },
]

export default function Footer() {
  return (
    <footer className="mt-8 bg-secondary text-white">
      {/* trust strip */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
          <div>
            <p className="font-bold text-accent">FREE DELIVERY</p>
            <p className="text-white/70 mt-0.5">On orders above ₦50,000</p>
          </div>
          <div>
            <p className="font-bold text-accent">SECURE PAYMENT</p>
            <p className="text-white/70 mt-0.5">Card, transfer &amp; on delivery</p>
          </div>
          <div>
            <p className="font-bold text-accent">14 DAYS RETURN</p>
            <p className="text-white/70 mt-0.5">Money-back guarantee</p>
          </div>
          <div>
            <p className="font-bold text-accent">24/7 SUPPORT</p>
            <p className="text-white/70 mt-0.5">We answer day and night</p>
          </div>
        </div>
      </div>

      {/* link columns */}
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-black uppercase tracking-wider mb-3">{col.title}</h3>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l}>
                  <a href="#" className="text-white/75 hover:text-primary text-[13px] transition-colors">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* download app */}
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider mb-3">Download App</h3>
          <p className="text-white/75 text-[13px] mb-3">
            Shop faster on the NaijaMart app - available on iOS and Android.
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="#"
              className="flex items-center justify-center gap-2 border border-white/60 rounded-md px-3 py-2 text-xs font-semibold hover:bg-white hover:text-secondary transition-colors"
            >
              <span className="text-lg leading-none">🍎</span> Download on the App Store
            </a>
            <a
              href="#"
              className="flex items-center justify-center gap-2 border border-white/60 rounded-md px-3 py-2 text-xs font-semibold hover:bg-white hover:text-secondary transition-colors"
            >
              <span className="text-lg leading-none">▶</span> Get it on Google Play
            </a>
          </div>
          <p className="text-white/50 text-[11px] mt-3 leading-relaxed">
            Scan the code in-store or search &quot;NaijaMart&quot; on your app store.
          </p>
        </div>
      </div>

      {/* bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] text-white/60">
          <p>© {new Date().getFullYear()} NaijaMart. All rights reserved.</p>
          <p className="flex items-center gap-3">
            <span>Pay with: Card</span>
            <span>·</span>
            <span>Transfer</span>
            <span>·</span>
            <span>Pay on Delivery</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
