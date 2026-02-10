import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiEdit2 } from 'react-icons/fi'
import { useInventoryStore } from '../../store/inventoryStore'
import { ProductHeader } from '../../components/inventory/ProductHeader'
import { ProductFacturacionCard } from '../../components/inventory/ProductFacturacionCard'
import { MovimientosTable } from '../../components/inventory/MovimientosTable'
import { LiquidButton } from '../../components/inventory/LiquidButton'
import ProductModal from '../../components/Inventory/ProductModal'
import type { Product } from '../../types/inventory'

export function ProductoDetallesPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    products,
    selectedProduct,
    setSelectedProduct,
    inventoryMovements,
    fetchProducts,
    updateProduct,
    addToPurchaseOrder,
  } = useInventoryStore()

  // Siempre usar el ID de la URL para mostrar el producto correcto (no selectedProduct del store)
  const productFromUrl = id ? products.find((p) => String(p.id) === id) ?? null : null
  const [localProduct, setLocalProduct] = useState<Product | null>(productFromUrl ?? null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    if (!products.length) fetchProducts()
  }, [fetchProducts, products.length])

  useEffect(() => {
    const p = id ? products.find((p) => String(p.id) === id) ?? null : null
    setSelectedProduct(p)
    setLocalProduct(p)
  }, [id, products, setSelectedProduct])

  if (!localProduct && products.length > 0) {
    return (
      <div className="min-h-full bg-[var(--bg)] p-6 text-[var(--text)]">
        <p>Producto no encontrado.</p>
        <button
          type="button"
          onClick={() => navigate('/inventory')}
          className="mt-4 text-[var(--accent)] hover:underline"
        >
          Volver al inventario
        </button>
      </div>
    )
  }

  if (!localProduct) {
    return (
      <div className="min-h-full bg-[var(--bg)] p-6 text-[var(--text)]">
        Cargando...
      </div>
    )
  }

  const stock = localProduct.stock ?? 0
  const min = localProduct.minimum_stock ?? 0
  const cost = localProduct.cost ?? 0
  const price = localProduct.price ?? 0
  const margin = cost > 0 ? Math.round(((price - cost) / cost) * 100) : null

  const handleUpdate = (data: Partial<Product>) => {
    const next = { ...localProduct, ...data }
    setLocalProduct(next)
    updateProduct(localProduct.id, data)
  }

  return (
    <div className="min-h-full bg-[var(--bg)] text-[var(--text)] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <ProductHeader
          product={localProduct}
          onEditNameImage={() => setShowEditModal(true)}
        />

        {/* A) Resumen rápido */}
        <div className="rounded-3xl bg-[var(--panel-2)] border border-[var(--border)] backdrop-blur-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--text)]">Resumen rápido</h3>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('facturacion-producto')
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="inline-flex items-center gap-1 rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-1 text-xs text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--text)] transition-colors"
            >
              <FiEdit2 className="h-3.5 w-3.5" />
              Editar precios
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-[var(--muted)] text-sm">Stock actual</div>
              <div className="text-2xl font-bold text-[var(--accent)]">{stock}</div>
            </div>
            <div>
              <div className="text-[var(--muted)] text-sm">Stock mínimo</div>
              <div className="text-xl font-semibold text-[var(--text)]">{min || '—'}</div>
            </div>
            <div>
              <div className="text-[var(--muted)] text-sm">Precio compra</div>
              <div className="text-xl font-semibold text-[var(--text)]">${cost.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[var(--muted)] text-sm">Precio venta</div>
              <div className="text-xl font-semibold text-[var(--accent)]">${price.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[var(--muted)] text-sm">Margen</div>
              <div className="text-xl font-semibold text-[var(--text)]">
                {margin != null ? `${margin}%` : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* B) Control de inventario */}
        <div className="rounded-3xl bg-[var(--panel-2)] border border-[var(--border)] backdrop-blur-sm p-6">
          <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Control de inventario</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Stock mínimo (opcional)</label>
              <input
                type="number"
                min="0"
                defaultValue={min}
                onChange={(e) => handleUpdate({ minimum_stock: parseInt(e.target.value, 10) || 0 })}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Cada cuánto se pide (días)</label>
              <input
                type="number"
                min="0"
                placeholder="30"
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2 text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Proveedor principal</label>
              <input
                type="text"
                placeholder="Opcional"
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2 text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted)] mb-1">Unidad interna</label>
              <select className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none">
                <option value="pieza">Pieza</option>
                <option value="caja">Caja</option>
                <option value="kg">Kg</option>
                <option value="litro">Litro</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-[var(--muted)] mb-1">Ubicación</label>
              <input
                type="text"
                placeholder="Ej: Estante A2"
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2 text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* C) Costos e impuestos */}
        <ProductFacturacionCard product={localProduct} onUpdate={handleUpdate} />

        {/* D) Movimientos */}
        <MovimientosTable movements={inventoryMovements} productId={localProduct.id} />

        {/* E) Automatizaciones */}
        <div className="rounded-3xl bg-[var(--panel-2)] border border-[var(--border)] backdrop-blur-sm p-6">
          <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Automatizaciones</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[var(--text)]">Auto sugerir stock mínimo</span>
              <input
                type="checkbox"
                className="rounded border-[var(--border)] bg-[var(--panel-2)] text-[var(--accent)] focus:ring-[var(--accent)]/50"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[var(--text)]">Auto sugerir cada cuánto pedir</span>
              <input
                type="checkbox"
                className="rounded border-[var(--border)] bg-[var(--panel-2)] text-[var(--accent)] focus:ring-[var(--accent)]/50"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[var(--text)]">Auto detectar proveedor más usado</span>
              <input
                type="checkbox"
                className="rounded border-[var(--border)] bg-[var(--panel-2)] text-[var(--accent)] focus:ring-[var(--accent)]/50"
              />
            </label>
          </div>
        </div>

        {showEditModal && (
          <ProductModal
            product={localProduct}
            onClose={() => setShowEditModal(false)}
            onSave={async (productData) => {
              try {
                await updateProduct(localProduct.id, productData)
                setLocalProduct((prev) => (prev ? { ...prev, ...productData } : null))
                setShowEditModal(false)
              } catch (err) {
                console.error('Error al guardar:', err)
                alert((err as Error)?.message || 'Error al guardar.')
              }
            }}
          />
        )}
      </div>
    </div>
  )
}
