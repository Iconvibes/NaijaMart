import { Link } from 'react-router-dom'
import StaticPage from '../StaticPage'

export default function ReturnsPage() {
  return (
    <StaticPage title="Returns & Refunds" subtitle="Our 14-day money-back guarantee">
      <h2 className="text-base font-black text-secondary mb-3">Return Policy</h2>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        We want you to love your purchase. If you're not satisfied, you can return most items within <strong>14 days</strong> of delivery for a full refund.
      </p>

      <h2 className="text-base font-black text-secondary mb-3">Eligibility</h2>
      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 mb-4">
        <li>Item must be in its original condition and packaging</li>
        <li>Item must not be used, damaged, or altered by the buyer</li>
        <li>Return request must be submitted within 14 days of delivery</li>
        <li>Some items (perishables, personal care, custom orders) may not be eligible</li>
      </ul>

      <h2 className="text-base font-black text-secondary mb-3">How to Request a Return</h2>
      <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-600 mb-4">
        <li>Go to <Link to="/track-order" className="text-primary font-bold hover:underline">Track Your Order</Link> and find your order</li>
        <li>Select the item(s) you want to return</li>
        <li>Provide a reason for the return</li>
        <li>Our team will review and approve within 2 business days</li>
        <li>You'll receive return shipping instructions</li>
      </ol>

      <h2 className="text-base font-black text-secondary mb-3">Refund Process</h2>
      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 mb-4">
        <li>Refunds are processed within 5–7 business days after we receive the returned item</li>
        <li>Card/transfer payments are refunded to the original payment method</li>
        <li>Cash-on-delivery refunds are processed via bank transfer</li>
        <li>The seller's share is automatically reversed from escrow</li>
      </ul>

      <h2 className="text-base font-black text-secondary mb-3">Damaged or Wrong Items</h2>
      <p className="text-sm text-gray-600 leading-relaxed">
        If you received a damaged or incorrect item, contact us immediately at{' '}
        <a href="mailto:support@naijamart.com" className="text-primary font-bold hover:underline">support@naijamart.com</a>.
        We'll arrange a free return pickup and expedite your refund or replacement.
      </p>
    </StaticPage>
  )
}
