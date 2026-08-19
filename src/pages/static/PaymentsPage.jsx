import StaticPage from '../StaticPage'

export default function PaymentsPage() {
  return (
    <StaticPage title="Payment Methods" subtitle="Secure, flexible ways to pay">
      <h2 className="text-base font-black text-secondary mb-3">Accepted Payment Methods</h2>

      <div className="space-y-4 mb-6">
        <div className="bg-background rounded-lg p-4">
          <h3 className="text-sm font-bold text-secondary mb-1">💳 Debit / Credit Card</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Pay instantly with your Visa, Mastercard, or Verve card. Your card is charged immediately and the payment is held in escrow until your order is delivered.
          </p>
        </div>

        <div className="bg-background rounded-lg p-4">
          <h3 className="text-sm font-bold text-secondary mb-1">🏦 Bank Transfer</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Transfer to the NaijaMart account. Your order is confirmed once the transfer is verified (usually within minutes during business hours). Payment is held in escrow.
          </p>
        </div>

        <div className="bg-background rounded-lg p-4">
          <h3 className="text-sm font-bold text-secondary mb-1">💵 Cash on Delivery (COD)</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Pay with cash when your order arrives. Available in select cities. The courier collects payment and your order status updates automatically.
          </p>
        </div>
      </div>

      <h2 className="text-base font-black text-secondary mb-3">How Escrow Works</h2>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        NaijaMart holds your payment securely until you receive and verify your order. Sellers are only paid after the 7-day return window has passed. This protects you from:
      </p>
      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 mb-4">
        <li>Items not being shipped</li>
        <li>Wrong or damaged items</li>
        <li>Items not matching the description</li>
      </ul>

      <h2 className="text-base font-black text-secondary mb-3">Refunds</h2>
      <p className="text-sm text-gray-600 leading-relaxed">
        If you return an item, your refund is processed to the original payment method within 5–7 business days. See our{' '}
        <a href="/returns" className="text-primary font-bold hover:underline">Returns & Refunds</a> policy for details.
      </p>
    </StaticPage>
  )
}
