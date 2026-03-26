import React from 'react'

export interface ProductStatsProps {
  stock: number
  minStock: number
  cost: number
  price: number
  marginPercent: number | null
  draftMarginPercent: number | null
  isEditing: boolean
  summaryDraft: { stock: string; cost: string; price: string }
  onSummaryChange: (next: Partial<{ stock: string; cost: string; price: string }>) => void
}

export function ProductStats({
  stock,
  minStock,
  cost,
  price,
  marginPercent,
  draftMarginPercent,
  isEditing,
  summaryDraft,
  onSummaryChange,
}: ProductStatsProps) {
  const stockAlert = stock === 0
  const stockLow = !stockAlert && minStock > 0 && stock <= minStock
  const margin = isEditing ? draftMarginPercent : marginPercent

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div
        className={`rounded-2xl p-4 ring-1 ${
          stockAlert
            ? 'bg-red-500/[0.08] ring-red-500/30'
            : stockLow
              ? 'bg-amber-500/[0.06] ring-amber-500/25'
              : 'bg-zinc-900/50 ring-zinc-800'
        }`}
      >
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Stock actual</p>
        {isEditing ? (
          <input
            type="number"
            min={0}
            value={summaryDraft.stock}
            onChange={(e) => onSummaryChange({ stock: e.target.value })}
            className="mt-2 w-full border-0 bg-transparent text-3xl font-bold tabular-nums tracking-tight text-zinc-50 outline-none focus:ring-0"
          />
        ) : (
          <p
            className={`mt-1 text-3xl font-bold tabular-nums tracking-tight ${
              stockAlert ? 'text-red-400' : stockLow ? 'text-amber-300' : 'text-zinc-50'
            }`}
          >
            {stock}
          </p>
        )}
        {stockAlert && <p className="mt-2 text-xs font-medium text-red-400/90">Reponer urgente</p>}
        {stockLow && !stockAlert && (
          <p className="mt-2 text-xs text-amber-200/70">Por debajo del mínimo</p>
        )}
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-emerald-500/12 to-zinc-900/40 p-4 ring-1 ring-emerald-500/25 lg:col-span-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-400/80">
          Precio de venta
        </p>
        {isEditing ? (
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-semibold text-emerald-400/90">$</span>
            <input
              type="number"
              step="0.01"
              min={0}
              value={summaryDraft.price}
              onChange={(e) => onSummaryChange({ price: e.target.value })}
              className="w-full min-w-0 border-0 bg-transparent text-3xl font-bold tabular-nums tracking-tight text-emerald-300 outline-none focus:ring-0"
            />
          </div>
        ) : (
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-emerald-300">
            ${price.toFixed(2)}
          </p>
        )}
        <p className="mt-2 text-xs text-zinc-500">Precio mostrado en POS</p>
      </div>

      <div className="rounded-2xl bg-zinc-900/40 p-4 ring-1 ring-zinc-800/90">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Margen</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-zinc-100">
          {margin != null ? `${margin}%` : '—'}
        </p>
        <p className="mt-2 text-xs text-zinc-600">Sobre costo</p>
      </div>

      <div className="rounded-2xl bg-zinc-900/30 p-4 ring-1 ring-zinc-800/60">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">Precio de compra</p>
        {isEditing ? (
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-medium text-zinc-500">$</span>
            <input
              type="number"
              step="0.01"
              min={0}
              value={summaryDraft.cost}
              onChange={(e) => onSummaryChange({ cost: e.target.value })}
              className="w-full min-w-0 border-0 bg-transparent text-2xl font-semibold tabular-nums text-zinc-200 outline-none focus:ring-0"
            />
          </div>
        ) : (
          <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-300">${cost.toFixed(2)}</p>
        )}
      </div>
    </div>
  )
}
