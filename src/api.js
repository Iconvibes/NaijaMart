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
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  me: () => request('/auth/me'),
  users: () => request('/auth/users'),
  products: () => request('/products'),
  product: (id) => request(`/products/${id}`),
  vendors: () => request('/vendors'),
  createProduct: (payload) => request('/products', { method: 'POST', body: payload }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  uploadImages: (files) => {
    const formData = new FormData()
    for (const file of files) formData.append('images', file)
    return request('/upload', { method: 'POST', formData })
  },
  createOrder: (payload) => request('/orders', { method: 'POST', body: payload }),
  orders: () => request('/orders'),
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PATCH', body: { status } }),
  capturePayment: (id) => request(`/orders/${id}/payment`, { method: 'PATCH', body: { action: 'capture' } }),
  refundOrder: (id, productIds) => request(`/orders/${id}/refund`, { method: 'POST', body: { productIds } }),
  ledger: () => request('/ledger'),
  ledgerPayables: () => request('/ledger/payables'),
  runPayouts: () => request('/ledger/payouts', { method: 'POST' }),
  // Vendors dispatch their items (sent/pending); admins confirm arrivals (received) with vendorId
  updateOrderFulfillment: (id, fulfillment, vendorId) =>
    request(`/orders/${id}/fulfillment`, { method: 'PATCH', body: { fulfillment, vendorId } }),
}
