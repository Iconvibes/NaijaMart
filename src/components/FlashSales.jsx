import { Link } from 'react-router-dom'
import { flashSaleProducts } from '../data/catalog'
import { useAsync } from '../hooks/useAsync'
import { productSource } from '../productSource'
import ProductCard from './ProductCard'
import CountdownTimer from './CountdownTimer'

export default function FlashSales() {
  // Live products from the API when it is up (so vendor listings appear),
  // falling back to the static catalog so the page always renders.
  const { data } = useAsync(productSource.fetchProducts, { initialData: flashSaleProducts })
  const list = data.slice(0, 5)

  return (
    <section className="max-w-7xl mx-auto px-4 mt-6">
      <div className="bg-white rounded-lg overflow-hidden shadow-card">
        {/* header */}
        <div className="bg-danger px-4 py-3 flex items-center gap-3 flex-wrap">
          <h2 className="text-white text-base md:text-lg font-black tracking-wide uppercase">
            Flash Sales
          </h2>
          <span className="hidden sm:block text-white/85 text-xs">Deals end soon - don't miss out</span>
          <div className="ml-auto flex items-center gap-2">
            <CountdownTimer hours={5} />
            <Link to="/deals" className="text-white text-xs font-bold border border-white/70 rounded px-2.5 py-1.5 hover:bg-white hover:text-danger transition-colors">
              View All
            </Link>
          </div>
        </div>

        {/* products - horizontal scroll on mobile, 5-up on desktop */}
        <div className="p-3">
          <div className="flex gap-3 overflow-x-auto no-scrollbar md:grid md:grid-cols-5 md:overflow-visible">
            {list.map((p, i) => (
              <div key={p.id} className="w-[160px] md:w-auto shrink-0">
                <ProductCard
                  product={{ ...p, linkTo: `/product/${p.id}` }}
                  showVendor={false}
                  aspectClass={i % 2 === 0 ? 'aspect-[4/5]' : 'aspect-[5/6]'}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
