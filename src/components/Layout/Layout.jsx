import React, { useState, useEffect, useCallback } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { FaCashRegister, FaBox, FaClock, FaChartBar, FaCog, FaUserClock, FaUsers } from 'react-icons/fa'
import { useSettingsStore } from '../../store/settingsStore'
import { useTenantStore } from '../../store/tenantStore'
import { useAuthStore } from '../../store/authStore'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Sidebar } from '../pos/Sidebar'
import { LayoutNavProvider } from '../../context/LayoutNavContext'
import { PosOnboardingTutorial } from '../Onboarding/PosOnboardingTutorial'
import { TrialBanner } from './TrialBanner'
import './Layout.css'

const ONBOARDING_PENDING_KEY = 'mm_onboarding_pending'

function onboardingDoneStorageKey(userId, tenantId) {
  return `mm_onboarding_done_${userId}_${tenantId}`
}

/**
 * Main Layout Component
 * 3-zone structure: Sidebar | Content | Right Panel (prepared)
 */
const Layout = () => {
  const { t } = useSettingsStore()
  const printerBusinessName = useSettingsStore(state => state.businessName)
  const setPrinterSettings = useSettingsStore(state => state.setPrinterSettings)
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [setupBusinessName, setSetupBusinessName] = useState('')
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupError, setSetupError] = useState('')

  const user = useAuthStore(state => state.user)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const subscriptionsEnabled = useTenantStore(state => state.featureFlags?.subscriptions)
  const navModuleOrder = useSettingsStore(state => state.navModuleOrder)
  const {
    currentTenantId,
    currentTenant,
    loading: tenantLoading,
    error: tenantError,
    debug: tenantDebug,
    loadTenants,
    bootstrapTenantFromRpc
  } = useTenantStore()
  const signOut = useAuthStore(state => state.signOut)

  const [onboardingOpen, setOnboardingOpen] = useState(false)

  const dismissOnboarding = useCallback(() => {
    try {
      sessionStorage.removeItem(ONBOARDING_PENDING_KEY)
      if (user?.id && currentTenantId) {
        localStorage.setItem(onboardingDoneStorageKey(user.id, currentTenantId), '1')
      }
    } catch {
      /* ignore */
    }
    setOnboardingOpen(false)
  }, [user?.id, currentTenantId])

  useEffect(() => {
    if (!currentTenantId || !user?.id) return
    try {
      const pending = sessionStorage.getItem(ONBOARDING_PENDING_KEY) === '1'
      const alreadyDone = localStorage.getItem(onboardingDoneStorageKey(user.id, currentTenantId)) === '1'
      if (pending && !alreadyDone) {
        setOnboardingOpen(true)
      }
    } catch {
      /* ignore */
    }
  }, [currentTenantId, user?.id])

  const handleCreateBusiness = async () => {
    const name = setupBusinessName.trim()
    if (!name || !user?.id || !isSupabaseConfigured() || !supabase) return
    setSetupLoading(true)
    setSetupError('')
    try {
      const rpc = await supabase.rpc('create_tenant_and_join', {
        p_name: name,
        p_slug: null
      })
      if (rpc.error) throw rpc.error
      const rawId = rpc.data
      const newBusinessId =
        typeof rawId === 'string'
          ? rawId
          : rawId != null && typeof rawId !== 'object'
            ? String(rawId)
            : null
      if (!newBusinessId) {
        throw new Error('La creación del negocio no devolvió un identificador. Intenta de nuevo.')
      }
      await bootstrapTenantFromRpc({
        id: newBusinessId,
        name,
        slug: null
      })
      // Guardar nombre comercial para tickets/sidebar como respaldo inmediato.
      setPrinterSettings({ businessName: name })
      // Dar tiempo a que el membership sea visible para SELECT antes de recargar (evita pisar el bootstrap).
      await new Promise((r) => setTimeout(r, 400))
      await loadTenants(user.id)
      // Segundo intento: a veces el primer SELECT tras la RPC aún no ve el membership.
      setTimeout(() => {
        loadTenants(user.id)
      }, 2000)
      try {
        sessionStorage.setItem(ONBOARDING_PENDING_KEY, '1')
      } catch {
        /* ignore */
      }
    } catch (err) {
      setSetupError(err?.message || 'No se pudo crear el negocio.')
    } finally {
      setSetupLoading(false)
    }
  }

  if (tenantLoading && !currentTenantId) {
    return (
      <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-[#0a0a0a] px-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-[rgb(82_196_138/0.2)] border-t-[#52c48a]"
          aria-hidden
        />
        <p className="mt-4 text-sm text-[#7d948a]">Cargando tu espacio de trabajo…</p>
      </div>
    )
  }
  // Hueco: auth ya hidratada pero checkSession aún no llamó a loadTenants (sin error = no sabemos si hay negocio).
  if (isAuthenticated && user && !currentTenantId && !tenantError && !tenantLoading) {
    return (
      <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-[#0a0a0a] px-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-[rgb(82_196_138/0.2)] border-t-[#52c48a]"
          aria-hidden
        />
        <p className="mt-4 text-sm text-[#7d948a]">Cargando tu espacio de trabajo…</p>
      </div>
    )
  }
  if (tenantError && !currentTenantId) {
    const isNetworkLikeError = /load failed|failed to fetch|network|fetch|cors|access control/i.test(
      String(tenantError || '')
    )
    return (
      <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-[#0a0a0a] px-4 py-10">
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[rgb(82_196_138/0.18)] bg-[#0f1715] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-[rgb(82_196_138/0.08)]">
          <span
            className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#6ee7a8] to-[#52c48a]"
            aria-hidden
          />
          <div className="pl-2">
            <h1 className="text-xl font-semibold tracking-tight text-[#e8ede9]">
              {isNetworkLikeError ? 'Conexión requerida' : 'Crea tu negocio'}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#7d948a]">
              {isNetworkLikeError
                ? 'No pudimos conectar con Supabase. Esto suele ser CORS/origen incorrecto. Reintenta cuando esté estable.'
                : 'No tienes un negocio asignado. Elige un nombre para empezar a usar el punto de venta.'}
            </p>
            <details className="mt-4 rounded-xl bg-[rgba(255,255,255,0.03)] p-3 ring-1 ring-inset ring-[rgba(255,255,255,0.06)]">
              <summary className="cursor-pointer text-xs font-semibold tracking-wide text-[#9db2a9]">
                Diagnóstico (solo dev)
              </summary>
              <div className="mt-2 space-y-2 text-xs text-[#7d948a]">
                <div><span className="text-[#9db2a9]">userId:</span> {user?.id || '—'}</div>
                <div><span className="text-[#9db2a9]">supabase:</span> {isSupabaseConfigured() && supabase ? 'on' : 'off'}</div>
                <div><span className="text-[#9db2a9]">tenantError:</span> {String(tenantError)}</div>
                {tenantDebug && (
                  <pre className="max-h-40 overflow-auto rounded-lg bg-[rgba(0,0,0,0.25)] p-2 text-[11px] text-[#b9c8c0]">
                    {JSON.stringify(tenantDebug, null, 2)}
                  </pre>
                )}
                <button
                  type="button"
                  className="mt-1 rounded-lg bg-[rgba(82,196,138,0.14)] px-3 py-2 text-xs font-semibold text-[#c8f7df] ring-1 ring-inset ring-[rgba(82,196,138,0.22)]"
                  onClick={() => user?.id && loadTenants(user.id)}
                >
                  Reintentar cargar negocio
                </button>
              </div>
            </details>

            {isNetworkLikeError ? (
              <button
                type="button"
                className="mt-6 w-full rounded-2xl bg-gradient-to-b from-[#5fd4a0] to-[#52c48a] py-3.5 text-sm font-bold text-[#0a1f16] shadow-[0_0_28px_rgba(82,196,138,0.35)] transition hover:brightness-105"
                onClick={() => user?.id && loadTenants(user.id)}
              >
                Reintentar conexión
              </button>
            ) : isSupabaseConfigured() && supabase && user ? (
              <>
                <label htmlFor="setup-business-name" className="mt-6 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7d948a]">
                  Nombre del negocio
                </label>
                <input
                  id="setup-business-name"
                  type="text"
                  value={setupBusinessName}
                  onChange={(e) => setSetupBusinessName(e.target.value)}
                  placeholder="Ej. Mi tienda, Cafetería Centro…"
                  autoComplete="organization"
                  className="mt-2 w-full rounded-2xl border-0 bg-[rgb(20_30_27)] px-4 py-3.5 text-[#e8ede9] shadow-[inset_0_2px_10px_rgba(0,0,0,0.35)] ring-1 ring-inset ring-[rgb(82_196_138/0.15)] placeholder:text-[#5c6f66] focus:outline-none focus:ring-2 focus:ring-[rgb(82_196_138/0.45)]"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateBusiness()}
                />
                {setupError && (
                  <p className="mt-3 rounded-xl bg-[rgba(248,113,113,0.08)] px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-500/25">
                    {setupError}
                  </p>
                )}
                <button
                  type="button"
                  className="mt-6 w-full rounded-2xl bg-gradient-to-b from-[#5fd4a0] to-[#52c48a] py-3.5 text-sm font-bold text-[#0a1f16] shadow-[0_0_28px_rgba(82,196,138,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                  onClick={handleCreateBusiness}
                  disabled={setupLoading || !setupBusinessName.trim()}
                >
                  {setupLoading ? 'Creando…' : 'Crear mi negocio'}
                </button>
              </>
            ) : (
              <p className="mt-6 text-sm text-[#7d948a]">
                La aplicación no está conectada al servidor. Revisa la configuración o contacta soporte.
              </p>
            )}

            <button
              type="button"
              className="mt-4 w-full py-2.5 text-center text-sm font-medium text-[#7d948a] transition hover:text-[#c4d4cc]"
              onClick={() => signOut().then(() => navigate('/login'))}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
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
  const isPosHome = location.pathname === '/'

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
        <Sidebar
          collapsed={sidebarCollapsed && !mobileSidebarOpen}
          mobileOpen={mobileSidebarOpen}
          onToggle={handleSidebarToggle}
          menuItems={menuItems}
          activeId={activeId}
          onNavigate={handleNavigation}
          t={t}
          currentTenantName={currentTenant?.name}
          fallbackBusinessName={printerBusinessName}
        />
      </aside>

      {mobileSidebarOpen && <button type="button" className="layout__backdrop md:hidden" onClick={() => setMobileSidebarOpen(false)} aria-label="Cerrar menú" />}

      {/* Main Content - Zone 2 */}
      <main
        className={`layout__main ${allowMobileScroll ? 'layout__main--mobile-scroll' : ''} ${
          isPosHome ? 'layout__main--pos' : ''
        }`}
      >
        <LayoutNavProvider
          openMobileSidebar={() => setMobileSidebarOpen(true)}
          closeMobileSidebar={() => setMobileSidebarOpen(false)}
        >
          <TrialBanner />
          <div className="layout__outlet">
            <Outlet />
          </div>
        </LayoutNavProvider>
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

      <PosOnboardingTutorial open={onboardingOpen} onDismiss={dismissOnboarding} />
    </div>
  )
}

export default Layout