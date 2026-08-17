import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { useCart } from '../context/useCart'
import { useAsync } from '../hooks/useAsync'
import { categories, formatNaira, getCategoryBySlug } from '../data/catalog'
import { Stars } from '../components/ProductCard'
import { CartIcon, ShieldIcon, TruckIcon, MinusIcon, PlusIcon } from '../components/Icons'

// Keyed on the route id so navigating between products remounts the page:
// qty and the selected thumbnail reset with no effect-driven state copying.
export function ProductDetailKeyed() {
  const { id } = useParams()
  return <ProductDetail key={id} />
}

export default function ProductDetail() {
  const { id } = useParams()
  const { addToCart } = useCart()
  const { data: product, loading, error, reload } = useAsync(useCallback(() => api.product(id), [id]))
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [mainImg, setMainImg] = useState(null)

  const handleAdd = () => {
    if (!product?.inStock) return
    for (let i = 0; i < qty; i++) addToCart(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-lg shadow-card p-10 text-center text-gray-400 text-sm">Loading product...</div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-lg shadow-card p-10 text-center">
          <p className="text-2xl mb-2">😕</p>
          <p className="font-bold text-secondary mb-1">{error?.message || 'Product not found'}</p>
          <div className="flex gap-3 justify-center mt-3">
            <button
              onClick={reload}
              className="text-sm font-bold text-secondary border border-gray-300 rounded px-4 py-2 hover:bg-background transition-colors"
            >
              Retry
            </button>
            <Link to="/shop" className="text-sm text-primary font-bold hover:underline self-center">Back to shop</Link>
          </div>
        </div>
      </div>
    )
  }

  const category = getCategoryBySlug(
    categories.find((c) => c.name === product.category)?.slug
  )

  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0

  const allImages =
    product.images?.length > 0 ? product.images : [product.image]

  return (
    <div className="max-w-7xl mx-auto px-4 mt-4 mb-10">
      {/* breadcrumb */}
      <nav className="text-[11px] text-gray-500 mb-3" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-primary">Home</Link>
        <span className="mx-1.5">›</span>
        {category && (
          <>
            <Link to={`/category/${category.slug}`} className="hover:text-primary">
              {product.category}
            </Link>
            <span className="mx-1.5">›</span>
          </>
        )}
        <span className="text-secondary font-semibold line-clamp-1">{product.name}</span>
      </nav>

      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-0">
          {/* ---- GALLERY ---- */}
          <div className="p-4 lg:p-6 border-b lg:border-b-0 lg:border-r border-gray-100">
            {/* main image */}
            <div className="aspect-square bg-background rounded-lg overflow-hidden flex items-center justify-center border border-gray-100">
              <img
                src={mainImg || product.image}
                alt={product.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
                {allImages.map((src) => (
                  <button
                    key={src}
                    onClick={() => setMainImg(src)}
                    className={`shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-colors ${
                      mainImg === src ? 'border-primary' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* discount badge floating on image */}
            {discount > 0 && (
              <span className="inline-block mt-3 bg-danger text-white text-[11px] font-bold rounded px-2 py-1">
                {discount}% OFF
              </span>
            )}
          </div>

          {/* ---- INFO ---- */}
          <div className="p-4 lg:p-6 flex flex-col gap-4">
            {/* name */}
            <h1 className="text-base md:text-lg font-black text-secondary leading-snug">
              {product.name}
            </h1>

            {/* vendor */}
            <div className="flex items-center gap-2 text-xs text-gray-600">
              {product.vendorLogo && (
                <img src={product.vendorLogo} alt="" className="w-5 h-5 rounded" />
              )}
              <span className="font-semibold">{product.vendor}</span>
              <span className="inline-flex items-center gap-0.5 text-accent font-semibold">
                <ShieldIcon className="w-3 h-3" /> Verified
              </span>
            </div>

            {/* rating */}
            <div className="flex items-center gap-2">
              <Stars rating={product.rating} size="w-4 h-4" />
              <span className="text-xs text-gray-500">
                {product.rating} / 5 · {product.reviews.toLocaleString()} reviews
              </span>
            </div>

            {/* price */}
            <div className="bg-background rounded-lg p-3">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xl md:text-2xl font-black text-secondary">
                  {formatNaira(product.price)}
                </span>
                {product.oldPrice && (
                  <>
                    <span className="text-sm text-gray-400 line-through">
                      {formatNaira(product.oldPrice)}
                    </span>
                    <span className="text-xs font-bold text-danger">
                      Save {formatNaira(product.oldPrice - product.price)}
                    </span>
                  </>
                )}
              </div>
              {product.inStock ? (
                <p className="text-[11px] text-accent font-bold mt-1">✓ In Stock — Ready to ship</p>
              ) : (
                <p className="text-[11px] text-danger font-bold mt-1">Out of Stock</p>
              )}
            </div>

            {/* free delivery note */}
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <TruckIcon className="w-4 h-4 text-accent shrink-0" />
              Free delivery on orders over ₦50,000
            </div>

            {/* description */}
            {product.description && (
              <div>
                <h2 className="text-xs font-black text-secondary uppercase tracking-wide mb-1.5">
                  Description
                </h2>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {/* qty + buttons */}
            <div className="border-t border-gray-100 pt-4 mt-auto space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-secondary">Qty:</span>
                <div className="flex items-center border border-gray-300 rounded">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    className="p-2 text-secondary hover:bg-background disabled:opacity-30"
                    aria-label="Decrease quantity"
                  >
                    <MinusIcon className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center text-sm font-bold">{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(99, q + 1))}
                    className="p-2 text-secondary hover:bg-background"
                    aria-label="Increase quantity"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-[11px] text-gray-500">Total: {formatNaira(product.price * qty)}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={!product.inStock}
                  className={`flex-1 flex items-center justify-center gap-2 rounded text-sm font-black py-3 transition-colors ${
                    !product.inStock
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : added
                        ? 'bg-accent text-white'
                        : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                >
                  <CartIcon className="w-4 h-4" />
                  {!product.inStock ? 'Out of Stock' : added ? 'Added to Cart ✓' : 'Add to Cart'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- SPECIFICATIONS TABLE ---- */}
      <div className="mt-4 bg-white rounded-lg shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-black text-secondary">Product Details</h2>
        </div>
        <table className="w-full text-xs">
          <tbody className="divide-y divide-gray-100">
            <SpecRow label="Category" value={product.category} />
            <SpecRow label="Brand" value={product.vendor} />
            <SpecRow label="Rating" value={`${product.rating} / 5 (${product.reviews.toLocaleString()} reviews)`} />
            <SpecRow label="Availability" value={product.inStock ? 'In Stock' : 'Out of Stock'} />
            <SpecRow label="Shipping" value="Free delivery on orders over ₦50,000" />
            {product.badge && <SpecRow label="Badge" value={product.badge} />}
          </tbody>
        </table>
      </div>

      {/* ---- SELLER CARD ---- */}
      <div className="mt-4 bg-white rounded-lg shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-black text-secondary">Seller Information</h2>
        </div>
        <div className="p-4 flex items-center gap-3">
          {product.vendorLogo ? (
            <img src={product.vendorLogo} alt={product.vendor} className="w-12 h-12 rounded-lg" />
          ) : (
            <span className="w-12 h-12 rounded-lg bg-secondary text-white font-black grid place-items-center text-base">
              {(product.vendor || '?').charAt(0)}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-secondary">{product.vendor}</p>
            <p className="text-[11px] text-gray-500 flex items-center gap-1">
              <ShieldIcon className="w-3 h-3 text-accent" /> Verified seller · Ships nationwide
            </p>
          </div>
          <Link
            to="/shop"
            className="text-xs font-semibold text-primary border border-primary rounded px-3 py-2 hover:bg-primary hover:text-white transition-colors shrink-0"
          >
            Visit Store
          </Link>
        </div>
      </div>

      {/* related categories */}
      {category && (
        <div className="mt-4 bg-white rounded-lg shadow-card p-4">
          <h2 className="text-xs font-black text-secondary uppercase tracking-wide mb-2">
            You may also like
          </h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {categories
              .filter((c) => c.slug !== category.slug)
              .slice(0, 6)
              .map((c) => (
                <Link
                  key={c.slug}
                  to={`/category/${c.slug}`}
                  className="shrink-0 border border-gray-200 rounded text-xs font-medium text-secondary px-3 py-2 hover:border-primary hover:text-primary transition-colors"
                >
                  {c.name}
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SpecRow({ label, value }) {
  return (
    <tr>
      <td className="px-4 py-2.5 text-gray-500 font-semibold whitespace-nowrap w-36">{label}</td>
      <td className="px-4 py-2.5 text-secondary">{value}</td>
    </tr>
  )
}
