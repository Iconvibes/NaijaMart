import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { CartProvider } from './context/CartProvider'
import { AuthProvider } from './context/AuthProvider'
import ScrollToTop from './components/ScrollToTop'
import ProtectedRoute from './components/ProtectedRoute'
import TopNav from './components/TopNav'
import MobileBottomNav from './components/MobileBottomNav'
import CartDrawer from './components/CartDrawer'
import Hero from './components/Hero'
import Categories from './components/Categories'
import FlashSales from './components/FlashSales'
import TopSelling from './components/TopSelling'
import Footer from './components/Footer'
import ListingPage from './pages/ListingPage'
import { ProductDetailKeyed } from './pages/ProductDetail'
import CheckoutPage from './pages/CheckoutPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import VendorLayout from './pages/vendor/VendorLayout'
import VendorProducts from './pages/vendor/VendorProducts'
import VendorAddProduct from './pages/vendor/VendorAddProduct'
import VendorOrders from './pages/vendor/VendorOrders'
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
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
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
        <Route path="orders" element={<VendorOrders />} />
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
          </div>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
