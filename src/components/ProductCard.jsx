import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatNaira } from '../data/catalog'
import { useCart } from '../context/useCart'
import { StarIcon, ShieldIcon, CartIcon } from './Icons'

export function Stars({ rating, size = 'w-3 h-3' }) {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100))
  return (
    <span className="relative inline-block leading-none" aria-label={`${rating} out of 5 stars`}>
      <span className="flex text-gray-300">
        {[...Array(5)].map((_, i) => (
          <StarIcon key={i} className={size} />
        ))}
      </span>
      <span
        className="absolute inset-0 flex overflow-hidden text-primary"
        style={{ width: `${pct}%` }}
      >
        {[...Array(5)].map((_, i) => (
          <StarIcon key={i} filled className={`${size} shrink-0`} />
        ))}
      </span>
    </span>
  )
}

function ImageBlock({ linkTo, aspectClass, children }) {
  const cls = `relative overflow-hidden bg-background ${aspectClass}`
  return linkTo ? (
    <Link to={linkTo} className={cls}>{children}</Link>
  ) : (
    <div className={cls}>{children}</div>
  )
}

export default function ProductCard({ product, aspectClass = 'aspect-[4/5]', showVendor = true, showStock = true }) {
  const { addToCart } = useCart()
  const [added, setAdded] = useState(false)
  const discount =
    product.oldPrice ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : 0

  const handleAdd = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!product.inStock) return
    addToCart(product)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1200)
  }

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-card hover:shadow-md transition-shadow flex flex-col group">
      {/* image */}
      <ImageBlock linkTo={product.linkTo} aspectClass={aspectClass}>
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-danger text-white text-[11px] font-bold rounded px-1.5 py-0.5">
            -{discount}%
          </span>
        )}
        {product.badge && (
          <span
            className={`absolute top-2 right-2 text-[9px] font-black tracking-wide rounded px-1.5 py-0.5 ${
              product.badge === 'VERIFIED' ? 'bg-accent text-white' : 'bg-secondary text-white'
            }`}
          >
            {product.badge}
          </span>
        )}
      </ImageBlock>

      {/* body */}
      <div className="p-2.5 md:p-3 flex flex-col gap-1 flex-1">
        {product.linkTo ? (
          <Link to={product.linkTo} className="text-xs md:text-[13px] font-medium text-secondary leading-snug line-clamp-2 min-h-[32px] hover:text-primary transition-colors">
            {product.name}
          </Link>
        ) : (
          <h3 className="text-xs md:text-[13px] font-medium text-secondary leading-snug line-clamp-2 min-h-[32px]">
            {product.name}
          </h3>
        )}

        {showVendor && (
          <p className="text-[10px] md:text-[11px] text-gray-500 truncate">
            {product.vendor}
            {product.vendorLogo && (
              <img src={product.vendorLogo} alt="" className="inline-block w-3 h-3 rounded-full ml-1 align-[-2px]" />
            )}
            <span className="inline-flex items-center gap-0.5 ml-1 text-accent font-semibold">
              <ShieldIcon className="w-3 h-3" /> Verified
            </span>
          </p>
        )}

        <div className="flex items-center gap-1 mt-auto">
          <Stars rating={product.rating} />
          <span className="text-[10px] text-gray-500">({product.reviews.toLocaleString()})</span>
        </div>

        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm md:text-base font-black text-secondary">
            {formatNaira(product.price)}
          </span>
          {product.oldPrice && (
            <span className="text-[11px] text-gray-400 line-through">
              {formatNaira(product.oldPrice)}
            </span>
          )}
        </div>

        {showStock && (
          <p className={`text-[11px] font-semibold ${product.inStock ? 'text-accent' : 'text-danger'}`}>
            {product.inStock ? '✓ In Stock' : 'Out of Stock'}
          </p>
        )}

        <button
          onClick={handleAdd}
          disabled={!product.inStock}
          className={`mt-1.5 w-full flex items-center justify-center gap-1.5 rounded border text-xs font-bold py-2 transition-colors ${
            !product.inStock
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : added
                ? 'bg-accent text-white border-accent'
                : 'border-primary text-primary hover:bg-primary hover:text-white'
          }`}
        >
          <CartIcon className="w-3.5 h-3.5" />
          {!product.inStock ? 'Out of Stock' : added ? 'Added ✓' : 'Add to Cart'}
        </button>
      </div>
    </div>
  )
}
