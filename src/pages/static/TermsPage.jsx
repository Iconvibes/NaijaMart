import StaticPage from '../StaticPage'

export default function TermsPage() {
  return (
    <StaticPage title="Terms & Conditions" subtitle="Last updated: August 2026">
      <h2 className="text-base font-black text-secondary mb-3">1. Acceptance of Terms</h2>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        By accessing or using NaijaMart ("the Platform"), you agree to be bound by these Terms & Conditions. If you do not agree, please do not use the Platform.
      </p>

      <h2 className="text-base font-black text-secondary mb-3">2. Account Registration</h2>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your login credentials. Vendors must provide valid business information and a WhatsApp number for order notifications.
      </p>

      <h2 className="text-base font-black text-secondary mb-3">3. Orders & Payments</h2>
      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 mb-4">
        <li>All orders are subject to product availability</li>
        <li>Prices are set by individual vendors and may change without notice</li>
        <li>Payment is collected at checkout and held in escrow until delivery</li>
        <li>Card and bank transfer payments are captured immediately; cash-on-delivery is captured upon courier handoff</li>
        <li>The platform charges a 10% commission on each sale, deducted from the seller's share</li>
      </ul>

      <h2 className="text-base font-black text-secondary mb-3">4. Returns & Refunds</h2>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        Buyers may request a return within 14 days of delivery. Refunds are processed back to the original payment method. Sellers are not paid for refunded line items. See our{' '}
        <a href="/returns" className="text-primary font-bold hover:underline">Returns Policy</a> for full details.
      </p>

      <h2 className="text-base font-black text-secondary mb-3">5. Seller Obligations</h2>
      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 mb-4">
        <li>Accurately describe products and pricing</li>
        <li>Dispatch orders within the stated handling time</li>
        <li>Maintain adequate stock for listed products</li>
        <li>Comply with all applicable Nigerian trade and consumer protection laws</li>
      </ul>

      <h2 className="text-base font-black text-secondary mb-3">6. Limitation of Liability</h2>
      <p className="text-sm text-gray-600 leading-relaxed">
        NaijaMart acts as an intermediary between buyers and sellers. We are not a party to the transaction between buyer and seller, except as the payment processor and escrow agent. Our liability is limited to the commission collected on any given transaction.
      </p>
    </StaticPage>
  )
}
