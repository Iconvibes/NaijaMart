import { Link } from 'react-router-dom'

export default function StaticPage({ title, subtitle, children }) {
  return (
    <div className="max-w-3xl mx-auto px-4 mt-6 mb-10">
      {/* breadcrumb */}
      <nav className="text-[11px] text-gray-500 mb-3" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-primary">Home</Link>
        <span className="mx-1.5">›</span>
        <span className="text-secondary font-semibold">{title}</span>
      </nav>

      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h1 className="text-lg font-black text-secondary">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="px-6 py-6 prose prose-sm max-w-none text-secondary">
          {children}
        </div>
      </div>
    </div>
  )
}
