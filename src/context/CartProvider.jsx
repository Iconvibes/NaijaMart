import { useEffect, useMemo, useState } from 'react'
import { CartContext } from './cartContext'

const STORAGE_KEY = 'naijamart_cart_v1'

// Items are stored as [{ product, qty }]. The product snapshot lives in the
// cart so the drawer still renders if the catalog changes later.
function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return [] // corrupt or unreadable storage - start fresh
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart)
  const [isOpen, setIsOpen] = useState(false)

  // Persist on every change. Storage failures (private mode, full) are ignored
  // - the cart still works in memory.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* no-op */
    }
  }, [items])

  const addToCart = (product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: Math.min(i.qty + qty, 99) } : i
        )
      }
      return [...prev, { product, qty }]
    })
  }

  const removeFromCart = (productId) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId))
  }

  const updateQty = (productId, qty) => {
    if (qty < 1) return
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, qty: Math.min(qty, 99) } : i))
    )
  }

  const clearCart = () => setItems([])

  const openCart = () => setIsOpen(true)
  const closeCart = () => setIsOpen(false)
  const toggleCart = () => setIsOpen((v) => !v)

  const cartCount = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items])
  const cartTotal = useMemo(
    () => items.reduce((n, i) => n + i.qty * i.product.price, 0),
    [items]
  )
  const savings = useMemo(
    () =>
      items.reduce(
        (n, i) => n + i.qty * (i.product.oldPrice ? i.product.oldPrice - i.product.price : 0),
        0
      ),
    [items]
  )

  return (
    <CartContext.Provider
      value={{
        items,
        cartCount,
        cartTotal,
        savings,
        isOpen,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
        openCart,
        closeCart,
        toggleCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}
