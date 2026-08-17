import { Link } from 'react-router-dom'
import { banners } from '../data/catalog'

export default function Hero() {
  const [large, ...small] = banners

  return (
    <section className="max-w-7xl mx-auto px-4 mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* large banner */}
      <Link
        to={large.link}
        className="relative block overflow-hidden rounded-lg md:col-span-2 min-h-[220px] md:min-h-[340px]"
      >
        <img
          src={large.image}
          alt={large.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative h-full flex flex-col justify-end p-5 md:p-8 max-w-[85%]">
          <span className="text-[11px] font-bold tracking-widest text-primary bg-white/90 rounded px-2 py-1 self-start mb-2">
            {large.tag}
          </span>
          <h2 className="text-white text-xl md:text-3xl font-black leading-tight">{large.title}</h2>
          <p className="text-white/90 text-xs md:text-sm mt-1.5 hidden sm:block">{large.sub}</p>
          <span className="bg-primary text-white text-xs md:text-sm font-bold rounded-md px-4 py-2 self-start mt-3 hover:bg-primary/90 transition-colors">
            {large.cta}
          </span>
        </div>
      </Link>

      {/* two small banners stacked */}
      <div className="flex flex-col gap-3">
        {small.map((b) => (
          <Link key={b.id} to={b.link} className="relative block flex-1 min-h-[110px] overflow-hidden rounded-lg">
            <img src={b.image} alt={b.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative h-full flex flex-col justify-center p-4">
              <span className="text-[10px] font-bold tracking-widest text-primary mb-1">{b.tag}</span>
              <h3 className="text-white text-sm md:text-base font-bold leading-snug">{b.title}</h3>
              <p className="text-white/85 text-[11px] mt-0.5 hidden sm:block">{b.sub}</p>
              <span className="text-white text-xs font-bold underline underline-offset-2 mt-1.5">{b.cta}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
