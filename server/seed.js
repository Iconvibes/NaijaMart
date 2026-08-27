import bcrypt from 'bcryptjs'
import { repo } from './store.js'
import { products } from '../src/data/catalog.js'

// The 5 marketplace sellers with real logo images under /images/vendors/
const VENDOR_DEFS = [
  { name: 'TechHub NG', logo: '/images/vendors/vendor-techhub.png' },
  { name: 'Slot Limited', logo: '/images/vendors/vendor-slot.png' },
  { name: 'Mixtra NG', logo: '/images/vendors/vendor-mixtra.png' },
  { name: '3CHub', logo: '/images/vendors/vendor-3chub.png' },
  { name: 'SoleMate NG', logo: '/images/vendors/vendor-solemate.png' },
]

// Every catalog vendor name maps to one of the seeded seller accounts, so
// every seeded product carries a real vendorId.
const VENDOR_MAP = {
  'TechHub NG': 'TechHub NG',
  'Slot Limited': 'Slot Limited',
  'Mixtra NG': 'Mixtra NG',
  '3CHub': '3CHub',
  'SoleMate NG': 'SoleMate NG',
  CompuGaga: '3CHub',
  'Shops Plus': 'Slot Limited',
  'Everyday Market': 'Slot Limited',
  'Kiddies Corner': 'SoleMate NG',
  'FashionHub NG': 'SoleMate NG',
}

const emailFor = (name) => `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@naijamart.com`

// Seeds the database once: 1 admin + 5 vendors + all catalog products.
// Demo logins: admin@naijamart.com / admin123, <vendor>@naijamart.com / vendor123
export async function seedIfEmpty() {
  // Never seed in production
  if (process.env.NODE_ENV === 'production') {
    console.log('Skipping seed — production environment')
    return
  }
  // Never seed if data already exists
  if ((await repo.countUsers()) > 0) return

  const adminHash = await bcrypt.hash('admin123', 10)
  await repo.createUser({
    name: 'NaijaMart Admin',
    email: 'admin@naijamart.com',
    passwordHash: adminHash,
    role: 'admin',
  })

  const vendors = {}
  for (const def of VENDOR_DEFS) {
    const passwordHash = await bcrypt.hash('vendor123', 10)
    vendors[def.name] = await repo.createUser({
      name: def.name,
      email: emailFor(def.name),
      passwordHash,
      role: 'vendor',
      logo: def.logo,
    })
  }

  for (const p of products) {
    const owner = vendors[VENDOR_MAP[p.vendor]] || Object.values(vendors)[0]
    await repo.createProduct({
      name: p.name,
      description: `Genuine ${p.category.toLowerCase()} product sold by ${p.vendor}.`,
      category: p.category,
      price: p.price,
      oldPrice: p.oldPrice ?? null,
      image: p.image,
      inStock: p.inStock,
      badge: p.badge || null,
      rating: p.rating,
      reviews: p.reviews,
      vendorId: owner.id,
    })
  }

  console.log(`Seeded ${VENDOR_DEFS.length} vendors, 1 admin and ${products.length} products`)
}
