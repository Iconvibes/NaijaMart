const API_BASE = '/api'

async function request(path, { method = 'GET', body, formData } = {}) {
  const token = localStorage.getItem('naijamart_token')
  const isForm = formData instanceof FormData
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: isForm ? formData : body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || 'Something went wrong')
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  // ---- Auth ----
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  me: () => request('/auth/me'),
  updateMe: (payload) => request('/auth/me', { method: 'PATCH', body: payload }),
  users: () => request('/auth/users'),

  // ---- Products (enhanced with search/filters) ----
  products: (params = {}) => {
    const q = new URLSearchParams()
    if (params.q) q.set('q', params.q)
    if (params.category) q.set('category', params.category)
    if (params.vendor) q.set('vendor', params.vendor)
    if (params.minPrice != null) q.set('minPrice', params.minPrice)
    if (params.maxPrice != null) q.set('maxPrice', params.maxPrice)
    if (params.minRating != null) q.set('minRating', params.minRating)
    if (params.sort) q.set('sort', params.sort)
    if (params.page) q.set('page', params.page)
    if (params.limit) q.set('limit', params.limit)
    const qs = q.toString()
    return request(`/products${qs ? `?${qs}` : ''}`)
  },
  product: (id) => request(`/products/${id}`),
  createProduct: (payload) => request('/products', { method: 'POST', body: payload }),
  updateProduct: (id, payload) => request(`/products/${id}`, { method: 'PUT', body: payload }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  bulkCreateProducts: (payload) => request('/products/bulk', { method: 'POST', body: payload }),

  // ---- Upload ----
  uploadImages: (files) => {
    const formData = new FormData()
    for (const file of files) formData.append('images', file)
    return request('/upload', { method: 'POST', formData })
  },

  // ---- Vendors ----
  vendors: () => request('/vendors'),
  vendorStore: (slug) => request(`/vendors/${slug}`),
  approveVendor: (id) => request(`/vendors/${id}/approve`, { method: 'PATCH' }),
  rejectVendor: (id) => request(`/vendors/${id}/reject`, { method: 'PATCH' }),

  // ---- Orders ----
  createOrder: (payload) => request('/orders', { method: 'POST', body: payload }),
  lookupOrder: (id, phone) => request(`/orders/lookup/${encodeURIComponent(id)}?phone=${encodeURIComponent(phone)}`),
  orders: () => request('/orders'),
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PATCH', body: { status } }),
  capturePayment: (id) => request(`/orders/${id}/payment`, { method: 'PATCH', body: { action: 'capture' } }),
  refundOrder: (id, productIds) => request(`/orders/${id}/refund`, { method: 'POST', body: { productIds } }),
  updateOrderFulfillment: (id, fulfillment, vendorId) =>
    request(`/orders/${id}/fulfillment`, { method: 'PATCH', body: { fulfillment, vendorId } }),

  // ---- Ledger ----
  ledger: () => request('/ledger'),
  ledgerPayables: () => request('/ledger/payables'),
  runPayouts: () => request('/ledger/payouts', { method: 'POST' }),

  // ---- Reviews ----
  createReview: (payload) => request('/reviews', { method: 'POST', body: payload }),
  productReviews: (productId, sort) => request(`/reviews/product/${productId}${sort ? `?sort=${sort}` : ''}`),
  vendorReviews: (vendorId) => request(`/reviews/vendor/${vendorId}`),
  markReviewHelpful: (id) => request(`/reviews/${id}/helpful`, { method: 'POST' }),

  // ---- Notifications ----
  notifications: () => request('/notifications'),
  notificationCount: () => request('/notifications/count'),
  markNotificationsRead: () => request('/notifications/read', { method: 'PATCH' }),

  // ---- Wishlist ----
  toggleWishlist: (productId) => request(`/wishlist/${productId}`, { method: 'POST' }),
  wishlist: () => request('/wishlist'),

  // ---- Follows ----
  toggleFollow: (vendorId) => request(`/follows/${vendorId}`, { method: 'POST' }),
  following: () => request('/follows'),

  // ---- Coupons ----
  createCoupon: (payload) => request('/coupons', { method: 'POST', body: payload }),
  validateCoupon: (payload) => request('/coupons/validate', { method: 'POST', body: payload }),
  vendorCoupons: () => request('/coupons/vendor'),
  toggleCoupon: (id) => request(`/coupons/${id}/toggle`, { method: 'PATCH' }),

  // ---- Withdrawals (vendor) ----
  requestWithdrawal: (payload) => request('/withdrawals', { method: 'POST', body: payload }),
  vendorWithdrawals: () => request('/withdrawals'),
  vendorWallet: () => request('/withdrawals/wallet'),

  // ---- Withdrawals (admin) ----
  adminWithdrawals: (status) => request(`/withdrawals/admin${status ? `?status=${status}` : ''}`),
  approveWithdrawal: (id) => request(`/withdrawals/admin/${id}/approve`, { method: 'PATCH' }),
  rejectWithdrawal: (id) => request(`/withdrawals/admin/${id}/reject`, { method: 'PATCH' }),
  processWithdrawal: (id) => request(`/withdrawals/admin/${id}/process`, { method: 'PATCH' }),

  // ---- Analytics ----
  vendorAnalytics: (days) => request(`/analytics/vendor?days=${days}`),
  adminAnalytics: (days) => request(`/analytics/admin?days=${days}`),

  // ---- AI ----
  generateProduct: (prompt) => request('/ai/generate-product', { method: 'POST', body: { prompt } }),
}
