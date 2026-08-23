# Project Structure Reference

Directory tree with the purpose of every file and folder.

```
naijamart/
├── server/                    # Express API server
│   ├── index.js               # Entry point: middleware, routes, health check, graceful shutdown
│   ├── db.js                  # MongoDB connection with in-memory fallback detection
│   ├── seed.js                # Seeds demo data: 1 admin + 5 vendors + catalog products
│   ├── store.js               # Single data abstraction: all repo methods with dual branches
│   ├── middleware/
│   │   ├── auth.js            # JWT verification, role checking, publicUser serializer
│   │   ├── rateLimit.js       # In-memory rate limiter (per-IP, per-originalUrl)
│   │   └── vendorApproval.js  # Blocks unapproved vendors from product operations
│   ├── models/                # Mongoose schemas (MongoDB only)
│   │   ├── User.js            # Users: customers, vendors, admins
│   │   ├── Product.js         # Products with text search index
│   │   ├── Order.js           # Orders with per-line items, payment, fulfillment
│   │   ├── Ledger.js          # Double-entry financial ledger
│   │   ├── Review.js          # Verified-purchase reviews
│   │   ├── Notification.js    # In-app notifications
│   │   ├── Wishlist.js        # Customer wishlists
│   │   ├── Follow.js          # Customer→vendor follows
│   │   ├── Coupon.js          # Discount coupons
│   │   └── Withdrawal.js      # Vendor withdrawal requests
│   ├── routes/                # Express route handlers (one per domain)
│   │   ├── auth.js            # Login, register, profile, admin user list
│   │   ├── products.js        # CRUD, search, bulk upload, approval toggle
│   │   ├── orders.js          # Checkout, listing, status/fulfillment/refund
│   │   ├── vendors.js         # Public vendor list, storefront, approve/reject
│   │   ├── reviews.js         # Create reviews, list by product/vendor, helpful votes
│   │   ├── notifications.js   # Get notifications, unread count, mark read
│   │   ├── wishlist.js        # Toggle and list wishlisted products
│   │   ├── follows.js         # Toggle and list followed vendors
│   │   ├── coupons.js         # Create, validate, toggle, platform coupons
│   │   ├── withdrawals.js     # Vendor requests, admin approve/reject/process
│   │   ├── ledger.js          # Admin: view entries, payables, run payouts
│   │   ├── analytics.js       # Vendor and admin analytics
│   │   ├── upload.js          # Image upload with multer
│   │   └── ai.js              # AI product generation (OpenAI)
│   ├── services/              # Business logic (not route handlers)
│   │   ├── orderIntake.js     # Order validation, price snapshotting, coupon reservation
│   │   ├── money.js           # Escrow, commission, payout, refund with ledger entries
│   │   ├── email.js           # Resend email delivery with retry/circuit breaker
│   │   ├── whatsapp.js        # WhatsApp Business API notifications
│   │   ├── realtime.js        # Socket.io setup, notification persistence + push
│   │   └── vendorOrderView.js # Per-vendor order projection + fulfillment state machine
│   ├── lib/
│   │   ├── errors.js          # AppError, ValidationError typed HTTP errors
│   │   └── resilience.js      # retry, CircuitBreaker, withTimeout, dead letter queue
│   └── uploads/               # Uploaded product images (gitignored)
│
├── src/                       # React frontend (Vite)
│   ├── main.jsx               # Entry point: renders App
│   ├── App.jsx                # Routes, providers, layout, lazy-loaded pages
│   ├── api.js                 # API client: every endpoint as a method
│   ├── productSource.js       # Shared product cache (caches promise, not result)
│   ├── index.css              # Tailwind CSS imports + custom utilities
│   ├── context/
│   │   ├── AuthProvider.jsx   # Auth state: login, register, logout, token validation
│   │   ├── authContext.js     # React context for auth
│   │   ├── useAuth.js         # Hook to consume auth context
│   │   ├── CartProvider.jsx   # Cart state: add, remove, update, localStorage persistence
│   │   ├── cartContext.js     # React context for cart
│   │   └── useCart.js         # Hook to consume cart context
│   ├── hooks/
│   │   ├── useAsync.js        # Data fetching hook: loading, error, reload
│   │   └── useSocket.js       # Socket.io connection + notification listener
│   ├── components/            # Reusable UI components
│   │   ├── TopNav.jsx         # Navigation bar
│   │   ├── MobileBottomNav.jsx # Mobile bottom navigation
│   │   ├── CartDrawer.jsx     # Slide-out cart
│   │   ├── ProductCard.jsx    # Product card for grid/listing
│   │   ├── ErrorBoundary.jsx  # React error boundary
│   │   ├── ProtectedRoute.jsx # Auth guard with role checking
│   │   ├── Hero.jsx           # Homepage hero banner
│   │   ├── Categories.jsx     # Category grid
│   │   ├── FlashSales.jsx     # Flash sales section
│   │   ├── TopSelling.jsx     # Top selling section
│   │   ├── Footer.jsx         # Site footer
│   │   ├── Skeleton.jsx       # Loading skeleton components
│   │   ├── Icons.jsx          # SVG icon components
│   │   ├── CountdownTimer.jsx # Countdown for flash sales
│   │   ├── PWAInstallBanner.jsx # PWA install prompt
│   │   └── ScrollToTop.jsx    # Scroll to top on navigation
│   ├── pages/
│   │   ├── ListingPage.jsx    # Product listing with search, filters, sort
│   │   ├── ProductDetail.jsx  # Single product page with reviews
│   │   ├── CheckoutPage.jsx   # Checkout with delivery form + payment method
│   │   ├── OrderTrackingPage.jsx # Order lookup by ID + phone
│   │   ├── AccountPage.jsx    # User account page
│   │   ├── LoginPage.jsx      # Login form
│   │   ├── RegisterPage.jsx   # Registration form
│   │   ├── StorePage.jsx      # Vendor storefront
│   │   ├── NotificationsPage.jsx # Notification list
│   │   ├── AdminDashboard.jsx # Admin: orders, payments, payouts, ledger
│   │   ├── vendor/            # Vendor pages (behind ProtectedRoute)
│   │   │   ├── VendorLayout.jsx # Shared layout with sidebar
│   │   │   ├── VendorProducts.jsx # Product management
│   │   │   ├── VendorAddProduct.jsx # Add product form
│   │   │   ├── VendorEditProduct.jsx # Edit product form
│   │   │   ├── VendorOrders.jsx # Order management
│   │   │   ├── VendorWallet.jsx # Balance + withdrawal
│   │   │   ├── VendorCoupons.jsx # Coupon management
│   │   │   ├── VendorAnalytics.jsx # Revenue charts (Recharts)
│   │   │   └── VendorSettings.jsx # Profile settings
│   │   ├── admin/             # Admin pages (behind ProtectedRoute)
│   │   │   ├── AdminVendors.jsx # Vendor approval/rejection
│   │   │   ├── AdminWithdrawals.jsx # Withdrawal management
│   │   │   └── AdminAnalytics.jsx # Platform analytics (Recharts)
│   │   └── static/            # Static content pages
│   │       ├── AboutPage.jsx, TermsPage.jsx, PrivacyPage.jsx, etc.
│   ├── data/
│   │   └── catalog.js         # Static product catalog (seed data + categories)
│   └── assets/                # Static assets (images, etc.)
│
├── docs/                      # Documentation
│   ├── how-to/                # Practical guides (setup, deploy, add features)
│   ├── reference/             # Technical reference (API, env vars, models)
│   └── explanation/           # Architectural discussions (escrow, auth, security)
│
├── test/                      # Unit tests
│   └── *.test.js              # Tests for escrow, orders, reviews, vendor views
│
├── scripts/                   # Build/utility scripts
│   ├── generate-icons.js      # PWA icon generation
│   └── generate-vendor-logos.mjs # Vendor logo generation
│
├── public/                    # Static public assets
│   └── images/                # Vendor logos, etc.
│
├── Dockerfile                 # Multi-stage Docker build
├── .dockerignore              # Docker build context exclusions
├── package.json               # Dependencies and scripts
├── vite.config.js             # Vite config with API proxy
├── tailwind.config.js         # Tailwind CSS theme (NaijaMart colors)
├── eslint.config.js           # ESLint config (separate rules for client/server)
├── .env.example               # Environment variable template
└── .gitignore                 # Git ignore rules
```

## Key Architectural Files

| File | Why it matters |
|------|---------------|
| `server/store.js` | **Single data abstraction** — every model method lives here with dual branches. This is the most important file to understand. |
| `server/services/money.js` | **Escrow engine** — commission calculation, payout eligibility, refund paths with ledger entries. |
| `server/services/orderIntake.js` | **Order intake** — price snapshotting, coupon validation with atomic CAS. |
| `src/api.js` | **API client** — every frontend→backend call is defined here. |
| `src/App.jsx` | **Route definitions** — all frontend routes, lazy loading, auth guards. |
| `src/context/AuthProvider.jsx` | **Auth state** — token storage, validation on boot, login/logout. |
