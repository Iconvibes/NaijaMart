import { useCallback, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/useAuth'
import { useAsync } from '../hooks/useAsync'

import ProductCard from '../components/ProductCard'

const StarIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
)

export default function StorePage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const { data, loading, error } = useAsync(useCallback(() => api.vendorStore(slug), [slug]))
  const [followState, setFollowState] = useState(null)

  const vendor = data?.vendor
  const products = data?.products || []
  const reviews = data?.reviews || []

  const handleFollow = async () => {
    if (!user) return
    try {
      const result = await api.toggleFollow(vendor.id)
      setFollowState(result.added)
    } catch {
      // silently fail
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] grid place-items-center text-sm text-gray-500">Loading store...</div>
    )
  }

  if (error || !vendor) {
    return (
      <div className="min-h-[50vh] grid place-items-center text-center px-4">
        <div>
          <p className="text-lg font-bold text-secondary">Store not found</p>
          <p className="text-xs text-gray-500 mt-1">This vendor may not exist or hasn't been approved yet.</p>
          <Link to="/shop" className="inline-block mt-4 text-sm font-bold text-primary hover:underline">
            Browse all products
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 mt-4 mb-10">
      {/* Banner */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        {vendor.banner ? (
          <div className="h-32 md:h-48 bg-gray-100">
            <img src={vendor.banner} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-32 md:h-48 bg-gradient-to-r from-primary/20 to-accent/20" />
        )}

        {/* Vendor info */}
        <div className="px-4 md:px-6 pb-4 -mt-8 relative z-10">
          <div className="flex items-end gap-4">
            {vendor.logo ? (
              <img
                src={vendor.logo}
                alt={vendor.name}
                className="w-20 h-20 md:w-24 md:h-24 rounded-xl border-4 border-white shadow-card object-cover"
              />
            ) : (
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl border-4 border-white shadow-card bg-secondary text-white text-2xl font-black grid place-items-center">
                {vendor.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-lg md:text-xl font-black text-secondary truncate">{vendor.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-0.5">
                  <StarIcon className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-xs font-bold text-secondary">{vendor.rating?.toFixed(1) || '4.0'}</span>
                </div>
                <span className="text-xs text-gray-400">{products.length} product{products.length === 1 ? '' : 's'}</span>
                <span className="text-xs text-gray-400">{vendor.followerCount || 0} follower{(vendor.followerCount || 0) === 1 ? '' : 's'}</span>
              </div>
            </div>
            {user && user.id !== vendor.id && (
              <button
                onClick={handleFollow}
                className={`shrink-0 text-xs font-bold rounded px-4 py-2 transition-colors ${
                  followState === true || (!followState && false)
                    ? 'bg-gray-200 text-secondary'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                {followState === true ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
          {vendor.bio && <p className="text-xs text-gray-600 mt-3 leading-relaxed">{vendor.bio}</p>}
        </div>
      </div>

      {/* Products grid */}
      <div className="mt-4">
        <h2 className="text-sm font-black text-secondary uppercase tracking-wide mb-3">
          Products ({products.length})
        </h2>
        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow-card p-10 text-center">
            <p className="text-xs text-gray-500">This vendor hasn't listed any products yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={{ ...p, vendor: vendor.name }} />
            ))}
          </div>
        )}
      </div>

      {/* Recent reviews */}
      {reviews.length > 0 && (
        <div className="mt-4 bg-white rounded-lg shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-black text-secondary uppercase tracking-wide">Recent Reviews</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {reviews.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarIcon
                        key={i}
                        className={`w-3 h-3 ${i < r.rating ? 'text-yellow-400' : 'text-gray-200'}`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  {r.isVerifiedPurchase && (
                    <span className="text-[9px] font-bold text-accent bg-accent/10 rounded px-1.5 py-0.5">
                      Verified Purchase
                    </span>
                  )}
                </div>
                {r.title && <p className="text-xs font-bold text-secondary">{r.title}</p>}
                {r.text && <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{r.text}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
