import StaticPage from '../StaticPage'

export default function AboutPage() {
  return (
    <StaticPage title="About NaijaMart" subtitle="Nigeria's online marketplace for everyone">
      <h2 className="text-base font-black text-secondary mb-3">Our Story</h2>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        NaijaMart was founded with a simple mission: make online shopping accessible, affordable, and trustworthy for every Nigerian. We connect buyers with verified sellers across the country, offering everything from electronics and fashion to groceries and home goods.
      </p>

      <h2 className="text-base font-black text-secondary mb-3">What We Offer</h2>
      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
        <li><strong>Multi-vendor marketplace</strong> — Thousands of sellers competing for your attention with the best prices</li>
        <li><strong>Buyer protection</strong> — Your payment is held in escrow until your order is delivered and verified</li>
        <li><strong>Free delivery</strong> — On orders above ₦50,000 to anywhere in Nigeria</li>
        <li><strong>Flexible payment</strong> — Pay with card, bank transfer, or cash on delivery</li>
        <li><strong>14-day returns</strong> — Not satisfied? Get your money back within 14 days</li>
      </ul>

      <h2 className="text-base font-black text-secondary mb-3 mt-6">For Sellers</h2>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        NaijaMart gives you access to millions of Nigerian shoppers. List your products, manage orders from your Seller Center, and get paid reliably after the return window closes. We handle the payments infrastructure so you can focus on what you sell best.
      </p>

      <div className="bg-background rounded-lg p-4 mt-4">
        <p className="text-sm text-gray-600">
          <strong>Ready to sell?</strong>{' '}
          <a href="/register" className="text-primary font-bold hover:underline">Create a vendor account</a> and start listing your products today.
        </p>
      </div>
    </StaticPage>
  )
}
