import StaticPage from '../StaticPage'

export default function ContactPage() {
  return (
    <StaticPage title="Contact Us" subtitle="We're here to help">
      <h2 className="text-base font-black text-secondary mb-3">Get in Touch</h2>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-background rounded-lg p-4">
          <h3 className="text-sm font-bold text-secondary mb-2">📞 Phone</h3>
          <a href="tel:07000000000" className="text-primary font-bold text-sm hover:underline">0700 000 0000</a>
          <p className="text-[11px] text-gray-500 mt-1">Monday – Saturday, 8am – 8pm</p>
        </div>

        <div className="bg-background rounded-lg p-4">
          <h3 className="text-sm font-bold text-secondary mb-2">📧 Email</h3>
          <a href="mailto:support@naijamart.com" className="text-primary font-bold text-sm hover:underline">support@naijamart.com</a>
          <p className="text-[11px] text-gray-500 mt-1">We respond within 24 hours</p>
        </div>

        <div className="bg-background rounded-lg p-4">
          <h3 className="text-sm font-bold text-secondary mb-2">💬 WhatsApp</h3>
          <a href="https://wa.me/2347000000000" target="_blank" rel="noopener noreferrer" className="text-primary font-bold text-sm hover:underline">Chat with us</a>
          <p className="text-[11px] text-gray-500 mt-1">Quick responses for urgent issues</p>
        </div>

        <div className="bg-background rounded-lg p-4">
          <h3 className="text-sm font-bold text-secondary mb-2">📍 Office</h3>
          <p className="text-sm text-gray-600">12 Admiralty Way, Lekki Phase 1, Lagos, Nigeria</p>
        </div>
      </div>

      <h2 className="text-base font-black text-secondary mb-3">Common Questions</h2>
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-secondary">Where is my order?</h3>
          <p className="text-xs text-gray-600 mt-1">Track it anytime at <a href="/track-order" className="text-primary font-bold hover:underline">Track Your Order</a>.</p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-secondary">How do I return an item?</h3>
          <p className="text-xs text-gray-600 mt-1">See our <a href="/returns" className="text-primary font-bold hover:underline">Returns & Refunds</a> page for step-by-step instructions.</p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-secondary">I want to sell on NaijaMart</h3>
          <p className="text-xs text-gray-600 mt-1"><a href="/register" className="text-primary font-bold hover:underline">Create a vendor account</a> — it's free to get started.</p>
        </div>
      </div>
    </StaticPage>
  )
}
