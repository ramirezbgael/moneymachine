import React from 'react'
import { FaMoon, FaSun, FaArrowUp, FaArrowDown } from 'react-icons/fa'
import { useSettingsStore } from '../../store/settingsStore'
import { useTenantStore } from '../../store/tenantStore'

const NAV_REORDERABLE_MODULES = [
  { id: 'inventory', label: 'Inventario' },
  { id: 'customers', label: 'Clientes' },
  { id: 'finance', label: 'Finanzas' },
  { id: 'pending', label: 'Ventas pendientes' },
  { id: 'subscriptions', label: 'Suscripciones' },
  { id: 'settings', label: 'Configuración' }
]

const buildOrderedNavModules = (modules, order = []) => {
  const byId = new Map(modules.map((item) => [item.id, item]))
  const seen = new Set<string>()
  const sorted = []

  order.forEach((id) => {
    if (!byId.has(id) || seen.has(id)) return
    seen.add(id)
    sorted.push(byId.get(id))
  })

  modules.forEach((item) => {
    if (!seen.has(item.id)) sorted.push(item)
  })

  return sorted.filter(Boolean)
}

export function AppearanceSettings() {
  const subscriptionsEnabled = useTenantStore((state) => state.featureFlags?.subscriptions)
  const {
    theme,
    setTheme,
    showFeaturedProducts,
    setShowFeaturedProducts,
    showPosProductCatalog,
    setShowPosProductCatalog,
    navModuleOrder,
    setNavModuleOrder,
    t
  } = useSettingsStore()

  const reorderableModules = NAV_REORDERABLE_MODULES.filter((item) => {
    if (item.id === 'subscriptions') {
      return subscriptionsEnabled
    }
    return true
  })

  const orderedModules = buildOrderedNavModules(reorderableModules, navModuleOrder)

  const moveModule = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1
    if (nextIndex < 0 || nextIndex >= orderedModules.length) return

    const next = [...orderedModules]
    const [moved] = next.splice(index, 1)
    next.splice(nextIndex, 0, moved)
    setNavModuleOrder(next.map((item) => item.id))
  }

  return (
    <div className="space-y-4">
      <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
        {t('settings.theme')}
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm border transition-all ${
            theme === 'dark'
              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_0_14px_var(--accent-glow)]'
              : 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--muted)] hover:border-[var(--accent-soft)] hover:text-[var(--text)]'
          }`}
        >
          <FaMoon className="text-sm" />
          <span>{t('settings.darkMode')}</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm border transition-all ${
            theme === 'light'
              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_0_14px_var(--accent-glow)]'
              : 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--muted)] hover:border-[var(--accent-soft)] hover:text-[var(--text)]'
          }`}
        >
          <FaSun className="text-sm" />
          <span>{t('settings.lightMode')}</span>
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
          Venta actual
        </div>
        <label className="flex items-center justify-between gap-4 cursor-pointer select-none">
          <div>
            <p className="text-sm font-medium text-[var(--text)]">Productos destacados</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Muestra una barra de acceso rápido con fotos de tus productos más vendidos.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showFeaturedProducts}
            onClick={() => setShowFeaturedProducts(!showFeaturedProducts)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none ${
              showFeaturedProducts
                ? 'border-[var(--accent)] bg-[var(--accent)]'
                : 'border-[var(--border)] bg-[var(--panel-2)]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                showFeaturedProducts ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>

        <label className="flex items-center justify-between gap-4 cursor-pointer select-none">
          <div>
            <p className="text-sm font-medium text-[var(--text)]">Catálogo de productos</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Si está activo, se muestra la rejilla del catálogo y el buscador no abre sugerencias (el filtrado
              es en vivo). Si lo desactivas, se oculta el catálogo y el buscador vuelve a mostrar sugerencias al
              escribir.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showPosProductCatalog}
            onClick={() => setShowPosProductCatalog(!showPosProductCatalog)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none ${
              showPosProductCatalog
                ? 'border-[var(--accent)] bg-[var(--accent)]'
                : 'border-[var(--border)] bg-[var(--panel-2)]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                showPosProductCatalog ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>

      </div>

      <div className="mt-6 space-y-4">
        <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
          Navegación
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-3 space-y-2">
          <p className="text-xs text-[var(--muted)]">
            Venta actual permanece fija en la primera posición. El orden de la lista define cómo aparecen el resto de módulos en la barra lateral y en la navegación móvil.
          </p>

          {orderedModules.map((item, index) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text)] truncate">{item.label}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--panel-2)] text-[var(--text)] disabled:opacity-40"
                  onClick={() => moveModule(index, 'up')}
                  disabled={index === 0}
                  aria-label={`Subir ${item.label}`}
                >
                  <FaArrowUp className="text-xs" />
                </button>
                <button
                  type="button"
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--panel-2)] text-[var(--text)] disabled:opacity-40"
                  onClick={() => moveModule(index, 'down')}
                  disabled={index === orderedModules.length - 1}
                  aria-label={`Bajar ${item.label}`}
                >
                  <FaArrowDown className="text-xs" />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

