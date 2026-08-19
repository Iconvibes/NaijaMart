import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { categoryOptions, categories, slugify } from '../data/catalog'
import { useCart } from '../context/useCart'
import { useAuth } from '../context/useAuth'
import { useAsync } from '../hooks/useAsync'
import { api } from '../api'
import { CartIcon, MenuIcon, SearchIcon, ChevronDownIcon, TruckIcon, PhoneIcon, ShieldIcon, BellIcon } from './Icons'

const Logo = () => (
  <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="NaijaMart home">
    <span className="bg-primary text-white font-black text-xl rounded-md w-9 h-9 grid place-items-center">
      N
    </span>
    <span className="hidden sm:block text-xl font-black tracking-tight text-secondary">
      Naija<span className="text-primary">Mart</span>
    </span>
  </Link>
)

const desktopNavLinks = [
  ...categories.map((c) => ({ label: c.name, to: `/category/${c.slug}` })),
  { label: 'Deals of the Day', to: '/deals' },
]

function NotificationBell() {
  const { data } = useAsync(
    useCallback(() => api.notificationCount(), [])
  )
  const count = data?.count || 0

  return (
    <Link to="/notifications" className="relative text-secondary hover:text-primary" aria-label="Notifications">
      <BellIcon className="w-6 h-6" />
      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-danger text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] grid place-items-center px-1">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}

export default function TopNav() {
  const { cartCount, openCart } = useCart()
  const { user, logout } = useAuth()
  const [category, setCategory] = useState(categoryOptions[0])
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const dashboardFor = user && user.role !== 'customer' ? (user.role === 'admin' ? '/admin' : '/vendor') : null

  const handleSearch = (e) => {
    e.preventDefault()
    const q = query.trim()
    if (q) {
      navigate(`/shop?q=${encodeURIComponent(q)}`)
    } else if (category !== 'All Categories') {
      navigate(`/category/${slugify(category)}`)
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* slim top strip */}
      <div className="hidden md:block bg-secondary text-white/90 text-xs">
        <div className="max-w-7xl mx-auto px-4 h-8 flex items-center gap-6">
          <a href="tel:07000000000" className="hover:text-primary flex items-center gap-1.5"><PhoneIcon className="w-3.5 h-3.5" /> 0700 000 0000</a>
          <Link to="/track-order" className="hover:text-primary">Track Your Order</Link>
          <Link to="/shop" className="hover:text-primary">Help Center</Link>
          <span className="ml-auto flex items-center gap-1.5"><ShieldIcon className="w-3.5 h-3.5 text-accent" /> 100% Buyer Protection</span>
          <span className="flex items-center gap-1.5"><TruckIcon className="w-3.5 h-3.5 text-accent" /> Free delivery on ₦50,000+</span>
        </div>
      </div>

      {/* main bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 md:gap-6">
        {/* mobile hamburger */}
        <button
          className="lg:hidden p-2 -ml-2 text-secondary"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Open menu"
        >
          <MenuIcon className="w-6 h-6" />
        </button>

        <Logo />

        {/* search - full width row on mobile */}
        <form
          onSubmit={handleSearch}
          className="flex-1 flex bg-white border-2 border-primary rounded-md overflow-hidden max-w-2xl"
        >
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="hidden sm:block w-44 text-xs text-secondary bg-background px-3 py-2.5 border-r border-gray-300 outline-none cursor-pointer"
            aria-label="Search category"
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, brands and categories"
            className="flex-1 px-3 py-2.5 text-sm outline-none min-w-0"
            aria-label="Search products"
          />
          <button type="submit" className="bg-primary text-white px-4 sm:px-6 flex items-center gap-2 hover:bg-primary/90 transition-colors" aria-label="Search">
            <SearchIcon className="w-4 h-4" />
            <span className="hidden md:inline text-sm font-semibold">Search</span>
          </button>
        </form>

        {/* right actions */}
        <div className="hidden lg:flex items-center gap-4 shrink-0">
          {user ? (
            <div className="flex items-center gap-3">
              <NotificationBell />
              {dashboardFor ? (
                <Link to={dashboardFor} className="flex items-center gap-2 text-sm font-semibold text-secondary hover:text-primary whitespace-nowrap">
                  {user.logo && <img src={user.logo} alt="" className="w-6 h-6 rounded-full" />}
                  <span>Hello, {user.name.split(' ')[0]}</span>
                </Link>
              ) : (
                <span className="text-sm font-semibold text-secondary">Hello, {user.name.split(' ')[0]}</span>
              )}
              <Link to="/account" className="text-xs font-semibold text-secondary hover:text-primary">Account</Link>
              <button
                onClick={() => {
                  logout()
                  navigate('/')
                }}
                className="text-xs font-semibold text-secondary hover:text-danger"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/register" className="text-sm font-semibold text-secondary hover:text-primary whitespace-nowrap">
                Become a Seller
              </Link>
              <Link to="/login" className="text-sm font-semibold text-secondary hover:text-primary whitespace-nowrap">
                Login
              </Link>
            </div>
          )}
          <button onClick={openCart} className="flex items-center gap-2 text-secondary hover:text-primary" aria-label="Cart">
            <span className="relative">
              <CartIcon className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-danger text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] grid place-items-center px-1">
                  {cartCount}
                </span>
              )}
            </span>
            <span className="text-sm">Cart</span>
          </button>
        </div>

        {/* mobile cart */}
        {user && (
          <Link to="/notifications" className="lg:hidden relative text-secondary" aria-label="Notifications">
            <BellIcon className="w-6 h-6" />
          </Link>
        )}
        <button onClick={openCart} className="lg:hidden relative text-secondary" aria-label="Cart">
          <CartIcon className="w-6 h-6" />
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-danger text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] grid place-items-center px-1">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* desktop category nav */}
      <nav className="hidden lg:block bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-6 text-[13px] font-medium text-secondary">
          <Link to="/shop" className="flex items-center gap-2 py-2.5 text-primary font-bold">
            <ChevronDownIcon className="w-4 h-4" />
            Categories
          </Link>
          {desktopNavLinks.map((l) => (
            <Link key={l.to} to={l.to} className="py-2.5 hover:text-primary whitespace-nowrap">{l.label}</Link>
          ))}
        </div>
      </nav>

      {/* mobile slide-down menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-2 text-sm font-medium">
          <Link to="/shop" className="block py-2 border-b border-gray-100">All Categories</Link>
          {categories.map((c) => (
            <Link key={c.slug} to={`/category/${c.slug}`} className="block py-2 border-b border-gray-100">
              {c.name}
            </Link>
          ))}
          <Link to="/deals" className="block py-2 border-b border-gray-100">Deals of the Day</Link>
          <div className="pt-1 space-y-1">
            {user ? (
              <>
                <Link to="/account" className="block py-2 border-b border-gray-100">My Account</Link>
                {dashboardFor && (
                  <Link to={dashboardFor} className="block py-2 border-b border-gray-100">
                    Seller Dashboard
                  </Link>
                )}
                <button
                  onClick={() => {
                    logout()
                    navigate('/')
                  }}
                  className="block w-full text-left py-2 text-danger font-bold"
                >
                  Logout ({user.name.split(' ')[0]})
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block py-2 border-b border-gray-100">Login</Link>
                <Link to="/register" className="block py-2">Become a Seller</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
