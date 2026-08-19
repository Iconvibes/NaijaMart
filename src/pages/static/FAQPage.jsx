import { useState } from 'react'
import StaticPage from '../StaticPage'

const faqs = [
  { q: 'How do I place an order?', a: 'Browse products, add items to your cart, and proceed to checkout. Fill in your delivery details, choose a payment method, and click "Place Order". You don\'t need an account to shop.' },
  { q: 'Can I change my order after placing it?', a: 'You can cancel an order while it\'s still in "pending" status from your order tracking page. Once a seller has dispatched the item, changes are no longer possible.' },
  { q: 'How do I track my order?', a: 'Go to Track Your Order and enter your order ID and the phone number you used at checkout. You\'ll see the current status, from order placed to delivered.' },
  { q: 'When do I get my refund?', a: 'Refunds are processed within 5–7 business days after the returned item is received. Card and transfer payments go back to the original payment method.' },
  { q: 'Is my payment secure?', a: 'Yes. All payments are held in escrow by NaijaMart. Sellers only receive payment after the 7-day return window has passed following delivery.' },
  { q: 'How do I become a seller?', a: 'Click "Become a Seller" in the top navigation, fill in your details including your WhatsApp number, and you\'ll have instant access to your Seller Center.' },
  { q: 'What fees does NaijaMart charge?', a: 'Listing is free. We charge a 10% commission on each sale, deducted from the seller\'s share before payout.' },
  { q: 'How do multi-seller orders work?', a: 'When your cart has items from different sellers, each seller ships to the NaijaMart warehouse. Once all items arrive, we consolidate and deliver as one package.' },
  { q: 'What payment methods are accepted?', a: 'We accept debit/credit cards (Visa, Mastercard, Verve), bank transfers, and cash on delivery in select cities.' },
  { q: 'How do I contact support?', a: 'Call us at 0700 000 0000, email support@naijamart.com, or WhatsApp us. See our Contact Us page for hours and details.' },
]

export default function FAQPage() {
  const [open, setOpen] = useState(null)

  return (
    <StaticPage title="Frequently Asked Questions" subtitle="Quick answers to common questions">
      <div className="space-y-2 -mx-2">
        {faqs.map((faq, i) => (
          <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-background/50 transition-colors"
            >
              <span className="text-sm font-bold text-secondary">{faq.q}</span>
              <span className="text-gray-400 text-lg shrink-0">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && (
              <div className="px-4 pb-3 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-2">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </StaticPage>
  )
}
