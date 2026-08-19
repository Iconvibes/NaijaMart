# NaijaMart

A full-stack multi-vendor e-commerce marketplace built for Nigeria. Vendors list products, customers browse and buy, and the platform handles orders, payments, and vendor payouts.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-9-47A248?logo=mongodb)

---

## Features

### Customer
- Browse products by category, search, and flash deals
- Product detail pages with images, ratings, and vendor info
- Cart with persistent drawer and checkout flow
- Order tracking with real-time status updates
- Account dashboard for profile and order history
- PWA install banner — installable on Android and iOS

### Vendor (Seller Center)
- Dashboard to manage products (add, edit, delete) with image upload
- Order management with fulfillment workflow (pending → sent → received)
- Vendor settings — update store name, logo, and WhatsApp number
- WhatsApp order notifications via Meta Cloud API (falls back to `wa.me` links in dev)

### Admin
- Admin dashboard to oversee all orders and users
- Platform-wide order and ledger management

### Platform
- Role-based access control (customer, vendor, admin)
- Rate limiting on authentication endpoints
- In-memory rate limiter (swap for Redis in production)
- Service worker with offline caching and push notification support
- Skeleton loading states and error boundaries
- 12 static/info pages (About, FAQ, Shipping, Returns, Terms, Privacy, etc.)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router 7, Tailwind CSS 4 |
| Build | Vite 8, ESLint |
| Backend | Express 5, Node.js |
| Database | MongoDB / Mongoose 9 (in-memory store fallback) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Uploads | Multer, Sharp (icon generation) |
| Notifications | WhatsApp Cloud API (Meta) |
| PWA | Service Worker, Web App Manifest |

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** 9+
- **MongoDB** (optional — the app runs with an in-memory store if no `MONGO_URI` is set)

### Install & Run

```bash
# Clone the repo
git clone https://github.com/your-username/naijamart.git
cd naijamart

# Install dependencies
npm install

# Copy the env file and configure it
cp .env.example .env

# Start both the API and the dev server
npm run dev:full
```

The app will be available at **http://localhost:5173** (Vite) with the API at **http://localhost:5000**.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string. Leave empty for in-memory store. | _(empty)_ |
| `JWT_SECRET` | Secret for signing auth tokens. Use a strong value in production. | `naijamart-dev-secret` |
| `PORT` | API server port. | `5000` |
| `WHATSAPP_TOKEN` | Meta WhatsApp Cloud API access token. | _(empty)_ |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp sender phone number ID from Meta. | _(empty)_ |

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Vite dev server only |
| `npm run server` | Start the Express API server only |
| `npm run dev:full` | Start both API and frontend concurrently |
| `npm run build` | Production build with Vite |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run Node.js test runner |

---

## Project Structure

```
naijamart/
├── public/                 # Static assets
│   ├── icons/              # PWA icons (72–512px)
│   ├── manifest.json       # Web App Manifest
│   ├── sw.js               # Service Worker
│   └── favicon.svg
├── scripts/
│   └── generate-icons.js   # Sharp-based icon generator
├── server/                 # Express API
│   ├── index.js            # Entry point
│   ├── db.js               # MongoDB connection
│   ├── seed.js             # Dev seed data
│   ├── store.js            # In-memory repository (fallback)
│   ├── lib/                # Utilities (errors, etc.)
│   ├── middleware/          # Auth, rate limiting
│   ├── models/             # Mongoose schemas (User, Product, Order, Ledger)
│   ├── routes/             # API routes (auth, products, orders, vendors, ledger, upload)
│   ├── services/           # WhatsApp notification service
│   └── uploads/            # Uploaded product images
├── src/                    # React frontend
│   ├── App.jsx             # Router and layout
│   ├── api.js              # API client
│   ├── components/         # Shared UI (TopNav, Footer, CartDrawer, Skeleton, etc.)
│   ├── context/            # Auth and Cart providers
│   ├── pages/              # Page components
│   │   ├── static/         # 12 info pages (About, FAQ, Terms, ...)
│   │   └── vendor/         # Vendor dashboard pages
│   └── main.jsx
├── .env.example
├── package.json
└── vite.config.js
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive a JWT |
| `GET` | `/api/auth/me` | Get current user profile |
| `PATCH` | `/api/auth/me` | Update profile (name, logo, whatsapp, password) |
| `GET` | `/api/products` | List products (supports `?category=`, `?vendor=`, `?q=`) |
| `GET` | `/api/products/:id` | Get a single product |
| `POST` | `/api/products` | Create a product (vendor) |
| `PUT` | `/api/products/:id` | Update a product (vendor) |
| `DELETE` | `/api/products/:id` | Delete a product (vendor) |
| `GET` | `/api/vendors/:id` | Get a vendor's public profile |
| `GET` | `/api/orders` | List orders (scoped by role) |
| `GET` | `/api/orders/:id` | Get order details |
| `POST` | `/api/orders` | Place an order |
| `PATCH` | `/api/orders/:id` | Update order status / fulfillment |
| `POST` | `/api/upload` | Upload an image (vendor) |
| `GET` | `/api/ledger` | Vendor payout ledger |

---

## Default Seed Accounts

When running with the in-memory store (no `MONGO_URI`), the app seeds demo data on first launch:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@naijamart.com` | `admin123` |
| Vendor | `vendor@naijamart.com` | `vendor123` |
| Customer | `customer@naijamart.com` | `customer123` |

---

## License

This project is private and not currently licensed for public use.
