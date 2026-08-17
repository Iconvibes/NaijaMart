import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/useCart'
import { formatNaira } from '../data/catalog'
import { CartIcon, CloseIcon, MinusIcon, PlusIcon, TrashIcon, TruckIcon } from './Icons'

export default function CartDrawer() {
  const navigate = useNavigate()
  const { items, cartCount, cartTotal, savings, isOpen, closeCart, updateQty, removeFromCart } =
    useCart()

  const goToCheckout = () => {
    closeCart()
    navigate('/checkout')
  }

  // lock page scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <div className={`fixed inset-0 z-[60] ${isOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
      {/* overlay */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={closeCart}
      />

      {/* panel */}
      <aside
        role="dialog"
        aria-label="Shopping cart"
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-base font-black text-secondary">
            My Cart{' '}
            <span className="text-sm font-medium text-gray-400">
              ({cartCount} {cartCount === 1 ? 'item' : 'items'})
            </span>
          </h2>
          <button
            onClick={closeCart}
            className="p-1.5 text-secondary hover:bg-background rounded"
            aria-label="Close cart"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {items.length === 0 ? (
          /* empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
            <span className="bg-background rounded-full p-5">
              <CartIcon className="w-10 h-10 text-gray-400" />
            </span>
            <p className="font-bold text-secondary">Your cart is empty</p>
            <p className="text-xs text-gray-500">Browse the store and add items to your cart.</p>
            <button
              onClick={closeCart}
              className="mt-2 bg-primary text-white text-sm font-bold rounded px-6 py-2.5 hover:bg-primary/90 transition-colors"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <>
            {/* items */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {items.map(({ product, qty }) => (
                <div key={product.id} className="flex gap-3 p-4">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-20 h-24 object-cover rounded border border-gray-100 bg-background"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-medium text-secondary leading-snug line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">{product.vendor}</p>

                    <div className="flex items-center justify-between mt-2">
                      {/* quantity stepper */}
                      <div className="flex items-center border border-gray-300 rounded">
                        <button
                          onClick={() => updateQty(product.id, qty - 1)}
                          disabled={qty <= 1}
                          className="p-1.5 text-secondary hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Decrease quantity"
                        >
                          <MinusIcon className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold">{qty}</span>
                        <button
                          onClick={() => updateQty(product.id, qty + 1)}
                          className="p-1.5 text-secondary hover:bg-background"
                          aria-label="Increase quantity"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-black text-secondary">
                        {formatNaira(product.price * qty)}
                      </span>
                    </div>
                    {product.oldPrice && (
                      <p className="text-[10px] text-gray-400 line-through mt-0.5">
                        {formatNaira(product.oldPrice * qty)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeFromCart(product.id)}
                    className="self-start p-1 text-gray-400 hover:text-danger"
                    aria-label={`Remove ${product.name}`}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* footer */}
            <div className="border-t border-gray-200 p-4 space-y-3">
              {savings > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">You're saving</span>
                  <span className="text-accent font-bold">{formatNaira(savings)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-medium text-secondary">Subtotal</span>
                <span className="text-xl font-black text-secondary">{formatNaira(cartTotal)}</span>
              </div>
              <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                <TruckIcon className="w-3.5 h-3.5 text-accent" />
                Free delivery on orders over ₦50,000
              </p>
              <button
                onClick={goToCheckout}
                className="w-full bg-primary text-white text-sm font-black rounded py-3 hover:bg-primary/90 transition-colors"
              >
                Checkout ({cartCount} {cartCount === 1 ? 'item' : 'items'})
              </button>
              <button
                onClick={closeCart}
                className="w-full text-xs font-semibold text-secondary border border-gray-300 rounded py-2.5 hover:bg-background transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
