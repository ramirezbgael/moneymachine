import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import { useSettingsStore } from './store/settingsStore'
import './App.css'
import './components/Demo/DemoMode.css'

// Banner verde para modo demo
function DemoBanner() {
  const location = useLocation()
  if (!location.pathname.startsWith('/demo')) return null
  
  return (
    <div className="demo-banner">
      <span className="demo-banner__badge">DEMO</span>
      <span className="demo-banner__text">Modo demostración - Datos de prueba</span>
    </div>
  )
}

// Protected Route Component - bypass auth en /demo
const ProtectedRoute = ({ children }) => {
  const location = useLocation()
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const signIn = useAuthStore(state => state.signIn)
  const setLanguage = useSettingsStore(state => state.setLanguage)
  
  const isDemoMode = location.pathname.startsWith('/demo')

  useEffect(() => {
    if (isDemoMode && !isAuthenticated) {
      // Forzar autenticación demo sin Supabase
      const demoState = {
        user: { id: 'demo-user', email: 'demo@zonasist.com' },
        session: { access_token: 'demo-token' },
        isAuthenticated: true,
        isLoading: false
      }
      useAuthStore.setState(demoState)
      setLanguage('es')
      if (!localStorage.getItem('sales')) {
        const now = Date.now()
        localStorage.setItem('sales', JSON.stringify([
          {
            id: 'demo-1',
            sale_number: 'DEMO-001',
            created_at: new Date(now - 2 * 3600000).toISOString(),
            status: 'pending',
            payment_method: null,
            subtotal: 772,
            tax: 0,
            total: 772,
            sale_items: [
              { quantity: 1, product: { name: 'Mouse Logitech M170', code: 'MOUSE-LOG', price: 185 }, unitPrice: 185, subtotal: 185 },
              { quantity: 1, product: { name: 'Memoria USB Kingston 32GB', code: 'USB-32GB', price: 145 }, unitPrice: 145, subtotal: 145 },
              { quantity: 2, product: { name: 'Papel bond carta 500 hojas', code: 'PAPEL-A4', price: 85 }, unitPrice: 85, subtotal: 170 },
              { quantity: 1, product: { name: 'Teclado HP USB', code: 'TECLADO-HP', price: 220 }, unitPrice: 220, subtotal: 220 },
              { quantity: 18, product: { name: 'Impresión B/N', code: 'PRINT-BN', price: 2 }, unitPrice: 2, subtotal: 36 },
              { quantity: 8, product: { name: 'Internet 1 hora', code: 'INTERNET-1H', price: 15 }, unitPrice: 15, subtotal: 120 },
            ],
          },
          {
            id: 'demo-2',
            sale_number: 'DEMO-002',
            created_at: new Date(now - 5 * 3600000).toISOString(),
            status: 'pending',
            payment_method: 'Efectivo',
            subtotal: 1270,
            tax: 0,
            total: 1270,
            sale_items: [
              { quantity: 1, product: { name: 'Disco duro WD Blue 1TB', code: 'HDD-1TB', price: 850 }, unitPrice: 850, subtotal: 850 },
              { quantity: 2, product: { name: 'Cable HDMI 1.8m', code: 'CABLE-HDMI', price: 95 }, unitPrice: 95, subtotal: 190 },
              { quantity: 1, product: { name: 'Teclado HP USB', code: 'TECLADO-HP', price: 220 }, unitPrice: 220, subtotal: 220 },
              { quantity: 4, product: { name: 'Internet 1 hora', code: 'INTERNET-1H', price: 15 }, unitPrice: 15, subtotal: 60 },
            ],
          },
          {
            id: 'demo-3',
            sale_number: 'DEMO-003',
            created_at: new Date(now - 24 * 3600000).toISOString(),
            status: 'pending',
            payment_method: null,
            subtotal: 520,
            tax: 0,
            total: 520,
            sale_items: [
              { quantity: 1, product: { name: 'SSD Kingston A400 240GB', code: 'SSD-240', price: 520 }, unitPrice: 520, subtotal: 520 },
            ],
          },
          // Ventas completadas del día (para reportes)
          {
            id: 'demo-complete-1',
            sale_number: 'DEMO-C001',
            created_at: new Date(now - 3600000).toISOString(),
            status: 'completed',
            payment_method: 'Tarjeta',
            subtotal: 1225,
            tax: 0,
            total: 1225,
            sale_items: [
              { quantity: 1, product: { name: 'Monitor Samsung 24"', code: 'MONITOR-24', price: 2450 }, unitPrice: 2450, subtotal: 2450 },
            ],
          },
          {
            id: 'demo-complete-2',
            sale_number: 'DEMO-C002',
            created_at: new Date(now - 7200000).toISOString(),
            status: 'completed',
            payment_method: 'Efectivo',
            subtotal: 420,
            tax: 0,
            total: 420,
            sale_items: [
              { quantity: 1, product: { name: 'Memoria RAM DDR4 8GB', code: 'RAM-8GB', price: 420 }, unitPrice: 420, subtotal: 420 },
            ],
          },
          {
            id: 'demo-complete-3',
            sale_number: 'DEMO-C003',
            created_at: new Date(now - 10800000).toISOString(),
            status: 'completed',
            payment_method: 'Transferencia',
            subtotal: 465,
            tax: 0,
            total: 465,
            sale_items: [
              { quantity: 3, product: { name: 'Papel bond carta 500 hojas', code: 'PAPEL-A4', price: 85 }, unitPrice: 85, subtotal: 255 },
              { quantity: 6, product: { name: 'Cuaderno profesional 100 hojas', code: 'CUADERNO-100', price: 32 }, unitPrice: 32, subtotal: 192 },
              { quantity: 18, product: { name: 'Impresión B/N', code: 'PRINT-BN', price: 2 }, unitPrice: 2, subtotal: 36 },
            ],
          },
          {
            id: 'demo-complete-4',
            sale_number: 'DEMO-C004',
            created_at: new Date(now - 14400000).toISOString(),
            status: 'completed',
            payment_method: 'Efectivo',
            subtotal: 850,
            tax: 0,
            total: 850,
            sale_items: [
              { quantity: 1, product: { name: 'Webcam Logitech C270 HD', code: 'WEBCAM-LOG', price: 450 }, unitPrice: 450, subtotal: 450 },
              { quantity: 1, product: { name: 'Audífonos HP con micrófono', code: 'AUDIFONOS-HP', price: 280 }, unitPrice: 280, subtotal: 280 },
              { quantity: 8, product: { name: 'Internet 1 hora', code: 'INTERNET-1H', price: 15 }, unitPrice: 15, subtotal: 120 },
            ],
          },
          {
            id: 'demo-complete-5',
            sale_number: 'DEMO-C005',
            created_at: new Date(now - 18000000).toISOString(),
            status: 'completed',
            payment_method: 'Tarjeta',
            subtotal: 1780,
            tax: 0,
            total: 1780,
            sale_items: [
              { quantity: 2, product: { name: 'SSD Kingston A400 240GB', code: 'SSD-240', price: 520 }, unitPrice: 520, subtotal: 1040 },
              { quantity: 2, product: { name: 'Memoria USB Kingston 32GB', code: 'USB-32GB', price: 145 }, unitPrice: 145, subtotal: 290 },
              { quantity: 1, product: { name: 'Webcam Logitech C270 HD', code: 'WEBCAM-LOG', price: 450 }, unitPrice: 450, subtotal: 450 },
            ],
          },
        ]))
      }
    }
  }, [isDemoMode, isAuthenticated, signIn, setLanguage])

  if (isDemoMode) {
    return children
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  return (
    <BrowserRouter>
      <DemoBanner />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Demo mode (sin auth) */}
        <Route path="/demo" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<CurrentSale />} />
          <Route path="inventory" element={<InventarioPage />} />
          <Route path="inventory/producto/:id" element={<ProductoDetallesPage />} />
          <Route path="inventory/pedidos" element={<PedidosInventarioPage />} />
          <Route path="inventario/nuevo" element={<InventoryNewPage />} />
          <Route path="pending" element={<Pending />} />
          <Route path="reports" element={<Reports />} />
          <Route path="configuracion" element={<ConfiguracionPage />} />
        </Route>
        
        {/* Rutas normales (con auth) */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
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