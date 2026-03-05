import React from 'react'
import { useSettingsStore } from '../../store/settingsStore'

export function SystemInfoSettings() {
  const { theme, language, currency, taxRate, t } = useSettingsStore()

  const langName =
    language === 'es'
      ? 'Español'
      : language === 'en'
        ? 'English'
        : language === 'fr'
          ? 'Français'
          : language === 'de'
            ? 'Deutsch'
            : language

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
      <div className="rounded-2xl bg-[var(--panel-2)] border border-[var(--border)] px-4 py-3">
        <div className="text-[11px] text-[var(--muted)] uppercase tracking-wide">
          {t('settings.version')}
        </div>
        <div className="mt-1 text-[var(--text)]">1.0.0</div>
      </div>
      <div className="rounded-2xl bg-[var(--panel-2)] border border-[var(--border)] px-4 py-3">
        <div className="text-[11px] text-[var(--muted)] uppercase tracking-wide">
          {t('settings.environment')}
        </div>
        <div className="mt-1 text-[var(--text)]">Development</div>
      </div>
      <div className="rounded-2xl bg-[var(--panel-2)] border border-[var(--border)] px-4 py-3">
        <div className="text-[11px] text-[var(--muted)] uppercase tracking-wide">
          {t('settings.theme')}
        </div>
        <div className="mt-1 text-[var(--text)]">
          {theme === 'dark' ? t('settings.darkMode') : t('settings.lightMode')}
        </div>
      </div>
      <div className="rounded-2xl bg-[var(--panel-2)] border border-[var(--border)] px-4 py-3">
        <div className="text-[11px] text-[var(--muted)] uppercase tracking-wide">
          {t('settings.language')}
        </div>
        <div className="mt-1 text-[var(--text)]">{langName}</div>
      </div>
      <div className="rounded-2xl bg-[var(--panel-2)] border border-[var(--border)] px-4 py-3">
        <div className="text-[11px] text-[var(--muted)] uppercase tracking-wide">
          {t('settings.currency')}
        </div>
        <div className="mt-1 text-[var(--text)]">{currency}</div>
      </div>
      <div className="rounded-2xl bg-[var(--panel-2)] border border-[var(--border)] px-4 py-3">
        <div className="text-[11px] text-[var(--muted)] uppercase tracking-wide">
          {t('settings.taxRate')}
        </div>
        <div className="mt-1 text-[var(--text)]">{taxRate}%</div>
      </div>
    </div>
  )
}

