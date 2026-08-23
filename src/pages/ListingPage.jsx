import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { categories, products as catalogProducts, getCategoryBySlug, formatNaira } from '../data/catalog'
import { useAsync } from '../hooks/useAsync'
import { productSource } from '../productSource'
import ProductCard from '../components/ProductCard'
import { ProductCardSkeleton } from '../components/Skeleton'
import { ChevronDownIcon } from '../components/Icons'

const aspects = ['aspect-[4/5]', 'aspect-[5/6]', 'aspect-[4/5]', 'aspect-[1/1]', 'aspect-[5/6]', 'aspect-[4/5]', 'aspect-[1/1]', 'aspect-[4/5]']

const sortOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Customer Rating' },
  { value: 'discount', label: 'Biggest Discount' },
]

const priceChips = [
  { label: 'Under ₦25,000', min: null, max: 25000 },
  { label: '₦25,000 - ₦100,000', min: 25000, max: 100000 },
  { label: '₦100,000 - ₦500,000', min: 100000, max: 500000 },
  { label: 'Over ₦500,000', min: 500000, max: null },
]

const discountOf = (p) =>
  p.oldPrice ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0

export default function ListingPage({ mode = 'category' }) {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('q') || ''

  const [sort, setSort] = useState('featured')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  // Starts from the static catalog, then swaps in live API products so
  // vendor-created listings appear in the storefront.
  const { data: all, loading } = useAsync(productSource.fetchProducts, { initialData: catalogProducts })

  const category = mode === 'category' ? getCategoryBySlug(slug) : null

  const base = useMemo(() => {
    if (searchQuery) {
      const term = searchQuery.toLowerCase()
      return all.filter((p) =>
        (p.name || '').toLowerCase().includes(term) ||
        (p.description || '').toLowerCase().includes(term) ||
        (p.category || '').toLowerCase().includes(term)
      )
    }
    if (mode === 'deals') return all.filter((p) => p.oldPrice)
    if (mode === 'category') return category ? all.filter((p) => p.category === category.name) : []
    return all
  }, [mode, category, all, searchQuery])

  const title =
    searchQuery ? `Search: "${searchQuery}"` :
    mode === 'deals' ? 'Deals of the Day' : mode === 'all' ? 'All Products' : category ? category.name : 'Category'

  const hasFilters = minPrice !== '' || maxPrice !== ''

  const filtered = useMemo(() => {
    let list = [...base]
    if (minPrice !== '') list = list.filter((p) => p.price >= Number(minPrice))
    if (maxPrice !== '') list = list.filter((p) => p.price <= Number(maxPrice))

    switch (sort) {
      case 'price-asc':
        list.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        list.sort((a, b) => b.price - a.price)
        break
      case 'rating':
        list.sort((a, b) => b.rating - a.rating)
        break
      case 'discount':
        list.sort((a, b) => discountOf(b) - discountOf(a))
        break
      default:
        break
    }
    return list
  }, [base, sort, minPrice, maxPrice])

  const applyChip = (chip) => {
    setMinPrice(chip.min === null ? '' : String(chip.min))
    setMaxPrice(chip.max === null ? '' : String(chip.max))
  }

  const chipActive = (chip) =>
    (chip.min === null ? '' : String(chip.min)) === minPrice &&
    (chip.max === null ? '' : String(chip.max)) === maxPrice

  const resetFilters = () => {
    setMinPrice('')
    setMaxPrice('')
  }

  const minNum = minPrice === '' ? null : Number(minPrice)
  const maxNum = maxPrice === '' ? null : Number(maxPrice)

  return (
    <div className="max-w-7xl mx-auto px-4 mt-4">
      {/* breadcrumb */}
      <nav className="text-[11px] text-gray-500 mb-3" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-primary">Home</Link>
        <span className="mx-1.5">›</span>
        {mode === 'category' ? (
          <>
            <span>Categories</span>
            <span className="mx-1.5">›</span>
            <span className="text-secondary font-semibold">{title}</span>
          </>
        ) : (
          <span className="text-secondary font-semibold">{title}</span>
        )}
      </nav>

      {/* header */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-base md:text-lg font-black text-secondary">
            {title}
            <span className="hidden sm:inline text-xs font-medium text-gray-500 ml-3">
              {mode === 'category' && category
                ? `${category.count.toLocaleString()} items in this category`
                : `${base.length} product${base.length === 1 ? '' : 's'}`}
            </span>
          </h1>

          {/* sort */}
          <label className="flex items-center gap-2 text-xs font-semibold text-secondary">
            <span className="hidden sm:inline">Sort by:</span>
            <span className="relative inline-flex items-center">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="appearance-none bg-background border border-gray-300 rounded text-xs text-secondary pl-3 pr-8 py-2 outline-none cursor-pointer"
                aria-label="Sort products"
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDownIcon className="w-3.5 h-3.5 absolute right-2 pointer-events-none text-gray-500" />
            </span>
          </label>
        </div>

        {/* mobile filters toggle */}
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="lg:hidden w-full border-t border-gray-200 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-secondary"
          aria-expanded={filtersOpen}
        >
          Filters {hasFilters && <span className="text-primary">●</span>}
          <ChevronDownIcon className={`w-4 h-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
        </button>

        {filtersOpen && (
          <div className="lg:hidden border-t border-gray-200 px-4 py-3 space-y-4">
            <PriceFilter minPrice={minPrice} maxPrice={maxPrice} setMinPrice={setMinPrice} setMaxPrice={setMaxPrice} applyChip={applyChip} chipActive={chipActive} resetFilters={resetFilters} hasFilters={hasFilters} />
          </div>
        )}

        <div className="flex">
          {/* desktop sidebar */}
          <aside className="hidden lg:block w-56 shrink-0 border-r border-gray-200 p-4 space-y-5">
            <div>
              <h3 className="text-xs font-black text-secondary uppercase tracking-wide mb-2">Categories</h3>
              <ul className="space-y-1">
                {categories.map((c) => {
                  const active = mode === 'category' && category?.slug === c.slug
                  return (
                    <li key={c.slug}>
                      <Link
                        to={`/category/${c.slug}`}
                        className={`block text-xs rounded px-2 py-1.5 ${
                          active ? 'bg-primary/10 text-primary font-bold' : 'text-secondary hover:bg-background'
                        }`}
                      >
                        {c.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
            <PriceFilter minPrice={minPrice} maxPrice={maxPrice} setMinPrice={setMinPrice} setMaxPrice={setMaxPrice} applyChip={applyChip} chipActive={chipActive} resetFilters={resetFilters} hasFilters={hasFilters} />
          </aside>

          {/* results */}
          <div className="flex-1 p-3">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <>
                {hasFilters && (
                  <div className="flex items-center gap-2 mb-3 flex-wrap text-[11px]">
                    <span className="text-gray-500">Filters:</span>
                    {minPrice !== '' && (
                      <span className="bg-background border border-gray-200 rounded px-2 py-1 font-medium text-secondary">
                        Min {formatNaira(minNum)}
                      </span>
                    )}
                    {maxPrice !== '' && (
                      <span className="bg-background border border-gray-200 rounded px-2 py-1 font-medium text-secondary">
                        Max {formatNaira(maxNum)}
                      </span>
                    )}
                    <button onClick={resetFilters} className="text-primary font-bold hover:underline">
                      Clear all
                    </button>
                  </div>
                )}

                {filtered.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-4xl mb-2">🔍</p>
                    <p className="font-bold text-secondary mb-1">No products match your filters</p>
                    <p className="text-xs text-gray-500 mb-4">Try widening your price range.</p>
                    <button
                      onClick={resetFilters}
                      className="bg-primary text-white text-sm font-bold rounded px-5 py-2.5 hover:bg-primary/90 transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filtered.map((p, i) => (
                      <ProductCard key={p.id} product={{ ...p, linkTo: `/product/${p.id}` }} aspectClass={aspects[i % aspects.length]} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* category quick chips (mobile) */}
      {mode === 'category' && (
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {categories
            .filter((c) => c.slug !== category?.slug)
            .map((c) => (
              <Link
                key={c.slug}
                to={`/category/${c.slug}`}
                className="shrink-0 bg-white border border-gray-200 text-xs font-medium text-secondary rounded-full px-3 py-1.5 hover:border-primary hover:text-primary transition-colors"
              >
                {c.name}
              </Link>
            ))}
        </div>
      )}
    </div>
  )
}

function PriceFilter({ minPrice, maxPrice, setMinPrice, setMaxPrice, applyChip, chipActive, resetFilters, hasFilters }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-black text-secondary uppercase tracking-wide mb-2">Price Range</h3>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-500">₦</span>
            <input
              type="number"
              min="0"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full bg-background border border-gray-300 rounded text-xs text-secondary pl-6 pr-2 py-2 outline-none focus:border-primary"
              aria-label="Minimum price"
            />
          </div>
          <span className="text-gray-400 text-xs">–</span>
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-500">₦</span>
            <input
              type="number"
              min="0"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full bg-background border border-gray-300 rounded text-xs text-secondary pl-6 pr-2 py-2 outline-none focus:border-primary"
              aria-label="Maximum price"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {priceChips.map((chip) => (
            <button
              key={chip.label}
              onClick={() => applyChip(chip)}
              className={`text-[11px] font-medium rounded-full px-2.5 py-1 border transition-colors ${
                chipActive(chip)
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-secondary border-gray-300 hover:border-primary'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button onClick={resetFilters} className="mt-2 text-[11px] text-primary font-bold hover:underline">
            Clear price filters
          </button>
        )}
      </div>
    </div>
  )
}
