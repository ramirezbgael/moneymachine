import React from 'react'
import type { Product } from '../../types/inventory'

interface ProductFacturacionCardProps {
  product: Product
  onUpdate: (data: Partial<Product>) => void
}

const IVA_OPTIONS = [
  { value: '16', label: '16%' },
  { value: '0', label: '0%' },
  { value: 'exento', label: 'Exento' },
]

export function ProductFacturacionCard({ product, onUpdate }: ProductFacturacionCardProps) {
  const factura = (product as { factura?: boolean; iva?: string; claveSat?: string; unidadSat?: string; descripcionFactura?: string; skuFactura?: string }).factura ?? false

  return (
    <div
      id="facturacion-producto"
      className="rounded-3xl bg-[rgba(15,15,15,0.6)] border border-white/10 backdrop-blur-sm p-6"
    >
      <h3 className="text-lg font-semibold text-white mb-4">
        Costos, impuestos y facturación (MX)
      </h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Precio de compra</label>
            <input
              type="number"
              step="0.01"
              defaultValue={product.cost ?? 0}
              onChange={(e) => onUpdate({ cost: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-[#00ff88]/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Precio de venta</label>
            <input
              type="number"
              step="0.01"
              defaultValue={product.price ?? 0}
              onChange={(e) => onUpdate({ price: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-[#00ff88]/50 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-white/70 mb-1">IVA</label>
          <select
            defaultValue="16"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-[#00ff88]/50 focus:outline-none"
          >
            {IVA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-white/70 mb-1" title="Clave producto/servicio SAT">
            Clave SAT (producto/servicio)
          </label>
          <input
            type="text"
            placeholder="01010101"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/40 focus:border-[#00ff88]/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-white/70 mb-1" title="H87, KGM, LTR, etc.">
            Unidad SAT
          </label>
          <input
            type="text"
            placeholder="H87"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/40 focus:border-[#00ff88]/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-white/70 mb-1">Descripción para factura</label>
          <textarea
            rows={2}
            defaultValue={product.name}
            placeholder="Descripción que aparecerá en el CFDI"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/40 focus:border-[#00ff88]/50 focus:outline-none resize-none"
          />
        </div>
        <div>
          <label className="block text-sm text-white/70 mb-1">SKU para factura (opcional)</label>
          <input
            type="text"
            placeholder={product.code}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/40 focus:border-[#00ff88]/50 focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-white/80">
          <input
            type="checkbox"
            defaultChecked={factura}
            className="rounded border-white/20 bg-white/5 text-[#00ff88] focus:ring-[#00ff88]/50"
          />
          Este producto se factura
        </label>
      </div>
    </div>
  )
}
