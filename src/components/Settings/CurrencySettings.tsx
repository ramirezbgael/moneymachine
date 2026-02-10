import React from 'react'
import { FaCheck } from 'react-icons/fa'
import { useSettingsStore } from '../../store/settingsStore'

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
]

export function CurrencySettings() {
  const { currency, setCurrency, t } = useSettingsStore()

  return (
    <div className="space-y-4">
      <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
        {t('settings.defaultCurrency')}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CURRENCIES.map((curr) => {
          const active = currency === curr.code
          return (
            <button
              key={curr.code}
              type="button"
              onClick={() => setCurrency(curr.code)}
              className={`relative rounded-2xl px-4 py-3 text-left border transition-all ${
                active
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_0_14px_var(--accent-glow)]'
                  : 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--text)] hover:border-[var(--accent-soft)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-xl font-semibold">{curr.symbol}</div>
                <div>
                  <div className="text-sm font-semibold">{curr.code}</div>
                  <div className="text-[11px] text-[var(--muted)]">{curr.name}</div>
                </div>
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

