import React from 'react'
import { FaMoon, FaSun } from 'react-icons/fa'
import { useSettingsStore } from '../../store/settingsStore'

export function AppearanceSettings() {
  const { theme, setTheme, t } = useSettingsStore()

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
    </div>
  )
}

