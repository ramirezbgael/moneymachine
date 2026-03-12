import React from 'react'
import { FaMoon, FaSun } from 'react-icons/fa'
import { useSettingsStore } from '../../store/settingsStore'

export function AppearanceSettings() {
  const { theme, setTheme, showFeaturedProducts, setShowFeaturedProducts, t } = useSettingsStore()

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
      </div>
    </div>
  )
}

