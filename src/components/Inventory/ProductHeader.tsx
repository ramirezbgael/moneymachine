import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { Product, StockStatus } from '../../types/inventory'
import { LiquidButton } from './LiquidButton'
import { useInventoryStore } from '../../store/inventoryStore'

function getStockStatus(product: Product): StockStatus {
  const stock = product.stock ?? 0
  const min = product.minimum_stock ?? 10
  if (stock === 0) return 'SIN STOCK'
  if (min > 0 && stock <= min) return 'BAJO'
  return 'OK'
}

interface ProductHeaderProps {
  product: Product
  onEditNameImage?: () => void
}

export function ProductHeader({ product, onEditNameImage }: ProductHeaderProps) {
  const navigate = useNavigate()
  const addToPurchaseOrder = useInventoryStore((s) => s.addToPurchaseOrder)
  const status = getStockStatus(product)

  const statusClass =
    status === 'SIN STOCK'
      ? 'bg-[var(--danger)]/20 text-[var(--danger)] border-[var(--danger)]/30'
      : status === 'BAJO'
        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        : 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/30'

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/inventory')}
          className="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2 text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--text)] transition-all"
        >
          ← Volver
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">{product.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[var(--muted)] text-sm">
              SKU: {product.code || product.barcode || '—'}
            </span>
            {product.category && (
              <span className="px-2 py-0.5 rounded-lg bg-[var(--panel-2)] text-[var(--muted)] text-xs border border-[var(--border)]">
                {product.category}
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${statusClass}`}
            >
              {status}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <LiquidButton
          size="sm"
          onClick={() => {
            addToPurchaseOrder({
              productId: product.id,
              productName: product.name,
              quantity: 1,
              suggestedSupplier: (product as { supplier?: string }).supplier,
            })
          }}
        >
          Agregar al pedido
        </LiquidButton>
        <LiquidButton
          variant="secondary"
          size="sm"
          onClick={() => onEditNameImage?.()}
        >
          Editar nombre/imagen
        </LiquidButton>
      </div>
    </div>
  )
}
