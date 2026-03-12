import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import CurrentSale from './components/CurrentSale/CurrentSale'
import { InventarioPage } from './pages/inventario/InventarioPage'
import { ProductoDetallesPage } from './pages/inventario/ProductoDetallesPage'
import { PedidosInventarioPage } from './pages/inventario/PedidosInventarioPage'
import { InventoryNewPage } from './components/Inventory/InventoryNewPage'
import Pending from './components/Pending/Pending'
import Reports from './components/Reports/Reports'
import Finance from './components/Finance/Finance'
import Subscriptions from './components/Subscriptions/Subscriptions'
import { ConfiguracionPage } from './pages/configuracion/ConfiguracionPage'
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
          <Route path="inventory" element={<InventarioPage />} />
          <Route path="inventory/producto/:id" element={<ProductoDetallesPage />} />
          <Route path="inventory/pedidos" element={<PedidosInventarioPage />} />
          <Route path="inventario/nuevo" element={<InventoryNewPage />} />
          <Route path="pending" element={<Pending />} />
          <Route
            path="subscriptions"
            element={
              <FeatureRoute featureKey="subscriptions">
                <Subscriptions />
              </FeatureRoute>
            }
          />
          <Route path="finanzas" element={<Finance />} />
          <Route path="finanzas/:sectionId" element={<Finance />} />
          <Route path="finanzas/reportes" element={<Reports />} />
          <Route path="finanzas/reportes/:tabId" element={<Reports />} />
          <Route path="reports" element={<Navigate to="/finanzas/reportes" replace />} />
          <Route path="reports/:tabId" element={<Navigate to="/finanzas/reportes" replace />} />
          <Route path="configuracion" element={<ConfiguracionPage />} />
          <Route path="settings" element={<Navigate to="/configuracion" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App