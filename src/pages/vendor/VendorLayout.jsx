import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

const tabs = [
  { to: '/vendor/products', label: 'Products' },
  { to: '/vendor/add-product', label: 'Add Product' },
  { to: '/vendor/orders', label: 'Orders' },
  { to: '/vendor/settings', label: 'Settings' },
]

export default function VendorLayout() {
  const { user } = useAuth()

  return (
    <div className="max-w-7xl mx-auto px-4 mt-4 mb-10">
      {/* header */}
      <div className="bg-white rounded-lg shadow-card px-4 py-3 flex items-center gap-3 flex-wrap">
        {user?.logo ? (
          <img src={user.logo} alt={user.name} className="w-10 h-10 rounded-lg" />
        ) : (
          <span className="w-10 h-10 rounded-lg bg-secondary text-white font-black grid place-items-center text-base">
            {(user?.name || '?').charAt(0)}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-sm md:text-base font-black text-secondary truncate">Seller Center</h1>
          <p className="text-[11px] text-gray-500 truncate">{user?.name}</p>
        </div>
        <Link to="/" className="ml-auto text-[11px] font-semibold text-primary hover:underline">View storefront</Link>
      </div>

      <div className="mt-4 grid lg:grid-cols-[200px_1fr] gap-4 items-start">
        {/* sidebar (horizontal scroll tabs on mobile) */}
        <nav className="bg-white rounded-lg shadow-card p-2 flex lg:flex-col gap-1 overflow-x-auto no-scrollbar lg:sticky lg:top-20">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `shrink-0 text-xs font-bold rounded px-3 py-2.5 transition-colors ${
                  isActive ? 'bg-primary/10 text-primary' : 'text-secondary hover:bg-background'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
