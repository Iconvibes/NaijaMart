import StaticPage from '../StaticPage'

export default function AdvertisePage() {
  return (
    <StaticPage title="Advertise With Us" subtitle="Reach millions of Nigerian shoppers">
      <h2 className="text-base font-black text-secondary mb-3">Why Advertise on NaijaMart?</h2>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        Put your brand in front of millions of active shoppers. NaijaMart offers targeted advertising solutions that drive real sales, not just impressions.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-background rounded-lg p-4">
          <h3 className="text-sm font-bold text-secondary mb-1">🎯 Sponsored Products</h3>
          <p className="text-xs text-gray-600">Feature your products at the top of search results and category pages.</p>
        </div>
        <div className="bg-background rounded-lg p-4">
          <h3 className="text-sm font-bold text-secondary mb-1">🖼️ Banner Ads</h3>
          <p className="text-xs text-gray-600">Display your brand on our homepage banners and category pages.</p>
        </div>
        <div className="bg-background rounded-lg p-4">
          <h3 className="text-sm font-bold text-secondary mb-1">📧 Email Campaigns</h3>
          <p className="text-xs text-gray-600">Reach our subscriber base with targeted email promotions.</p>
        </div>
        <div className="bg-background rounded-lg p-4">
          <h3 className="text-sm font-bold text-secondary mb-1">📱 Push Notifications</h3>
          <p className="text-xs text-gray-600">Send deals directly to users who have installed the NaijaMart app.</p>
        </div>
      </div>

      <h2 className="text-base font-black text-secondary mb-3">Get Started</h2>
      <p className="text-sm text-gray-600 leading-relaxed">
        Contact our partnerships team at{' '}
        <a href="mailto:advertise@naijamart.com" className="text-primary font-bold hover:underline">advertise@naijamart.com</a>{' '}
        or call <a href="tel:07000000000" className="text-primary font-bold hover:underline">0700 000 0000</a> to discuss your advertising needs.
      </p>
    </StaticPage>
  )
}
