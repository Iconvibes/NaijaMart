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
import VendorSettings from './pages/vendor/VendorSettings'
import AdminDashboard from './pages/AdminDashboard'

function AppRoutes() {
  const { pathname } = useLocation()

  return (
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
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/track-order" element={<OrderTrackingPage />} />
      <Route path="/account" element={<AccountPage />} />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
