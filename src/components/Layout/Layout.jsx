import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { FaCashRegister, FaBox, FaClock, FaChartBar, FaCog, FaUserClock, FaUsers } from 'react-icons/fa'
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
  const { t } = useSettingsStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [setupBusinessName, setSetupBusinessName] = useState('')
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupError, setSetupError] = useState('')

  const user = useAuthStore(state => state.user)
  const subscriptionsEnabled = useTenantStore(state => state.featureFlags?.subscriptions)
  const navModuleOrder = useSettingsStore(state => state.navModuleOrder)
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

  const fixedMenuItems = [
    { path: '/', label: t('nav.currentSale'), icon: FaCashRegister, id: 'sale' }
  ]

  const reorderableMenuItems = [
    { path: '/inventory', label: t('nav.inventory'), icon: FaBox, id: 'inventory' },
    { path: '/clientes', label: t('nav.customers') || 'Clientes', icon: FaUsers, id: 'customers' },
    { path: '/finance', label: 'Finanzas', icon: FaChartBar, id: 'finance' },
    { path: '/pending', label: t('nav.pending'), icon: FaClock, id: 'pending' },
    ...(subscriptionsEnabled
      ? [{ path: '/subscriptions', label: t('nav.subscriptions'), icon: FaUserClock, id: 'subscriptions' }]
      : []),
    { path: '/settings', label: t('nav.settings'), icon: FaCog, id: 'settings' }
  ]

  const menuOrderMap = new Map((navModuleOrder || []).map((id, idx) => [id, idx]))
  const orderedModules = reorderableMenuItems
    .map((item, originalIdx) => ({ item, originalIdx }))
    .sort((a, b) => {
      const aOrder = menuOrderMap.has(a.item.id) ? menuOrderMap.get(a.item.id) : 999
      const bOrder = menuOrderMap.has(b.item.id) ? menuOrderMap.get(b.item.id) : 999
      if (aOrder === bOrder) return a.originalIdx - b.originalIdx
      return aOrder - bOrder
    })
    .map(({ item }) => item)

  const menuItems = [...fixedMenuItems, ...orderedModules]

  const getActiveId = () => {
    if (location.pathname === '/') return 'sale'
    if (location.pathname.startsWith('/inventory') || location.pathname.startsWith('/inventario')) return 'inventory'
    if (location.pathname.startsWith('/pending')) return 'pending'
    if (location.pathname.startsWith('/customers') || location.pathname.startsWith('/clientes')) return 'customers'
    if (location.pathname.startsWith('/subscriptions') || location.pathname.startsWith('/suscripciones')) {
      return subscriptionsEnabled ? 'subscriptions' : 'sale'
    }
    if (location.pathname.startsWith('/finance') || location.pathname.startsWith('/finanzas') || location.pathname.startsWith('/reports')) {
      return 'finance'
    }
    if (location.pathname.startsWith('/settings') || location.pathname.startsWith('/configuracion')) return 'settings'
    const exactMatch = menuItems.find((item) => location.pathname === item.path)
    if (exactMatch) return exactMatch.id
    const activeItem = menuItems.find(
      (item) => item.path !== '/' && location.pathname.startsWith(item.path)
    )
    return activeItem?.id || 'sale'
  }

  const activeId = getActiveId()
  const allowMobileScroll =
    location.pathname.startsWith('/cash-register') ||
    location.pathname.startsWith('/caja') ||
    location.pathname.startsWith('/inventory') ||
    location.pathname.startsWith('/inventario') ||
    location.pathname.startsWith('/subscriptions') ||
    location.pathname.startsWith('/suscripciones') ||
    location.pathname.startsWith('/customers') ||
    location.pathname.startsWith('/clientes') ||
    location.pathname.startsWith('/configuracion') ||
    location.pathname.startsWith('/finance') ||
    location.pathname.startsWith('/finanzas') ||
    location.pathname.startsWith('/settings') 
    

  const isMobileViewport = () => window.matchMedia('(max-width: 768px)').matches

  const handleNavigation = (path) => {
    navigate(path)
    setMobileSidebarOpen(false)
  }

  const handleSidebarToggle = () => {
    if (isMobileViewport()) {
      setMobileSidebarOpen(false)
      return
    }
    setSidebarCollapsed(!sidebarCollapsed)
  }

  const sidebarOffset = mobileSidebarOpen ? 0 : (sidebarCollapsed ? 64 : 240)

  return (
    <div
      className={`layout ${mobileSidebarOpen ? 'layout--mobile-nav-open' : ''}`}
      style={{ '--layout-sidebar-offset': `${sidebarOffset}px` }}
    >
      {/* Sidebar - Zone 1 */}
      <aside
        className={`layout__sidebar ${sidebarCollapsed && !mobileSidebarOpen ? 'layout__sidebar--collapsed' : ''} ${
          mobileSidebarOpen ? 'layout__sidebar--mobile-open' : ''
        }`}
      >
        <div className="sidebar__header">
          <div className="sidebar__logo">Moneymachine</div>
          <button
            className="sidebar__toggle"
            onClick={handleSidebarToggle}
            aria-label={t('layout.toggleSidebar')}
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

      {mobileSidebarOpen && <button type="button" className="layout__backdrop md:hidden" onClick={() => setMobileSidebarOpen(false)} aria-label="Cerrar menú" />}

      {/* Main Content - Zone 2 */}
      <main className={`layout__main ${allowMobileScroll ? 'layout__main--mobile-scroll' : ''}`}>
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
              aria-label={item.label}
              title={item.label}
            >
              <span className="layout__bottom-nav-btn-icon">
                <IconComponent />
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default Layout