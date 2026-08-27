import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { formatNaira } from '../data/catalog'
import { SearchIcon } from './Icons'

const DEBOUNCE_MS = 250
const MIN_QUERY = 2

export default function SearchAutocomplete({ category, setCategory, query, setQuery, onSubmit, children }) {
  const navigate = useNavigate()
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback((q) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < MIN_QUERY) {
      setSuggestions([])
      setOpen(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.productSuggestions(q)
        setSuggestions(data.suggestions || [])
        setOpen(true)
        setActiveIdx(-1)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)
  }, [])

  // Fetch when query changes
  useEffect(() => {
    fetchSuggestions(query)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, fetchSuggestions])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectProduct(product) {
    setOpen(false)
    setQuery('')
    navigate(`/product/${product.id}`)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (activeIdx >= 0 && activeIdx < suggestions.length) {
      selectProduct(suggestions[activeIdx])
    } else {
      setOpen(false)
      onSubmit(e)
    }
  }

  function handleKeyDown(e) {
    if (!open || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIdx(-1)
    } else if (e.key === 'Tab') {
      setOpen(false)
      setActiveIdx(-1)
    }
  }

  const showDropdown = open && (suggestions.length > 0 || loading || query.length >= MIN_QUERY)

  return (
    <div ref={containerRef} className="relative flex-1">
      <form
        onSubmit={handleSubmit}
        className="flex bg-white border-2 border-primary rounded-md overflow-hidden max-w-2xl"
      >
        {setCategory && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="hidden sm:block w-44 text-xs text-secondary bg-background px-3 py-2.5 border-r border-gray-300 outline-none cursor-pointer"
            aria-label="Search category"
          >
            {children}
          </select>
        )}
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder="Search products, brands and categories"
          className="flex-1 px-3 py-2.5 text-sm outline-none min-w-0"
          aria-label="Search products"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          role="combobox"
          autoComplete="off"
        />
        <button type="submit" className="bg-primary text-white px-4 sm:px-6 flex items-center gap-2 hover:bg-primary/90 transition-colors" aria-label="Search">
          <SearchIcon className="w-4 h-4" />
          <span className="hidden md:inline text-sm font-semibold">Search</span>
        </button>
      </form>

      {/* Autocomplete dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[60] max-h-[70vh] overflow-y-auto"
          role="listbox"
        >
          {loading && suggestions.length === 0 && (
            <div className="px-4 py-3 text-xs text-gray-500 flex items-center gap-2">
              <svg className="animate-spin h-3.5 w-3.5 text-primary" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching...
            </div>
          )}

          {suggestions.length > 0 && (
            <ul>
              {suggestions.map((product, idx) => (
                <li
                  key={product.id}
                  role="option"
                  aria-selected={idx === activeIdx}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                    idx === activeIdx ? 'bg-primary/5' : 'hover:bg-gray-50'
                  } ${idx > 0 ? 'border-t border-gray-100' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    selectProduct(product)
                  }}
                  onMouseEnter={() => setActiveIdx(idx)}
                >
                  <img
                    src={product.image}
                    alt=""
                    className="w-10 h-10 object-cover rounded bg-background border border-gray-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-secondary leading-snug line-clamp-1">
                      {highlightMatch(product.name, query)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {product.category} · {product.vendor}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-secondary">{formatNaira(product.price)}</p>
                    {product.oldPrice && (
                      <p className="text-[10px] text-gray-400 line-through">{formatNaira(product.oldPrice)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!loading && suggestions.length === 0 && query.length >= MIN_QUERY && (
            <div className="px-4 py-3 text-xs text-gray-500">
              No results for &quot;{query}&quot;
            </div>
          )}

          {suggestions.length > 0 && (
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                setOpen(false)
                navigate(`/shop?q=${encodeURIComponent(query)}`)
              }}
              className="w-full px-4 py-2.5 text-xs font-semibold text-primary hover:bg-primary/5 border-t border-gray-100 text-center"
            >
              See all results for &quot;{query}&quot; →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** Highlight matching text in product name */
function highlightMatch(text, query) {
  if (!query) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i} className="bg-yellow-100 text-secondary font-semibold rounded-sm px-0.5">{part}</mark>
      : part
  )
}
