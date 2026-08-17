import { Link } from 'react-router-dom'
import { categories } from '../data/catalog'

export default function Categories() {
  return (
    <section className="max-w-7xl mx-auto px-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base md:text-lg font-black text-secondary">Shop by Category</h2>
        <Link to="/shop" className="text-xs font-semibold text-primary hover:underline">See all categories</Link>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {categories.map((c) => (
          <Link
            key={c.name}
            to={`/category/${c.slug}`}
            className="bg-white rounded-lg overflow-hidden shadow-card hover:shadow-md hover:-translate-y-0.5 transition-all group"
          >
            <div className="aspect-[4/3] overflow-hidden bg-background">
              <img
                src={c.image}
                alt={c.name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-2 text-center">
              <p className="text-[11px] md:text-xs font-bold text-secondary leading-tight line-clamp-2">{c.name}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 hidden md:block">{c.count.toLocaleString()} items</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
