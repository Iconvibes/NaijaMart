import StaticPage from '../StaticPage'

export default function ShippingPage() {
  return (
    <StaticPage title="Shipping & Delivery" subtitle="How your order gets to you">
      <h2 className="text-base font-black text-secondary mb-3">Delivery Options</h2>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 font-bold text-secondary">Option</th>
              <th className="px-4 py-2 font-bold text-secondary">Timeline</th>
              <th className="px-4 py-2 font-bold text-secondary">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-4 py-2 text-gray-600">Standard Delivery</td>
              <td className="px-4 py-2 text-gray-600">3–5 business days</td>
              <td className="px-4 py-2 text-gray-600">₦1,500 (free above ₦50,000)</td>
            </tr>
            <tr>
              <td className="px-4 py-2 text-gray-600">Express Delivery</td>
              <td className="px-4 py-2 text-gray-600">1–2 business days</td>
              <td className="px-4 py-2 text-gray-600">₦3,000</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-base font-black text-secondary mb-3">How It Works</h2>
      <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-600 mb-4">
        <li><strong>You place an order</strong> — Your items are reserved and payment is collected</li>
        <li><strong>Sellers dispatch</strong> — Each seller ships their items to the NaijaMart warehouse</li>
        <li><strong>We consolidate</strong> — Multi-seller orders are packed into one delivery</li>
        <li><strong>Out for delivery</strong> — Your package is on its way to you</li>
        <li><strong>Delivered</strong> — You receive and verify your order</li>
      </ol>

      <h2 className="text-base font-black text-secondary mb-3">Multi-Seller Orders</h2>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        When your order contains items from multiple sellers, each seller ships independently to our warehouse. Once all items arrive, we consolidate them and deliver as a single package. This means your delivery timeline depends on the slowest seller — but you only pay for one delivery.
      </p>

      <h2 className="text-base font-black text-secondary mb-3">Single-Seller Orders</h2>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        If your order contains items from only one seller, the seller ships directly to you — no warehouse leg, faster delivery.
      </p>

      <h2 className="text-base font-black text-secondary mb-3">Tracking</h2>
      <p className="text-sm text-gray-600 leading-relaxed">
        Track your order anytime at{' '}
        <a href="/track-order" className="text-primary font-bold hover:underline">Track Your Order</a>.
        You'll also receive status updates via email and SMS at each stage.
      </p>
    </StaticPage>
  )
}
