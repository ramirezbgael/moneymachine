import React from 'react'

export interface InventorySettingsProps {
  minimumStock: number
  restockDays: string
  supplier: string
  unit: string
  location: string
  onMinimumStockChange: (value: number) => void
  onRestockDaysChange: (value: string) => void
  onSupplierChange: (value: string) => void
  onUnitChange: (value: string) => void
  onLocationChange: (value: string) => void
}

export function InventorySettings({
  minimumStock,
  restockDays,
  supplier,
  unit,
  location,
  onMinimumStockChange,
  onRestockDaysChange,
  onSupplierChange,
  onUnitChange,
  onLocationChange,
}: InventorySettingsProps) {
  return (
    <section className="rounded-2xl bg-zinc-950/50 p-5 ring-1 ring-zinc-800/60">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Inventario</h2>
      <p className="mt-1 text-xs text-zinc-600">Ajustes de reposición y almacén</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-1">
          <span className="mb-1.5 block text-xs font-medium text-zinc-500">Stock mínimo</span>
          <input
            type="number"
            min={0}
            value={minimumStock}
            onChange={(e) => onMinimumStockChange(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 shadow-sm shadow-black/20 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1.5 block text-xs font-medium text-zinc-500">Reposición (días)</span>
          <input
            type="number"
            min={0}
            placeholder="Ej. 30"
            value={restockDays}
            onChange={(e) => onRestockDaysChange(e.target.value)}
            className="w-full rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 shadow-sm shadow-black/20 placeholder:text-zinc-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-zinc-500">Proveedor</span>
          <input
            type="text"
            placeholder="Nombre del proveedor"
            value={supplier}
            onChange={(e) => onSupplierChange(e.target.value)}
            className="w-full rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 shadow-sm shadow-black/20 placeholder:text-zinc-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1.5 block text-xs font-medium text-zinc-500">Unidad</span>
          <select
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
            className="w-full rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 shadow-sm shadow-black/20 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
          >
            <option value="pieza">Pieza</option>
            <option value="caja">Caja</option>
            <option value="kg">Kg</option>
            <option value="litro">Litro</option>
          </select>
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1.5 block text-xs font-medium text-zinc-500">Ubicación</span>
          <input
            type="text"
            placeholder="Ej. Estante A2"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            className="w-full rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 shadow-sm shadow-black/20 placeholder:text-zinc-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
          />
        </label>
      </div>
    </section>
  )
}
