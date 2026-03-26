import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FaTrashAlt, FaShoppingCart } from 'react-icons/fa'
import type { Product, StockStatus } from '../../types/inventory'
import { useSaleStore } from '../../store/saleStore'

function getStockStatus(product: Product): StockStatus {
  const stock = product.stock ?? 0
  const min = product.minimum_stock ?? 0
  if (stock === 0) return 'SIN STOCK'
  if (min > 0 && stock <= min) return 'BAJO'
  return 'OK'
}

export interface ProductHeaderProps {
  product: Product
  onEditProduct?: () => void
  editButtonLabel?: string
  onDelete?: () => void
}

export function ProductHeader({
  product,
  onEditProduct,
  editButtonLabel = 'Editar',
  onDelete,
}: ProductHeaderProps) {
  const navigate = useNavigate()
  const addItem = useSaleStore((s) => s.addItem)
  const status = getStockStatus(product)

  const badgeClass =
    status === 'SIN STOCK'
      ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/35'
      : status === 'BAJO'
        ? 'bg-amber-500/12 text-amber-300 ring-1 ring-amber-500/30'
        : 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/25'

  const handleAddToCart = () => {
    addItem(
      {
        id: product.id,
        name: product.name,
        code: product.code || '',
        barcode: product.barcode,
        price: Number(product.price) || 0,
        stock: Number(product.stock) || 0,
        image_url: product.image_url,
      },
      1
    )
    navigate('/')
  }

  return (
    <header className="flex flex-col gap-4 border-b border-zinc-800/90 pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
        <button
          type="button"
          onClick={() => navigate('/inventory')}
          className="w-fit shrink-0 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-400 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-200"
        >
          ← Inventario
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-zinc-50 md:text-3xl">
            {product.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-zinc-500">
              SKU {product.code || product.barcode || '—'}
            </span>
            <span className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClass}`}>
              {status === 'SIN STOCK' ? 'Sin stock' : status === 'BAJO' ? 'Stock bajo' : 'En stock'}
            </span>
            {product.category && (
              <span className="rounded-md bg-zinc-800/80 px-2 py-1 text-xs text-zinc-400 ring-1 ring-zinc-700/60">
                {product.category}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        <button
          type="button"
          onClick={handleAddToCart}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-[0_0_20px_-6px_rgba(16,185,129,0.5)] transition hover:bg-emerald-400 active:scale-[0.98]"
        >
          <FaShoppingCart className="h-4 w-4" />
          Agregar al carrito
        </button>
        {onEditProduct && (
          <button
            type="button"
            onClick={onEditProduct}
            className="rounded-lg border border-zinc-600/90 bg-zinc-900/50 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
          >
            {editButtonLabel}
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-lg border border-red-500/35 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:border-red-500/50 hover:bg-red-500/15"
            title="Eliminar producto"
          >
            <FaTrashAlt className="h-3.5 w-3.5" />
            Eliminar
          </button>
        )}
      </div>
    </header>
  )
}
