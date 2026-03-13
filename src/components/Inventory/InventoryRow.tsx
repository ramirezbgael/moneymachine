import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaShoppingCart } from 'react-icons/fa'
import type { Product, StockStatus } from '../../types/inventory'
import { useInventoryStore } from '../../store/inventoryStore'
import { LiquidButton } from './LiquidButton'
import { StockAdjustModal } from './StockAdjustModal'
import { getProductIcon } from './ProductIcons'

function getStockStatus(product: Product): StockStatus {
  const stock = product.stock ?? 0
  const min = product.minimum_stock ?? 10
  if (stock === 0) return 'SIN STOCK'
  if (min > 0 && stock <= min) return 'BAJO'
  return 'OK'
}

interface InventoryRowProps {
  product: Product
  onAddedToOrder?: (productName: string) => void
}

export function InventoryRow({ product, onAddedToOrder }: InventoryRowProps) {
  const navigate = useNavigate()
  const [modal, setModal] = useState<'entrada' | 'salida' | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const {
    incrementStock,
    decrementStock,
    addToPurchaseOrder,
  } = useInventoryStore()

  const status = getStockStatus(product)
  const stock = product.stock ?? 0

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const closeOnScroll = () => setMenuOpen(false)
    const closeOnWheel = () => setMenuOpen(false)
    const closeOnTouch = () => setMenuOpen(false)
    
    document.addEventListener('click', close)
    document.addEventListener('scroll', closeOnScroll, true)
    window.addEventListener('scroll', closeOnScroll)
    window.addEventListener('wheel', closeOnWheel, { passive: true })
    window.addEventListener('touchmove', closeOnTouch, { passive: true })
    
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('scroll', closeOnScroll, true)
      window.removeEventListener('scroll', closeOnScroll)
      window.removeEventListener('wheel', closeOnWheel)
      window.removeEventListener('touchmove', closeOnTouch)
    }
  }, [menuOpen])

  const handleConfirmEntrada = (payload: {
    quantity: number
    motivo: string
    nota?: string
    referencia?: string
    proveedor?: string
    fecha?: string
    evidenceRef?: string
  }) => {
    incrementStock(product.id, payload.quantity, {
      motivo: payload.motivo,
      nota: payload.nota,
      referencia: payload.referencia,
      usuario: 'usuario',
      evidenceRef: payload.evidenceRef,
    })
  }

  const handleConfirmSalida = (payload: {
    quantity: number
    motivo: string
    nota?: string
  }) => {
    decrementStock(product.id, payload.quantity, {
      motivo: payload.motivo,
      nota: payload.nota,
      usuario: 'usuario',
    })
  }

  const handleAddToOrder = () => {
    addToPurchaseOrder({
      productId: product.id,
      productName: product.name,
      quantity: 1,
      suggestedSupplier: product.supplier as string | undefined,
    })
    onAddedToOrder?.(product.name)
  }

  return (
    <>
      <div
        onClick={() => navigate(`/inventory/product/${product.id}`)}
        className={`flex items-center gap-2 rounded-xl bg-[var(--panel)]/35 py-2.5 px-3 transition-all duration-200 hover:bg-[var(--panel)]/60 hover:shadow-lg hover:shadow-[var(--accent)]/10 backdrop-blur-sm cursor-pointer ${menuOpen ? 'relative z-[9990]' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-lg bg-[var(--panel)]/60 flex-shrink-0 overflow-hidden flex items-center justify-center">
            {product.image_url ? (
              <img src={product.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              React.createElement(getProductIcon((product as any).icon), { className: 'w-4 h-4 text-[var(--accent)]' })
            )}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-[var(--text)] truncate text-sm leading-tight">{product.name}</div>
            <div className="text-[11px] text-[var(--muted)] truncate leading-tight">
              {product.code || product.barcode || 'Sin codigo'}
            </div>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <span className="text-sm font-semibold text-[var(--text)] tabular-nums">
            ${(product.price ?? 0).toFixed(2)}
          </span>
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          <span className="text-xs text-[var(--muted)]">{stock}</span>
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              status === 'SIN STOCK'
                ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]'
                : status === 'BAJO'
                  ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]'
                  : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
            }`}
            aria-label={`Estado de stock: ${status}`}
            title={`Estado de stock: ${status}`}
          />
        </div>

        <div className="shrink-0">
          <LiquidButton size="sm" onClick={(e) => { e.stopPropagation(); handleAddToOrder(); }} aria-label="Agregar al pedido" className="!px-2.5 !py-2">
            <FaShoppingCart className="w-3.5 h-3.5" />
          </LiquidButton>
        </div>

        {/* Col 7: Menú ⋯ — ancho fijo */}
        <div className="relative shrink-0 w-8 flex justify-end" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg text-[var(--muted)] hover:bg-[var(--panel)]/80 hover:text-[var(--accent)] transition-all hover:shadow-md"
            aria-label="Más opciones"
            aria-expanded={menuOpen}
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 py-2 min-w-[180px] rounded-2xl bg-[var(--panel)] shadow-2xl shadow-black/60 z-[9999] border-2 border-[var(--border)]">
              <button
                type="button"
                className="w-full text-left px-4 py-3 text-sm font-medium text-[var(--text)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-colors"
                onClick={() => {
                  setMenuOpen(false)
                  navigate(`/inventory/product/${product.id}`)
                }}
              >
                Ver detalles
              </button>
              <button
                type="button"
                className="w-full text-left px-4 py-3 text-sm font-medium text-[var(--text)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-colors"
                onClick={() => {
                  setMenuOpen(false)
                  navigate(`/inventory/product/${product.id}`)
                }}
              >
                Editar
              </button>
              <button
                type="button"
                className="w-full text-left px-4 py-3 text-sm font-medium text-[var(--text)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-colors"
                onClick={() => {
                  setMenuOpen(false)
                  setModal('entrada')
                }}
              >
                Ajustar stock
              </button>
            </div>
          )}
        </div>
      </div>

      {modal === 'entrada' && (
        <StockAdjustModal
          mode="entrada"
          productName={product.name}
          currentStock={stock}
          onConfirm={handleConfirmEntrada}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'salida' && (
        <StockAdjustModal
          mode="salida"
          productName={product.name}
          currentStock={stock}
          onConfirm={handleConfirmSalida}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
