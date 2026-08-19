import StaticPage from '../StaticPage'

export default function PrivacyPage() {
  return (
    <StaticPage title="Privacy Policy" subtitle="Last updated: August 2026">
      <h2 className="text-base font-black text-secondary mb-3">Information We Collect</h2>
      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 mb-4">
        <li><strong>Account data:</strong> Name, email address, password (hashed), and role (customer/vendor/admin)</li>
        <li><strong>Order data:</strong> Delivery name, phone number, and address provided at checkout</li>
        <li><strong>Vendor data:</strong> WhatsApp number (optional) for order notifications, store logo</li>
        <li><strong>Usage data:</strong> Pages visited, products viewed, and search queries (for improving recommendations)</li>
      </ul>

      <h2 className="text-base font-black text-secondary mb-3">How We Use Your Information</h2>
      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 mb-4">
        <li>Process and fulfil your orders</li>
        <li>Send order status updates and delivery notifications</li>
        <li>Notify vendors of new orders via WhatsApp (if enabled)</li>
        <li>Process payments and manage escrow</li>
        <li>Detect and prevent fraud</li>
        <li>Improve our platform and user experience</li>
      </ul>

      <h2 className="text-base font-black text-secondary mb-3">Data Sharing</h2>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        We share your data only as necessary to fulfil orders. Sellers can see the buyer's name, phone, and delivery address for their items only. Full order details (including other sellers' items and the total) are never exposed to individual vendors.
      </p>

      <h2 className="text-base font-black text-secondary mb-3">Data Security</h2>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        We use industry-standard encryption for data in transit (HTTPS) and at rest. Passwords are hashed with bcrypt. Payment card details are never stored on our servers — all payment processing is handled by our secure payment partner.
      </p>

      <h2 className="text-base font-black text-secondary mb-3">Your Rights</h2>
      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 mb-4">
        <li>Access and update your personal information via your account settings</li>
        <li>Request deletion of your account and associated data</li>
        <li>Opt out of marketing communications at any time</li>
        <li>Request a copy of all data we hold about you</li>
      </ul>

      <h2 className="text-base font-black text-secondary mb-3">Contact</h2>
      <p className="text-sm text-gray-600 leading-relaxed">
        For privacy-related inquiries, contact us at{' '}
        <a href="mailto:privacy@naijamart.com" className="text-primary font-bold hover:underline">privacy@naijamart.com</a>.
      </p>
    </StaticPage>
  )
}
