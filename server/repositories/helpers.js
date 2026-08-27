/**
 * Shared helpers for all domain repositories.
 *
 * - `mem`: the in-memory data store (used when MongoDB is unavailable)
 * - converter functions: normalize Mongoose docs / in-memory objects to plain JS objects
 * - `slugify`: URL-friendly slug generator for vendor names
 */

// ─── In-memory store ─────────────────────────────────────────────────────────
// Every repo reads/writes from here when isMemoryDb() is true.
const mem = {
  users: [],
  products: [],
  orders: [],
  ledger: [],
  reviews: [],
  notifications: [],
  wishlist: [],
  follows: [],
  coupons: [],
  withdrawals: [],
  helpfulVotes: [],
  uid: 0,
  pid: 0,
  oid: 0,
  lid: 0,
  rid: 0,
  nid: 0,
  wid: 0,
  fid: 0,
  cid: 0,
  wdid: 0,
  hid: 0,
}

export { mem }

// ─── Converters ──────────────────────────────────────────────────────────────
// These normalize both Mongoose docs (with _id) and in-memory objects (with id)
// into a consistent plain-object shape.

export const toUserObj = (u) => ({
  id: String(u.id),
  name: u.name,
  email: u.email,
  passwordHash: u.passwordHash,
  role: u.role,
  vendorStatus: u.vendorStatus || 'approved',
  logo: u.logo || null,
  banner: u.banner || null,
  bio: u.bio || '',
  whatsapp: u.whatsapp || null,
  slug: u.slug || null,
  createdAt: u.createdAt,
})

export const toProductObj = (p) => ({
  id: String(p.id),
  name: p.name,
  description: p.description || '',
  category: p.category,
  price: p.price,
  oldPrice: p.oldPrice ?? null,
  image: p.image,
  images: p.images || [],
  inStock: p.inStock,
  stock: p.stock ?? null,
  badge: p.badge || null,
  rating: p.rating,
  reviews: p.reviews,
  tags: p.tags || [],
  approved: p.approved !== false,
  vendorId: String(p.vendorId),
  createdAt: p.createdAt,
})

export const toOrderObj = (o) => ({
  id: String(o.id),
  customerName: o.customerName,
  customerEmail: o.customerEmail || null,
  customerPhone: o.customerPhone,
  customerAddress: o.customerAddress,
  customerId: o.customerId ? String(o.customerId) : null,
  items: o.items.map((i) => ({
    productId: String(i.productId),
    vendorId: String(i.vendorId),
    name: i.name,
    image: i.image || '',
    price: i.price,
    qty: i.qty,
    fulfillment: i.fulfillment || 'pending',
    refunded: i.refunded || false,
  })),
  total: o.total,
  payment: {
    method: o.payment?.method || 'cod',
    status: o.payment?.status || 'pending',
    amount: o.payment?.amount ?? o.total,
    reference: o.payment?.reference || null,
    capturedAt: o.payment?.capturedAt || null,
  },
  status: o.status,
  deliveredAt: o.deliveredAt || null,
  couponCode: o.couponCode || null,
  discountAmount: o.discountAmount || 0,
  createdAt: o.createdAt,
})

export const toLedgerObj = (e) => ({
  id: String(e.id),
  type: e.type,
  orderId: String(e.orderId),
  vendorId: e.vendorId ? String(e.vendorId) : null,
  from: e.from,
  to: e.to,
  amount: e.amount,
  reference: e.reference,
  description: e.description || '',
  actor: e.actor || 'system',
  createdAt: e.createdAt,
})

export const toReviewObj = (r) => ({
  id: String(r.id),
  orderId: String(r.orderId),
  productId: String(r.productId),
  vendorId: String(r.vendorId),
  customerId: String(r.customerId),
  rating: r.rating,
  title: r.title || '',
  text: r.text || '',
  images: r.images || [],
  isVerifiedPurchase: r.isVerifiedPurchase !== false,
  helpful: r.helpful || 0,
  createdAt: r.createdAt,
})

export const toNotificationObj = (n) => ({
  id: String(n.id),
  userId: String(n.userId),
  type: n.type,
  message: n.message,
  read: n.read || false,
  link: n.link || null,
  createdAt: n.createdAt,
})

export const toWishlistObj = (w) => ({
  id: String(w.id),
  customerId: String(w.customerId),
  productId: String(w.productId),
  createdAt: w.createdAt,
})

export const toFollowObj = (f) => ({
  id: String(f.id),
  customerId: String(f.customerId),
  vendorId: String(f.vendorId),
  createdAt: f.createdAt,
})

export const toCouponObj = (c) => ({
  id: String(c.id),
  code: c.code,
  vendorId: c.vendorId ? String(c.vendorId) : null,
  discountType: c.discountType,
  discountValue: c.discountValue,
  minOrder: c.minOrder || 0,
  maxUses: c.maxUses,
  usedCount: c.usedCount || 0,
  expiresAt: c.expiresAt || null,
  active: c.active !== false,
  createdAt: c.createdAt,
})

export const toWithdrawalObj = (w) => ({
  id: String(w.id),
  vendorId: String(w.vendorId),
  amount: w.amount,
  status: w.status || 'requested',
  bankName: w.bankName || '',
  accountNumber: w.accountNumber || '',
  accountName: w.accountName || '',
  processedBy: w.processedBy ? String(w.processedBy) : null,
  processedAt: w.processedAt || null,
  notes: w.notes || '',
  createdAt: w.createdAt,
})

// ─── Utilities ───────────────────────────────────────────────────────────────

/** Generate a URL-friendly slug from a vendor name. */
export const slugify = (name) =>
  String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
