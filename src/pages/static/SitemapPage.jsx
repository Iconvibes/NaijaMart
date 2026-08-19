import { Link } from 'react-router-dom'
import StaticPage from '../StaticPage'

const sections = [
  {
    title: 'Shop',
    links: [
      { label: 'All Products', to: '/shop' },
      { label: 'Deals of the Day', to: '/deals' },
      { label: 'Phones & Tablets', to: '/category/phones-tablets' },
      { label: 'Electronics', to: '/category/electronics' },
      { label: 'Fashion', to: '/category/fashion' },
      { label: 'Home & Kitchen', to: '/category/home-kitchen' },
      { label: 'Beauty & Health', to: '/category/beauty-health' },
      { label: 'Computers', to: '/category/computers' },
      { label: 'Supermarket', to: '/category/supermarket' },
      { label: 'Baby & Toys', to: '/category/baby-toys' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Login', to: '/login' },
      { label: 'Register', to: '/register' },
      { label: 'My Account', to: '/account' },
      { label: 'Track Your Order', to: '/track-order' },
    ],
  },
  {
    title: 'Seller',
    links: [
      { label: 'Become a Vendor', to: '/register' },
      { label: 'Seller Center', to: '/vendor' },
      { label: 'My Products', to: '/vendor/products' },
      { label: 'Add Product', to: '/vendor/add-product' },
      { label: 'My Orders', to: '/vendor/orders' },
      { label: 'Settings', to: '/vendor/settings' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'FAQ', to: '/faq' },
      { label: 'Contact Us', to: '/contact' },
      { label: 'Returns & Refunds', to: '/returns' },
      { label: 'Shipping & Delivery', to: '/shipping' },
      { label: 'Payment Methods', to: '/payments' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About NaijaMart', to: '/about' },
      { label: 'Careers', to: '/careers' },
      { label: 'Terms & Conditions', to: '/terms' },
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Advertise With Us', to: '/advertise' },
      { label: 'Affiliate Program', to: '/affiliate' },
    ],
  },
]

export default function SitemapPage() {
  return (
    <StaticPage title="Sitemap" subtitle="Find any page on NaijaMart">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="text-sm font-black text-secondary uppercase tracking-wide mb-2">{section.title}</h3>
            <ul className="space-y-1.5">
              {section.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-gray-600 hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </StaticPage>
  )
}
