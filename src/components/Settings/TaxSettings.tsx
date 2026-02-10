import React, { useState, useEffect } from 'react'
import { useSettingsStore } from '../../store/settingsStore'
import { LiquidButton } from '../inventory/LiquidButton'

export function TaxSettings() {
  const { taxRate, setTaxRate, t } = useSettingsStore()
  const [localTaxRate, setLocalTaxRate] = useState<number | string>(taxRate || 0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocalTaxRate(taxRate || 0)
  }, [taxRate])

  const handleSave = () => {
    const value = parseFloat(String(localTaxRate)) || 0
    setSaving(true)
    setTaxRate(value)
    setTimeout(() => setSaving(false), 800)
  }

  return (
    <div className="space-y-4">
      <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
        {t('settings.taxRate')}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2">
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={localTaxRate}
            onChange={(e) => setLocalTaxRate(e.target.value)}
            className="w-20 bg-transparent text-right text-sm text-[var(--text)] focus:outline-none"
          />
          <span className="ml-1 text-sm text-[var(--muted)]">%</span>
        </div>
        <LiquidButton size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardado' : t('common.save')}
        </LiquidButton>
      </div>
      <p className="text-xs text-[var(--muted)]">
        {t('settings.taxRateHint') || 'Porcentaje de impuesto aplicado a las ventas (ej: 16 para 16%).'}
      </p>
    </div>
  )
}

