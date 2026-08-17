import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../context/useCart'
import { useAuth } from '../context/useAuth'
import { CartIcon, GridIcon, HomeIcon, UserIcon } from './Icons'

const items = [
  { label: 'Home', icon: HomeIcon, to: '/' },
  { label: 'Categories', icon: GridIcon, to: '/shop' },
  { label: 'Cart', icon: CartIcon },
  { label: 'Account', icon: UserIcon },
]

export default function MobileBottomNav() {
  const { cartCount, openCart } = useCart()
  const { user } = useAuth()
  const { pathname } = useLocation()

  const accountTo = !user ? '/login' : user.role === 'admin' ? '/admin' : user.role === 'vendor' ? '/vendor' : '/login'

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200">
      <div className="grid grid-cols-4">
        {items.map(({ label, icon: Icon, to }) => {
          const target = label === 'Account' ? accountTo : to
          const active = target
            ? target === '/'
              ? pathname === '/'
              : target === '/login'
                ? false
                : pathname.startsWith(target)
            : false
          const cls = `flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
            active ? 'text-primary' : 'text-secondary'
          }`
          const inner = (
            <>
              <span className="relative">
                <Icon className="w-5 h-5" />
                {label === 'Cart' && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-danger text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] grid place-items-center px-0.5">
                    {cartCount}
                  </span>
                )}
              </span>
              {label}
            </>
          )
          return label === 'Cart' ? (
            <button key={label} onClick={openCart} className={cls} aria-label="Open cart">
              {inner}
            </button>
          ) : (
            <Link key={label} to={target} className={cls}>
              {inner}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
