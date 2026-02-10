import React from 'react'
import { FaCheck } from 'react-icons/fa'
import { useSettingsStore } from '../../store/settingsStore'

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
]

export function LanguageSettings() {
  const { language, setLanguage, t } = useSettingsStore()

  return (
    <div className="space-y-4">
      <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
        {t('settings.displayLanguage')}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {LANGUAGES.map((lang) => {
          const active = language === lang.code
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`relative rounded-2xl px-4 py-3 text-left border transition-all ${
                active
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_0_14px_var(--accent-glow)]'
                  : 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--text)] hover:border-[var(--accent-soft)]'
              }`}
            >
              <div className="text-sm font-semibold">{lang.name}</div>
              <div className="text-[11px] text-[var(--muted)] mt-0.5 uppercase tracking-wide">
                {lang.code}
              </div>
              {active && (
                <FaCheck className="absolute top-3 right-3 text-xs text-[var(--accent)]" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

