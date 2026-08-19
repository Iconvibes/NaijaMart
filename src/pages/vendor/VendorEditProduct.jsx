import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'
import { productSource } from '../../productSource'
import { categories } from '../../data/catalog'
import { CloseIcon } from '../../components/Icons'

const MAX_IMAGES = 4

export default function VendorEditProduct() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: categories[0].name,
    price: '',
    oldPrice: '',
    inStock: true,
  })
  const [images, setImages] = useState([])

  useEffect(() => {
    let alive = true
    api
      .product(id)
      .then((product) => {
        if (!alive) return
        setForm({
          name: product.name || '',
          description: product.description || '',
          category: product.category || categories[0].name,
          price: product.price?.toString() || '',
          oldPrice: product.oldPrice?.toString() || '',
          inStock: product.inStock !== false,
        })
        setImages(product.images?.length ? product.images : product.image ? [product.image] : [])
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err.message)
        setLoading(false)
      })
    return () => { alive = false }
  }, [id])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleFiles = async (e) => {
    const files = [...e.target.files].slice(0, MAX_IMAGES - images.length)
    if (!files.length) return
    setError('')
    setUploading(true)
    try {
      const { paths } = await api.uploadImages(files)
      setImages((prev) => [...prev, ...paths].slice(0, MAX_IMAGES))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (images.length === 0) {
      setError('Add at least one product photo')
      return
    }
    setSaving(true)
    try {
      await api.updateProduct(id, {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        price: Number(form.price),
        oldPrice: form.oldPrice === '' ? null : Number(form.oldPrice),
        inStock: form.inStock,
        images,
        image: images[0],
      })
      productSource.invalidateProducts()
      navigate('/vendor/products')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const inputCls = 'w-full border border-gray-300 rounded text-xs px-3 py-2.5 outline-none focus:border-primary bg-white'

  if (loading) {
    return <div className="min-h-[50vh] grid place-items-center text-sm text-gray-500">Loading product...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-black text-secondary">Edit product</h2>
        <p className="text-[11px] text-gray-500 mt-0.5">Update your product listing</p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4 max-w-3xl">
        {error && (
          <p className="bg-danger/10 border border-danger/30 text-danger text-xs font-semibold rounded px-3 py-2">{error}</p>
        )}

        {/* image upload */}
        <div>
          <span className="text-xs font-bold text-secondary mb-1.5 block">
            Product photos <span className="text-danger">*</span>
            <span className="font-medium text-gray-400 ml-1">({images.length}/{MAX_IMAGES})</span>
          </span>

          <div className="flex gap-2.5 flex-wrap">
            {images.map((src) => (
              <div key={src} className="relative">
                <img src={src} alt="Uploaded preview" className="w-20 h-20 object-cover rounded border border-gray-200" />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((p) => p !== src))}
                  className="absolute -top-1.5 -right-1.5 bg-secondary text-white rounded-full p-0.5"
                  aria-label="Remove image"
                >
                  <CloseIcon className="w-3 h-3" />
                </button>
              </div>
            ))}

            {images.length < MAX_IMAGES && (
              <label className={`w-20 h-20 rounded border-2 border-dashed border-gray-300 grid place-items-center cursor-pointer hover:border-primary transition-colors text-gray-400 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploading ? (
                  <span className="text-[10px] font-bold text-gray-500 text-center px-1">Uploading...</span>
                ) : (
                  <span className="text-2xl leading-none">+</span>
                )}
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleFiles} />
              </label>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">JPG, PNG or WEBP · up to 5 MB each · max {MAX_IMAGES} photos</p>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-secondary mb-1 block">Product name *</span>
          <input required value={form.name} onChange={set('name')} placeholder="e.g. Oraimo FreePods 5 (White)" className={inputCls} />
        </label>

        <label className="block">
          <span className="text-xs font-bold text-secondary mb-1 block">Description</span>
          <textarea value={form.description} onChange={set('description')} rows="3" placeholder="Condition, warranty, delivery notes..." className={inputCls} />
        </label>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-secondary mb-1 block">Category *</span>
            <select value={form.category} onChange={set('category')} className={inputCls}>
              {categories.map((c) => (
                <option key={c.slug} value={c.name}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-secondary mb-1 block">Price (₦) *</span>
            <input required type="number" min="1" value={form.price} onChange={set('price')} placeholder="18500" className={inputCls} />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-secondary mb-1 block">Old price (₦, optional)</span>
            <input type="number" min="0" value={form.oldPrice} onChange={set('oldPrice')} placeholder="26000" className={inputCls} />
          </label>
          <label className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              checked={form.inStock}
              onChange={(e) => setForm((f) => ({ ...f, inStock: e.target.checked }))}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-xs font-bold text-secondary">In stock</span>
          </label>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={saving || uploading}
            className="bg-primary text-white text-xs font-black rounded px-5 py-2.5 hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/vendor/products')}
            className="text-xs font-semibold text-secondary border border-gray-300 rounded px-5 py-2.5 hover:bg-background transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
