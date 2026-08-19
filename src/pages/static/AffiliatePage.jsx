import StaticPage from '../StaticPage'

export default function AffiliatePage() {
  return (
    <StaticPage title="Affiliate Program" subtitle="Earn money by referring customers to NaijaMart">
      <h2 className="text-base font-black text-secondary mb-3">How It Works</h2>
      <ol className="list-decimal pl-5 space-y-3 text-sm text-gray-600 mb-6">
        <li>
          <strong>Sign up</strong> — Register as an affiliate and get your unique referral link
        </li>
        <li>
          <strong>Share</strong> — Post your link on social media, blogs, WhatsApp groups, or anywhere
        </li>
        <li>
          <strong>Earn</strong> — Get <strong>5% commission</strong> on every qualifying purchase made through your link
        </li>
        <li>
          <strong>Get paid</strong> — Commissions are paid out monthly via bank transfer
        </li>
      </ol>

      <h2 className="text-base font-black text-secondary mb-3">Commission Structure</h2>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 font-bold text-secondary">Tier</th>
              <th className="px-4 py-2 font-bold text-secondary">Monthly Sales</th>
              <th className="px-4 py-2 font-bold text-secondary">Commission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-4 py-2 text-gray-600">Starter</td>
              <td className="px-4 py-2 text-gray-600">Under ₦500,000</td>
              <td className="px-4 py-2 text-gray-600 font-bold">5%</td>
            </tr>
            <tr>
              <td className="px-4 py-2 text-gray-600">Pro</td>
              <td className="px-4 py-2 text-gray-600">₦500,000 – ₦2,000,000</td>
              <td className="px-4 py-2 text-gray-600 font-bold">7%</td>
            </tr>
            <tr>
              <td className="px-4 py-2 text-gray-600">Elite</td>
              <td className="px-4 py-2 text-gray-600">Above ₦2,000,000</td>
              <td className="px-4 py-2 text-gray-600 font-bold">10%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-base font-black text-secondary mb-3">Benefits</h2>
      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 mb-4">
        <li>No listing fees — it's completely free to join</li>
        <li>Real-time tracking dashboard</li>
        <li>Access to marketing materials and banners</li>
        <li>Dedicated affiliate support</li>
        <li>Monthly payouts with no minimum threshold</li>
      </ul>

      <div className="bg-background rounded-lg p-4">
        <p className="text-sm text-gray-600">
          Ready to start earning? Email{' '}
          <a href="mailto:affiliates@naijamart.com" className="text-primary font-bold hover:underline">affiliates@naijamart.com</a>{' '}
          with your name and social media handles to get your referral link.
        </p>
      </div>
    </StaticPage>
  )
}
