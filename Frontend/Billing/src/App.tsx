import React from 'react'
import { useLocation } from 'react-router-dom'
import Layout from './components/layout/Layout'
import AppRoutes from './routes/AppRoutes'
import { UserProvider } from './lib/auth/UserContext'
import AuthGate from './lib/auth/AuthGate'
import { ThemeProvider } from './lib/theme/ThemeProvider'
import { SettingsProvider } from './lib/settings/SettingsContext'
import { ToastContainer } from 'react-toastify'
import { Toaster } from 'react-hot-toast'
import CustomerQueryWarmup from './pages/Customers/CustomerQueryWarmup'
import ItemQueryWarmup from './pages/Product-Calalog/items/ItemQueryWarmup'
import ProductQueryWarmup from './pages/Product-Calalog/plans/ProductQueryWarmup'
import QuoteQueryWarmup from './pages/sales/Quotes/QuoteQueryWarmup'
import CouponQueryWarmup from './pages/Product-Calalog/coupons/CouponQueryWarmup'
import PriceListQueryWarmup from './pages/Product-Calalog/priceList/PriceListQueryWarmup'

export default function App() {
  const location = useLocation()
  const isPublicSenderVerification = location.pathname.startsWith('/sender-verification')

  return (
    <UserProvider>
      <ThemeProvider>
        <SettingsProvider>
          {isPublicSenderVerification ? (
            <AppRoutes />
          ) : (
            <AuthGate>
              <CustomerQueryWarmup />
              <ItemQueryWarmup />
              <ProductQueryWarmup />
              <QuoteQueryWarmup />
              <CouponQueryWarmup />
              <PriceListQueryWarmup />
              <Layout>
                <AppRoutes />
              </Layout>
            </AuthGate>
          )}
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            draggable
          />
          <Toaster position="top-right" />
        </SettingsProvider>
      </ThemeProvider>
    </UserProvider>
  )
}

