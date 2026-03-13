import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import CurrentSale from './components/CurrentSale/CurrentSale'
import { InventarioPage } from './pages/inventario/InventarioPage'
import { ProductoDetallesPage } from './pages/inventario/ProductoDetallesPage'
import { PedidosInventarioPage } from './pages/inventario/PedidosInventarioPage'
import { InventoryNewPage } from './components/Inventory/InventoryNewPage'
import Pending from './components/Pending/Pending'
import Reports from './components/Reports/Reports'
import Finance from './components/Finance/Finance'
import CajaModule from './components/Caja/CajaModule'
import Subscriptions from './components/Subscriptions/Subscriptions'
import { ConfiguracionPage } from './pages/configuracion/ConfiguracionPage'
import CheckoutPage from './pages/checkout/CheckoutPage'
import SubscriptionClientPage from './pages/subscriptions/SubscriptionClientPage'
import PublicCheckPage from './pages/subscriptions/PublicCheckPage'
import Login from './components/Auth/Login'
import Register from './components/Auth/Register'
import { useAuthStore } from './store/authStore'
import { useTenantStore } from './store/tenantStore'
import { offlineProductService } from './services/offlineProductService'
import './App.css'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

const FeatureRoute = ({ featureKey, children }) => {
  const featureFlags = useTenantStore(state => state.featureFlags)
  const featureFlagsLoading = useTenantStore(state => state.featureFlagsLoading)

  if (featureFlagsLoading) {
    return <div className="p-6">Cargando módulo...</div>
  }

  if (!featureFlags?.[featureKey]) {
    return <Navigate to="/" replace />
  }

  return children
}

const LegacyCashRouteRedirect = () => {
  const { action } = useParams()
  return <Navigate to={action ? `/cash-register/${action}` : '/cash-register'} replace />
}

const LegacyFinanceRouteRedirect = () => {
  const { sectionId } = useParams()
  if (!sectionId) return <Navigate to="/finance" replace />
  const mapped = ({
    cxc: 'receivables',
    cortes: 'cuts',
    exportar: 'export',
    reportes: 'reports'
  }[sectionId] || sectionId)
  return <Navigate to={`/finance/${mapped}`} replace />
}

const LegacyReportsRouteRedirect = () => {
  const { tabId } = useParams()
  return <Navigate to={tabId ? `/finance/reports/${tabId}` : '/finance/reports'} replace />
}

const LegacyInventoryProductRedirect = () => {
  const { id } = useParams()
  return <Navigate to={id ? `/inventory/product/${id}` : '/inventory'} replace />
}

const PublicSubscriptionCheckRedirect = () => {
  const { id } = useParams()
  return <Navigate to={id ? `/suscripciones/${id}` : '/subscriptions'} replace />
}

function App() {
  // Initialize offline services
  useEffect(() => {
    const initOfflineServices = async () => {
      try {
        await offlineProductService.init()
        console.log('✅ Offline services initialized')
      } catch (error) {
        console.error('❌ Failed to initialize offline services:', error)
      }
    }

    initOfflineServices()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/check/:id" element={<PublicCheckPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<CurrentSale />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="inventory" element={<InventarioPage />} />
          <Route path="inventory/product/:id" element={<ProductoDetallesPage />} />
          <Route path="inventory/orders" element={<PedidosInventarioPage />} />
          <Route path="inventory/new" element={<InventoryNewPage />} />
          <Route path="pending" element={<Pending />} />
          <Route path="cash-register" element={<CajaModule />} />
          <Route path="cash-register/:action" element={<CajaModule />} />
          <Route
            path="subscriptions"
            element={
              <FeatureRoute featureKey="subscriptions">
                <Subscriptions />
              </FeatureRoute>
            }
          />
          <Route
            path="subscriptions/:id"
            element={
              <FeatureRoute featureKey="subscriptions">
                <SubscriptionClientPage />
              </FeatureRoute>
            }
          />
          <Route
            path="suscripciones/:id"
            element={
              <FeatureRoute featureKey="subscriptions">
                <SubscriptionClientPage />
              </FeatureRoute>
            }
          />
          <Route path="finance" element={<Finance />} />
          <Route path="finance/:sectionId" element={<Finance />} />
          <Route path="finance/reports" element={<Reports />} />
          <Route path="finance/reports/:tabId" element={<Reports />} />
          <Route path="settings" element={<ConfiguracionPage />} />

          {/* Legacy Spanish URLs -> English canonical URLs */}
          <Route path="inventario/nuevo" element={<Navigate to="/inventory/new" replace />} />
          <Route path="inventario/pedidos" element={<Navigate to="/inventory/orders" replace />} />
          <Route path="inventario/producto/:id" element={<LegacyInventoryProductRedirect />} />
          <Route path="caja" element={<LegacyCashRouteRedirect />} />
          <Route path="caja/:action" element={<LegacyCashRouteRedirect />} />
          <Route path="finanzas" element={<LegacyFinanceRouteRedirect />} />
          <Route path="finanzas/:sectionId" element={<LegacyFinanceRouteRedirect />} />
          <Route path="finanzas/reportes" element={<LegacyReportsRouteRedirect />} />
          <Route path="finanzas/reportes/:tabId" element={<LegacyReportsRouteRedirect />} />
          <Route path="reports" element={<LegacyReportsRouteRedirect />} />
          <Route path="reports/:tabId" element={<LegacyReportsRouteRedirect />} />
          <Route path="configuracion" element={<Navigate to="/settings" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App