import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import CurrentSale from './components/CurrentSale/CurrentSale'
import { InventarioPage } from './pages/inventario/InventarioPage'
import { ProductoDetallesPage } from './pages/inventario/ProductoDetallesPage'
import { PedidosInventarioPage } from './pages/inventario/PedidosInventarioPage'
import { InventoryNewPage } from './components/inventory/InventoryNewPage'
import Pending from './components/Pending/Pending'
import Reports from './components/Reports/Reports'
import { ConfiguracionPage } from './pages/configuracion/ConfiguracionPage'
import Login from './components/Auth/Login'
import Register from './components/Auth/Register'
import { useAuthStore } from './store/authStore'
import './App.css'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
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
          <Route path="reports" element={<Reports />} />
          <Route path="configuracion" element={<ConfiguracionPage />} />
          <Route path="settings" element={<Navigate to="/configuracion" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App