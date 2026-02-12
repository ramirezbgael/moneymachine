import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { FaCashRegister, FaBox, FaClock, FaChartBar, FaCog } from 'react-icons/fa'
import { useSettingsStore } from '../../store/settingsStore'
import { useTenantStore } from '../../store/tenantStore'
import { useAuthStore } from '../../store/authStore'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import './Layout.css'

/**
 * Main Layout Component
 * 3-zone structure: Sidebar | Content | Right Panel (prepared)
 */
const Layout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [setupBusinessName, setSetupBusinessName] = useState('')
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupError, setSetupError] = useState('')

  const t = useSettingsStore(state => state.t)
  const user = useAuthStore(state => state.user)
  const { currentTenantId, currentTenant, loading: tenantLoading, error: tenantError, loadTenants } = useTenantStore()
  const signOut = useAuthStore(state => state.signOut)

  const handleCreateBusiness = async () => {
    const name = setupBusinessName.trim()
    if (!name || !user?.id || !isSupabaseConfigured() || !supabase) return
    setSetupLoading(true)
    setSetupError('')
    try {
      const { error } = await supabase.rpc('create_tenant_and_join', {
        p_name: name,
        p_slug: null
      })
      if (error) throw error
      await loadTenants(user.id)
    } catch (err) {
      setSetupError(err?.message || 'No se pudo crear el negocio.')
    } finally {
      setSetupLoading(false)
    }
  }

  if (tenantLoading && !currentTenantId) {
    return (
      <div className="layout" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
        <p>Loading...</p>
      </div>
    )
  }
  if (tenantError && !currentTenantId) {
    return (
      <div className="layout" style={{
        alignItems: 'center',
        justifyContent: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: 24,
        maxWidth: 400,
        margin: '0 auto'
      }}>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
          No tienes un negocio asignado. Crea uno para continuar.
        </p>
        {isSupabaseConfigured() && supabase && user && (
          <>
            <input
              type="text"
              value={setupBusinessName}
              onChange={(e) => setSetupBusinessName(e.target.value)}
              placeholder="Nombre del negocio"
              className="settings__input"
              style={{ width: '100%' }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBusiness()}
            />
            {setupError && <p style={{ color: '#f85149', fontSize: 14 }}>{setupError}</p>}
            <button
              className="settings__button settings__button--primary"
              onClick={handleCreateBusiness}
              disabled={setupLoading || !setupBusinessName.trim()}
            >
              {setupLoading ? 'Creando…' : 'Crear mi negocio'}
            </button>
          </>
        )}
        <button
          className="settings__button settings__button--danger"
          onClick={() => signOut().then(() => navigate('/login'))}
        >
          Cerrar sesión
        </button>
      </div>
    )
  }

  // Detectar modo demo y ajustar rutas
  const isDemoMode = location.pathname.startsWith('/demo')
  const baseRoute = isDemoMode ? '/demo' : ''
  
  const menuItems = [
    { path: `${baseRoute}/`, label: t('nav.currentSale'), icon: FaCashRegister, id: 'sale' },
    { path: `${baseRoute}/inventory`, label: t('nav.inventory'), icon: FaBox, id: 'inventory' },
    { path: `${baseRoute}/pending`, label: t('nav.pending'), icon: FaClock, id: 'pending' },
    { path: `${baseRoute}/reports`, label: t('nav.reports'), icon: FaChartBar, id: 'reports' },
    { path: `${baseRoute}/configuracion`, label: t('nav.settings'), icon: FaCog, id: 'settings' }
  ]

  const getActiveId = () => {
    const path = location.pathname.replace(/^\/demo/, '') || '/'
    if (path.startsWith('/inventario') || path.startsWith('/inventory')) return 'inventory'
    if (path.startsWith('/pending')) return 'pending'
    if (path.startsWith('/reports')) return 'reports'
    if (path.startsWith('/configuracion') || path.startsWith('/settings')) return 'settings'
    if (path === '/') return 'sale'
    // Check for exact match first, then startsWith
    const exactMatch = menuItems.find(item => location.pathname === item.path)
    if (exactMatch) return exactMatch.id
    const activeItem = menuItems.find(item => 
      item.path !== '/' && location.pathname.startsWith(item.path)
    )
    return activeItem?.id || 'sale'
  }

  const activeId = getActiveId()

  const handleNavigation = (path) => {
    navigate(path)
    setMobileSidebarOpen(false)
  }

  return (
    <div className="layout">
      {/* Sidebar - Zone 1 */}
      <aside
        className={`layout__sidebar ${sidebarCollapsed ? 'layout__sidebar--collapsed' : ''} ${
          mobileSidebarOpen ? 'layout__sidebar--mobile-open' : ''
        }`}
      >
        <div className="sidebar__header">
          <div className="sidebar__logo">Moneymachine</div>
          <button
            className="sidebar__toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label="Toggle sidebar width"
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar__nav">
          <ul className="sidebar__menu">
            {menuItems.map((item) => {
              const IconComponent = item.icon
              const isActive = activeId === item.id
              return (
                <li key={item.id}>
                  <button
                    className={`sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}
                    onClick={() => handleNavigation(item.path)}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <span className="sidebar__icon">
                      <IconComponent />
                    </span>
                    {!sidebarCollapsed && (
                      <span className="sidebar__label">{item.label}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            {!sidebarCollapsed && (
              <div className="sidebar__user-info">
                <div className="sidebar__user-name">{currentTenant?.name || 'POS'}</div>
                <div className="sidebar__user-role">Cashier</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content - Zone 2 */}
      <main className="layout__main">
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/10">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="text-white/80"
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <div className="text-sm text-white/70">{currentTenant?.name || 'Moneymachine'}</div>
        </div>
        <Outlet />
      </main>

      {/* Right Panel - Zone 3 (Prepared for future use) */}
      <aside className="layout__right-panel">
        {/* Reserved for contextual panels, product details, quick actions */}
      </aside>

      {/* Bottom nav for mobile */}
      <nav className="layout__bottom-nav md:hidden">
        {menuItems.map((item) => {
          const IconComponent = item.icon
          const isActive = activeId === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={`layout__bottom-nav-btn ${
                isActive ? 'layout__bottom-nav-btn--active' : ''
              }`}
              onClick={() => handleNavigation(item.path)}
            >
              <span className="layout__bottom-nav-btn-icon">
                <IconComponent />
              </span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default Layout