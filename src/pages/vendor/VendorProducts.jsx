import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { productSource } from '../../productSource'
import { useAuth } from '../../context/useAuth'
import { useAsync } from '../../hooks/useAsync'
import { formatNaira } from '../../data/catalog'
import { EditIcon, TrashIcon } from '../../components/Icons'

export default function VendorProducts() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useAsync(
    useCallback(
      () =>
        api.products().catch(() => {
          throw new Error('Could not load your products - is the API running?')
        }),
      []
    )
  )
  const products = (data?.products || data || []).filter((p) => p.vendorId === user.id)
  // local errors from deletes; load errors come from the hook
  const [deleteError, setDeleteError] = useState('')

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      await api.deleteProduct(id)
      productSource.invalidateProducts()
      reload()
    } catch (err) {
      setDeleteError(err.message)
    }
  }

  const live = products.filter((p) => p.inStock).length

  return (
    <div className="bg-white rounded-lg shadow-card overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between gap-2 flex-wrap border-b border-gray-200">
        <h2 className="text-sm font-black text-secondary">
          Products
          <span className="hidden sm:inline text-[11px] font-medium text-gray-500 ml-2">
            {products.length} total · {live} live · {products.length - live} inactive
          </span>
        </h2>
        <Link to="/vendor/add-product" className="bg-primary text-white text-[11px] font-bold rounded px-3 py-2 hover:bg-primary/90 transition-colors">
          + Add Product
        </Link>
      </div>

      {(error || deleteError) && (
        <p className="m-4 bg-danger/10 border border-danger/30 text-danger text-xs font-semibold rounded px-3 py-2">
          {error?.message || deleteError}
        </p>
      )}

      {loading ? (
        <p className="text-xs text-gray-500 py-10 text-center">Loading...</p>
      ) : products.length === 0 ? (
        <p className="text-xs text-gray-500 py-10 text-center">
          No products yet.{' '}
          <Link to="/vendor/add-product" className="text-primary font-bold hover:underline">Add your first product</Link>
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-wide text-gray-500">
                <th className="text-left px-4 py-2.5">Product</th>
                <th className="text-left px-3 py-2.5 hidden md:table-cell">Category</th>
                <th className="text-right px-3 py-2.5">Price</th>
                <th className="text-right px-3 py-2.5 hidden sm:table-cell">Old price</th>
                <th className="text-center px-3 py-2.5">Stock</th>
                <th className="text-center px-3 py-2.5 hidden sm:table-cell">Status</th>
                <th className="text-right px-4 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-background/60">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={p.image} alt="" className="w-10 h-10 object-cover rounded border border-gray-100 bg-background shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-secondary leading-snug line-clamp-2 max-w-[260px]">{p.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{p.images?.length > 0 ? `${p.images.length} photo${p.images.length > 1 ? 's' : ''}` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 hidden md:table-cell">{p.category}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-secondary">{formatNaira(p.price)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-400 line-through hidden sm:table-cell">
                    {p.oldPrice ? formatNaira(p.oldPrice) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${p.inStock ? 'bg-accent' : 'bg-danger'}`} />
                  </td>
                  <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                    <span className={`text-[10px] font-black uppercase tracking-wide rounded px-2 py-0.5 ${
                      p.inStock ? 'bg-accent/10 text-accent' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {p.inStock ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/vendor/edit-product/${p.id}`}
                        className="p-1.5 text-gray-400 hover:text-primary"
                        aria-label={`Edit ${p.name}`}
                      >
                        <EditIcon className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-1.5 text-gray-400 hover:text-danger"
                        aria-label={`Delete ${p.name}`}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
