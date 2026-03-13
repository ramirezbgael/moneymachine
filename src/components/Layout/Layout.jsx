import React, { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { FaCashRegister, FaBox, FaClock, FaChartBar, FaCog, FaUserClock, FaEllipsisH } from 'react-icons/fa'
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
  const [showMoreModules, setShowMoreModules] = useState(false)
  const [setupBusinessName, setSetupBusinessName] = useState('')
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupError, setSetupError] = useState('')

  const user = useAuthStore(state => state.user)
  const subscriptionsEnabled = useTenantStore(state => state.featureFlags?.subscriptions)
  const navModuleOrder = useSettingsStore(state => state.navModuleOrder)
  const { currentTenantId, currentTenant, loading: tenantLoading, error: tenantError, loadTenants } = useTenantStore()
  const signOut = useAuthStore(state => state.signOut)

  useEffect(() => {
    setShowMoreModules(false)
  }, [location.pathname])

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

  const visiblePrimaryModules = orderedModules.slice(0, 2)
  const overflowOrderedModules = orderedModules.slice(2)

  const pendingModuleItem = reorderableMenuItems.find((item) => item.id === 'pending') || null
  const moreModuleItems = [
    pendingModuleItem,
    ...overflowOrderedModules.filter((item) => item.id !== 'pending')
  ].filter(Boolean)

  const menuItems = [
    ...fixedMenuItems,
    ...visiblePrimaryModules,
    { path: '/modules', label: 'Más módulos', icon: FaEllipsisH, id: 'more', type: 'more' }
  ]

  const overflowModuleIds = new Set(moreModuleItems.map((item) => item.id))
  const directModuleIds = new Set(menuItems.map((item) => item.id))
  const activeMoreModuleId = moreModuleItems.find((item) => {
    if (location.pathname.startsWith(item.path)) return true
    if (item.id === 'subscriptions' && location.pathname.startsWith('/suscripciones')) return true
    return false
  })?.id || null

  const mobileTabItems = menuItems

  const getActiveId = () => {
    if (location.pathname.startsWith('/inventory')) return directModuleIds.has('inventory') ? 'inventory' : 'more'
    if (location.pathname.startsWith('/inventario')) return directModuleIds.has('inventory') ? 'inventory' : 'more'
    if (location.pathname.startsWith('/pending')) return directModuleIds.has('pending') ? 'pending' : 'more'
    if (location.pathname.startsWith('/subscriptions') || location.pathname.startsWith('/suscripciones')) return directModuleIds.has('subscriptions') ? 'subscriptions' : 'more'
    if (location.pathname.startsWith('/finance') || location.pathname.startsWith('/finanzas') || location.pathname.startsWith('/reports')) {
      return directModuleIds.has('finance') ? 'finance' : 'more'
    }
    if (location.pathname.startsWith('/settings') || location.pathname.startsWith('/configuracion')) {
      return overflowModuleIds.has('settings') ? 'more' : 'settings'
    }
    if (location.pathname === '/') return 'sale'
    // Check for exact match first, then startsWith
    const exactMatch = menuItems.find(item => location.pathname === item.path)
    if (exactMatch) return exactMatch.id
    const activeItem = menuItems.find(item => 
      item.path !== '/' && location.pathname.startsWith(item.path)
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
    location.pathname.startsWith('/configuracion') ||
    location.pathname.startsWith('/finance') ||
    location.pathname.startsWith('/finanzas') ||
    location.pathname.startsWith('/settings') 
    

  const isMobileViewport = () => window.matchMedia('(max-width: 768px)').matches

  const handleNavigation = (path) => {
    navigate(path)
    setMobileSidebarOpen(false)
    setShowMoreModules(false)
  }

  const handleMoreModulesToggle = () => {
    if (!moreModuleItems.length) return
    if (!isMobileViewport() && sidebarCollapsed) {
      setSidebarCollapsed(false)
      setShowMoreModules(true)
      return
    }
    setShowMoreModules((current) => !current)
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

              if (item.type === 'more') {
                const isExpanded = showMoreModules || Boolean(activeMoreModuleId)
                return (
                  <li key={item.id} className="sidebar__menu-group">
                    <button
                      className={`sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}
                      onClick={handleMoreModulesToggle}
                      title={sidebarCollapsed ? item.label : undefined}
                      disabled={!moreModuleItems.length}
                    >
                      <span className="sidebar__icon">
                        <IconComponent />
                      </span>
                      {!sidebarCollapsed && (
                        <>
                          <span className="sidebar__label">{item.label}</span>
                        </>
                      )}
                    </button>

                    {!sidebarCollapsed && isExpanded && moreModuleItems.length > 0 && (
                      <div className="sidebar__subnav">
                        {moreModuleItems.map((subItem) => {
                          const SubIcon = subItem.icon
                          const isSubActive = activeMoreModuleId === subItem.id
                          return (
                            <button
                              key={subItem.id}
                              type="button"
                              className={`sidebar__subitem ${isSubActive ? 'sidebar__subitem--active' : ''}`}
                              onClick={() => handleNavigation(subItem.path)}
                            >
                              <span className="sidebar__subitem-icon">
                                <SubIcon />
                              </span>
                              <span className="sidebar__subitem-label">{subItem.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </li>
                )
              }

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
        {mobileTabItems.map((item) => {
          const IconComponent = item.icon
          const isActive = activeId === item.id
          const isMoreButton = item.type === 'more'
          return (
            <button
              key={item.id}
              type="button"
              className={`layout__bottom-nav-btn ${
                isActive ? 'layout__bottom-nav-btn--active' : ''
              }`}
              onClick={() => (isMoreButton ? handleMoreModulesToggle() : handleNavigation(item.path))}
              aria-label={item.label}
              title={item.label}
              disabled={isMoreButton && !moreModuleItems.length}
            >
              <span className="layout__bottom-nav-btn-icon">
                <IconComponent />
              </span>
            </button>
          )
        })}

        {showMoreModules && moreModuleItems.length > 0 && (
          <div className="layout__bottom-nav-sheet">
            <div className="layout__bottom-nav-sheet-head">
              <span>Más módulos</span>
              <button type="button" onClick={() => setShowMoreModules(false)} aria-label="Cerrar más módulos">Cerrar</button>
            </div>
            <div className="layout__bottom-nav-sheet-list">
              {moreModuleItems.map((item) => {
                const IconComponent = item.icon
                const isSubActive = activeMoreModuleId === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`layout__bottom-nav-sheet-item ${isSubActive ? 'layout__bottom-nav-sheet-item--active' : ''}`}
                    onClick={() => handleNavigation(item.path)}
                  >
                    <span className="layout__bottom-nav-sheet-item-icon">
                      <IconComponent />
                    </span>
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </nav>
    </div>
  )
}

export default Layout