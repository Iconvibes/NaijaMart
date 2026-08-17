import { Link } from 'react-router-dom'
import { products } from '../data/catalog'
import { useAsync } from '../hooks/useAsync'
import { productSource } from '../productSource'
import ProductCard from './ProductCard'

const aspects = ['aspect-[4/5]', 'aspect-[5/6]', 'aspect-[4/5]', 'aspect-[1/1]', 'aspect-[5/6]', 'aspect-[4/5]', 'aspect-[1/1]', 'aspect-[4/5]']

export default function TopSelling() {
  // Live products from the API when available, catalog fallback otherwise
  const { data: list } = useAsync(productSource.fetchProducts, { initialData: products })

  return (
    <section className="max-w-7xl mx-auto px-4 mt-6">
      <div className="bg-white rounded-lg overflow-hidden shadow-card">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base md:text-lg font-black text-secondary">
            Top Selling Products
            <span className="hidden sm:inline text-xs font-medium text-gray-500 ml-3">
              What NaijaMart customers are buying right now
            </span>
          </h2>
          <Link to="/shop" className="text-xs font-semibold text-primary hover:underline">See all</Link>
        </div>

        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {list.map((p, i) => (
            <ProductCard key={p.id} product={{ ...p, linkTo: `/product/${p.id}` }} aspectClass={aspects[i % aspects.length]} />
          ))}
        </div>
      </div>
    </section>
  )
}
