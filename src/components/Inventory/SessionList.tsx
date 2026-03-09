import React from 'react'
import type { ScanSessionItem } from '../../types/inventory'
import { useSettingsStore } from '../../store/settingsStore'
import { LiquidButton } from './LiquidButton'

interface SessionListProps {
  items: ScanSessionItem[]
  onSave: () => void | Promise<void>
  loading?: boolean
}

export function SessionList({ items, onSave, loading }: SessionListProps) {
  const { t } = useSettingsStore()
  const totalProducts = items.length

  return (
    <div className="rounded-3xl bg-[var(--panel)] border border-[var(--border)] backdrop-blur-md p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">{t('inventoryNewPage.sessionList.title')}</h3>
          <p className="text-[11px] text-[var(--muted)]">
            {t('inventoryNewPage.sessionList.subtitle')} {totalProducts}
          </p>
        </div>
        <LiquidButton
          variant="secondary"
          size="sm"
          onClick={onSave}
          disabled={items.length === 0 || loading}
        >
          {loading ? 'Guardando...' : t('inventoryNewPage.sessionList.saveAll')}
        </LiquidButton>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {items.length === 0 ? (
          <div className="text-xs text-[var(--muted)] border border-dashed border-[var(--border)] rounded-2xl px-3 py-4 text-center">
            {t('inventoryNewPage.sessionList.empty')}
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-[var(--panel-2)] border border-[var(--border)] px-3 py-2 text-xs text-[var(--text)] flex flex-col gap-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold truncate">{item.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--muted)]">
                  {item.isNew ? t('inventoryNewPage.sessionList.productLabel.new') : t('inventoryNewPage.sessionList.productLabel.stock')}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                <span className="truncate">{t('inventoryNewPage.sessionList.code')} {item.code}</span>
                <span>{t('inventoryNewPage.sessionList.stock')} {item.initialStock}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                <span>{t('inventoryNewPage.sessionList.purchase')} ${item.purchasePrice.toFixed(2)}</span>
                <span>{t('inventoryNewPage.sessionList.sale')} ${item.salePrice.toFixed(2)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

