import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaShoppingCart } from 'react-icons/fa'
import type { Product, StockStatus } from '../../types/inventory'
import { useInventoryStore } from '../../store/inventoryStore'
import { LiquidButton } from './LiquidButton'
import { StockAdjustModal } from './StockAdjustModal'

function getStockStatus(product: Product): StockStatus {
  const stock = product.stock ?? 0
  const min = product.minimum_stock ?? 10
  if (stock === 0) return 'SIN STOCK'
  if (min > 0 && stock <= min) return 'BAJO'
  return 'OK'
}

function getMargin(product: Product): number | null {
  const price = product.price ?? 0
  const cost = product.cost ?? 0
  if (cost <= 0) return null
  return Math.round(((price - cost) / cost) * 100)
}

interface InventoryRowProps {
  product: Product
}

export function InventoryRow({ product }: InventoryRowProps) {
  const navigate = useNavigate()
  const [modal, setModal] = useState<'entrada' | 'salida' | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const {
    incrementStock,
    decrementStock,
    addToPurchaseOrder,
    updateProduct,
  } = useInventoryStore()

  const [stockInput, setStockInput] = useState<string | null>(null)
  const stockInputRef = useRef<HTMLInputElement>(null)

  const status = getStockStatus(product)
  const margin = getMargin(product)
  const stock = product.stock ?? 0

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
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
  }

  const displayStock = stockInput !== null ? stockInput : String(stock)
  const applyStockInput = () => {
    const raw = stockInputRef.current?.value ?? stockInput ?? ''
    const num = Math.floor(Number(raw))
    if (!Number.isNaN(num) && num >= 0 && num !== stock) {
      updateProduct(product.id, { stock: num })
    }
    setStockInput(null)
  }
  const onStockInputFocus = () => setStockInput(String(stock))
  const onStockInputBlur = () => applyStockInput()
  const onStockInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      stockInputRef.current?.blur()
    }
  }

  const statusLabel = status === 'SIN STOCK' ? 'SIN STOCK' : status === 'BAJO' ? 'BAJO' : 'OK'
  const statusColor =
    status === 'SIN STOCK'
      ? 'text-[var(--danger)]'
      : status === 'BAJO'
        ? 'text-amber-400/90'
        : 'text-[var(--accent)]'

  return (
    <>
      <div
        className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 rounded-2xl bg-[var(--panel)]/40 py-3 px-4 transition-[box-shadow] hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
      >
        {/* Col 1: thumb + name — flexible */}
        <div className="flex items-center gap-3 min-w-0 flex-1 md:min-w-[200px]">
          <div className="w-11 h-11 rounded-xl bg-[var(--panel)]/60 flex-shrink-0 overflow-hidden flex items-center justify-center">
            {product.image_url ? (
              <img src={product.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg text-[var(--muted)]">📦</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-[var(--text)] truncate text-base">
              {product.name}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {product.category && (
                <span className="text-[var(--muted)] text-xs">
                  {product.category}
                </span>
              )}
              <span className="text-[var(--muted)] text-xs">
                {product.code || product.barcode || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Col 2: Precio — ancho fijo, alineado a la derecha */}
        <div className="w-full md:w-28 flex md:flex-col md:items-end gap-0.5 shrink-0">
          <span className="text-base font-semibold text-[var(--accent)] tabular-nums">
            ${(product.price ?? 0).toFixed(2)}
          </span>
          <span className="text-xs text-[var(--muted)] tabular-nums">
            Compra ${(product.cost ?? 0).toFixed(2)}
          </span>
        </div>

        {/* Col 3: Margen — ancho fijo, alineado a la derecha */}
        <div className="w-full md:w-12 text-left md:text-right shrink-0">
          {margin != null ? (
            <span className="text-xs text-[var(--muted)] tabular-nums">{margin}%</span>
          ) : (
            <span className="text-xs text-[var(--muted)]">—</span>
          )}
        </div>

        {/* Col 4+5: Stock unificado — Stock: − [input] + status */}
        <div className="w-full md:w-40 shrink-0 flex items-center gap-1.5 flex-wrap md:justify-end">
          <span className="text-xs text-[var(--muted)]">Stock:</span>
          <div className="flex items-center gap-0.5 rounded-lg bg-[var(--panel)]/50 p-0.5" role="group" aria-label="Ajustar stock">
            <button
              type="button"
              onClick={() => setModal('salida')}
              className="w-7 h-7 rounded-md flex items-center justify-center text-sm text-[var(--muted)] hover:bg-[var(--accent-soft)]/50 hover:text-[var(--accent)] transition-colors active:scale-95"
              aria-label="Disminuir"
            >
              −
            </button>
            <input
              ref={stockInputRef}
              type="text"
              inputMode="numeric"
              value={displayStock}
              onFocus={onStockInputFocus}
              onBlur={onStockInputBlur}
              onKeyDown={onStockInputKeyDown}
              onChange={(e) => setStockInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className="w-10 text-center text-xs tabular-nums bg-transparent border-none outline-none text-[var(--text)] rounded px-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="Cantidad en stock"
            />
            <button
              type="button"
              onClick={() => setModal('entrada')}
              className="w-7 h-7 rounded-md flex items-center justify-center text-sm text-[var(--muted)] hover:bg-[var(--accent-soft)]/50 hover:text-[var(--accent)] transition-colors active:scale-95"
              aria-label="Aumentar"
            >
              +
            </button>
          </div>
          <span className={`text-[10px] font-medium uppercase tracking-wide ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        {/* Col 6: Agregar al pedido (icono carrito) */}
        <div className="w-full md:w-[88px] shrink-0 flex justify-start md:justify-end">
          <LiquidButton size="sm" onClick={handleAddToOrder} aria-label="Agregar al pedido">
            <FaShoppingCart className="w-4 h-4" />
          </LiquidButton>
        </div>

        {/* Col 7: Menú ⋯ — ancho fijo */}
        <div className="relative shrink-0 w-8 flex justify-end" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:bg-[var(--panel)]/60 hover:text-[var(--text)] transition-colors"
            aria-label="Más opciones"
            aria-expanded={menuOpen}
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 py-1 min-w-[140px] rounded-xl bg-[var(--panel-2)] shadow-lg z-10 border border-[var(--border)]/50">
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--panel)]/80 rounded-lg"
                onClick={() => {
                  setMenuOpen(false)
                  navigate(`/inventory/producto/${product.id}`)
                }}
              >
                Ver detalles
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--panel)]/80 rounded-lg"
                onClick={() => {
                  setMenuOpen(false)
                  navigate(`/inventory/producto/${product.id}`)
                }}
              >
                Editar
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--panel)]/80 rounded-lg"
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
