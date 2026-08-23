import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { CartProvider } from './context/CartProvider'
import { AuthProvider } from './context/AuthProvider'
import ScrollToTop from './components/ScrollToTop'
import ProtectedRoute from './components/ProtectedRoute'
import TopNav from './components/TopNav'
import MobileBottomNav from './components/MobileBottomNav'
import CartDrawer from './components/CartDrawer'
import ErrorBoundary from './components/ErrorBoundary'
import PWAInstallBanner from './components/PWAInstallBanner'
import Hero from './components/Hero'
import Categories from './components/Categories'
import FlashSales from './components/FlashSales'
import TopSelling from './components/TopSelling'
import Footer from './components/Footer'
import ListingPage from './pages/ListingPage'
import { ProductDetailKeyed } from './pages/ProductDetail'
import CheckoutPage from './pages/CheckoutPage'
import OrderTrackingPage from './pages/OrderTrackingPage'
import AccountPage from './pages/AccountPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import StorePage from './pages/StorePage'
import NotificationsPage from './pages/NotificationsPage'
import AboutPage from './pages/static/AboutPage'
import TermsPage from './pages/static/TermsPage'
import PrivacyPage from './pages/static/PrivacyPage'
import ReturnsPage from './pages/static/ReturnsPage'
import ShippingPage from './pages/static/ShippingPage'
import PaymentsPage from './pages/static/PaymentsPage'
import ContactPage from './pages/static/ContactPage'
import FAQPage from './pages/static/FAQPage'
import CareersPage from './pages/static/CareersPage'
import SitemapPage from './pages/static/SitemapPage'
import AdvertisePage from './pages/static/AdvertisePage'
import AffiliatePage from './pages/static/AffiliatePage'
import VendorLayout from './pages/vendor/VendorLayout'
import VendorProducts from './pages/vendor/VendorProducts'
import VendorAddProduct from './pages/vendor/VendorAddProduct'
import VendorEditProduct from './pages/vendor/VendorEditProduct'
import VendorOrders from './pages/vendor/VendorOrders'
import VendorWallet from './pages/vendor/VendorWallet'
import VendorCoupons from './pages/vendor/VendorCoupons'
import VendorSettings from './pages/vendor/VendorSettings'
import AdminVendors from './pages/admin/AdminVendors'
import AdminWithdrawals from './pages/admin/AdminWithdrawals'

// Lazy-load heavy pages that most visitors never see. This pulls Recharts
// (~400KB) and the analytics logic out of the main bundle into separate
// chunks that load on demand.
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'))
const VendorAnalytics = lazy(() => import('./pages/vendor/VendorAnalytics'))

function RouteSpinner() {
  return (
    <div className="min-h-[50vh] grid place-items-center">
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <svg className="animate-spin h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading…
      </div>
    </div>
  )
}

function AppRoutes() {
  const { pathname } = useLocation()

  return (
    <Suspense fallback={<RouteSpinner />}>
    <Routes>
      <Route
        path="/"
        element={
          <>
            <Hero />
            <Categories />
            <FlashSales />
            <TopSelling />
          </>
        }
      />
      <Route path="/shop" element={<ListingPage key="shop" mode="all" />} />
      <Route path="/deals" element={<ListingPage key="deals" mode="deals" />} />
      <Route path="/category/:slug" element={<ListingPage key={pathname} mode="category" />} />
      <Route path="/product/:id" element={<ProductDetailKeyed />} />
      <Route path="/store/:slug" element={<StorePage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/track-order" element={<OrderTrackingPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/returns" element={<ReturnsPage />} />
      <Route path="/shipping" element={<ShippingPage />} />
      <Route path="/payments" element={<PaymentsPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/careers" element={<CareersPage />} />
      <Route path="/sitemap" element={<SitemapPage />} />
      <Route path="/advertise" element={<AdvertisePage />} />
      <Route path="/affiliate" element={<AffiliatePage />} />
      <Route
        path="/vendor"
        element={
          <ProtectedRoute roles={['vendor', 'admin']}>
            <VendorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<VendorProducts />} />
        <Route path="products" element={<VendorProducts />} />
        <Route path="add-product" element={<VendorAddProduct />} />
        <Route path="edit-product/:id" element={<VendorEditProduct />} />
        <Route path="orders" element={<VendorOrders />} />
        <Route path="wallet" element={<VendorWallet />} />
        <Route path="coupons" element={<VendorCoupons />} />
        <Route path="analytics" element={<VendorAnalytics />} />
        <Route path="settings" element={<VendorSettings />} />
      </Route>
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/vendors"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminVendors />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/withdrawals"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminWithdrawals />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminAnalytics />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <ScrollToTop />
            <div className="min-h-screen bg-background pb-14 lg:pb-0">
              <TopNav />

              <main>
                <AppRoutes />
              </main>

              <Footer />
            <MobileBottomNav />
            <CartDrawer />
            <PWAInstallBanner />
          </div>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
