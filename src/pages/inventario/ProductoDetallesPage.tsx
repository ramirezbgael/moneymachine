import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiEdit2 } from 'react-icons/fi'
import { FaUpload } from 'react-icons/fa'
import { useInventoryStore } from '../../store/inventoryStore'
import { ProductHeader } from '../../components/Inventory/ProductHeader'
import { ProductFacturacionCard } from '../../components/Inventory/ProductFacturacionCard'
import { MovimientosTable } from '../../components/Inventory/MovimientosTable'
import { getProductIcon, IconPicker } from '../../components/Inventory/ProductIcons'
import type { Product } from '../../types/inventory'

const SHOW_PRODUCT_FACTURACION_SECTION = false
const SHOW_PRODUCT_AUTOMATIONS_SECTION = false

const DEFAULT_AUTOMATION_SUGGESTIONS = [
  'Auto sugerir stock minimo',
  'Auto sugerir cada cuanto pedir',
  'Auto detectar proveedor mas usado',
]

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
    deleteProduct,
    addToPurchaseOrder,
  } = useInventoryStore()

  // Siempre usar el ID de la URL para mostrar el producto correcto (no selectedProduct del store)
  const productFromUrl = id ? products.find((p) => String(p.id) === id) ?? null : null
  const [localProduct, setLocalProduct] = useState<Product | null>(productFromUrl ?? null)
  const [isEditingIdentity, setIsEditingIdentity] = useState(false)
  const [identityDraft, setIdentityDraft] = useState({
    name: '',
    code: '',
    barcode: '',
    description: '',
    image_url: '',
    icon: 'box',
  })
  const [summaryDraft, setSummaryDraft] = useState({
    stock: '0',
    cost: '0',
    price: '0',
  })

  useEffect(() => {
    if (!products.length) fetchProducts()
  }, [fetchProducts, products.length])

  useEffect(() => {
    const p = id ? products.find((p) => String(p.id) === id) ?? null : null
    setSelectedProduct(p)
    setLocalProduct(p)
  }, [id, products, setSelectedProduct])

  useEffect(() => {
    if (!localProduct) return
    setIdentityDraft({
      name: localProduct.name || '',
      code: localProduct.code || '',
      barcode: localProduct.barcode || '',
      description: (localProduct.description as string) || '',
      image_url: (localProduct.image_url as string) || '',
      icon: ((localProduct as { icon?: string }).icon || 'box'),
    })
    setSummaryDraft({
      stock: String(localProduct.stock ?? 0),
      cost: String(localProduct.cost ?? 0),
      price: String(localProduct.price ?? 0),
    })
  }, [localProduct])

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
  const draftCost = parseFloat(summaryDraft.cost) || 0
  const draftPrice = parseFloat(summaryDraft.price) || 0
  const draftMargin = draftCost > 0 ? Math.round(((draftPrice - draftCost) / draftCost) * 100) : null

  const handleUpdate = (data: Partial<Product>) => {
    const next = { ...localProduct, ...data }
    setLocalProduct(next)
    updateProduct(localProduct.id, data)
  }

  const handleDelete = () => {
    if (!localProduct) return
    
    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar "${localProduct.name}"?\n\nEsta acción no se puede deshacer.`
    )
    
    if (confirmed) {
      deleteProduct(localProduct.id)
      navigate('/inventory')
    }
  }

  const handleIdentityImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const imageData = typeof reader.result === 'string' ? reader.result : ''
      setIdentityDraft((prev) => ({ ...prev, image_url: imageData }))
    }
    reader.readAsDataURL(file)
  }

  const handleSaveIdentity = () => {
    const data: Partial<Product> = {
      name: identityDraft.name.trim() || localProduct.name,
      code: identityDraft.code.trim(),
      barcode: identityDraft.barcode.trim(),
      description: identityDraft.description.trim(),
      image_url: identityDraft.image_url || undefined,
      icon: identityDraft.icon,
      cost: parseFloat(summaryDraft.cost) || 0,
      price: parseFloat(summaryDraft.price) || 0,
      stock: Math.max(0, parseInt(summaryDraft.stock, 10) || 0),
    }
    handleUpdate(data)
    setIsEditingIdentity(false)
  }

  const handleCancelIdentity = () => {
    setIdentityDraft({
      name: localProduct.name || '',
      code: localProduct.code || '',
      barcode: localProduct.barcode || '',
      description: (localProduct.description as string) || '',
      image_url: (localProduct.image_url as string) || '',
      icon: ((localProduct as { icon?: string }).icon || 'box'),
    })
    setSummaryDraft({
      stock: String(localProduct.stock ?? 0),
      cost: String(localProduct.cost ?? 0),
      price: String(localProduct.price ?? 0),
    })
    setIsEditingIdentity(false)
  }

  return (
    <div className="min-h-full bg-[var(--bg)] text-[var(--text)] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <ProductHeader
          product={localProduct}
          onEditProduct={() => setIsEditingIdentity((prev) => !prev)}
          editButtonLabel={isEditingIdentity ? 'Cancelar edicion' : 'Editar producto'}
          onDelete={handleDelete}
        />

        <div className="rounded-3xl bg-[var(--panel-2)] border border-[var(--border)] backdrop-blur-sm p-6">
          <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Identidad del producto</h3>
          <div className="grid grid-cols-1 lg:grid-cols-[220px,minmax(0,1fr)] gap-5">
            <div className="rounded-2xl bg-[var(--panel)]/50 border border-[var(--border)]/60 p-4 flex items-center justify-center">
              {identityDraft.image_url ? (
                <img src={identityDraft.image_url} alt="Producto" className="h-36 w-36 rounded-xl object-cover" />
              ) : (
                React.createElement(getProductIcon(identityDraft.icon), { className: 'h-12 w-12 text-[var(--accent)]' })
              )}
            </div>

            {isEditingIdentity ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-[var(--muted)] mb-1">Nombre</label>
                    <input
                      type="text"
                      value={identityDraft.name}
                      onChange={(e) => setIdentityDraft((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2 text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--muted)] mb-1">SKU</label>
                    <input
                      type="text"
                      value={identityDraft.code}
                      onChange={(e) => setIdentityDraft((prev) => ({ ...prev, code: e.target.value }))}
                      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2 text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--muted)] mb-1">Codigo de barras</label>
                    <input
                      type="text"
                      value={identityDraft.barcode}
                      onChange={(e) => setIdentityDraft((prev) => ({ ...prev, barcode: e.target.value }))}
                      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2 text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--muted)] mb-1">Imagen / logo</label>
                    <label className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2 text-[var(--text)] hover:border-[var(--accent)]/60 hover:bg-[var(--panel)] cursor-pointer transition-colors">
                      <FaUpload className="w-3.5 h-3.5" />
                      Subir imagen
                      <input type="file" accept="image/*" onChange={handleIdentityImageUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[var(--muted)] mb-1">Descripcion</label>
                  <textarea
                    rows={3}
                    value={identityDraft.description}
                    onChange={(e) => setIdentityDraft((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2 text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[var(--muted)] mb-2">Icono fallback</label>
                  <IconPicker
                    value={identityDraft.icon}
                    onChange={(iconId) => setIdentityDraft((prev) => ({ ...prev, icon: iconId }))}
                  />
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={handleCancelIdentity}
                    className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)]/70 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveIdentity}
                    className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-4 py-2 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/25 transition-colors"
                  >
                    Guardar cambios
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-[var(--text)]"><span className="text-[var(--muted)]">Nombre:</span> {localProduct.name}</p>
                <p className="text-sm text-[var(--text)]"><span className="text-[var(--muted)]">SKU:</span> {localProduct.code || '—'}</p>
                <p className="text-sm text-[var(--text)]"><span className="text-[var(--muted)]">Codigo barras:</span> {localProduct.barcode || '—'}</p>
                <p className="text-sm text-[var(--text)]"><span className="text-[var(--muted)]">Descripcion:</span> {(localProduct.description as string) || '—'}</p>
              </div>
            )}
          </div>
        </div>

        {/* A) Resumen rápido */}
        <div className="rounded-3xl bg-[var(--panel-2)] border border-[var(--border)] backdrop-blur-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--text)]">Resumen rápido</h3>
            {SHOW_PRODUCT_FACTURACION_SECTION && (
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
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-[var(--muted)] text-sm">Stock actual</div>
              {isEditingIdentity ? (
                <input
                  type="number"
                  min="0"
                  value={summaryDraft.stock}
                  onChange={(e) => setSummaryDraft((prev) => ({ ...prev, stock: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-xl font-bold text-[var(--accent)] focus:border-[var(--accent)] focus:outline-none"
                />
              ) : (
                <div className="text-2xl font-bold text-[var(--accent)]">{stock}</div>
              )}
            </div>
            <div>
              <div className="text-[var(--muted)] text-sm">Stock mínimo</div>
              <div className="text-xl font-semibold text-[var(--text)]">{min || '—'}</div>
            </div>
            <div>
              <div className="text-[var(--muted)] text-sm">Precio compra</div>
              {isEditingIdentity ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={summaryDraft.cost}
                  onChange={(e) => setSummaryDraft((prev) => ({ ...prev, cost: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-lg font-semibold text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                />
              ) : (
                <div className="text-xl font-semibold text-[var(--text)]">${cost.toFixed(2)}</div>
              )}
            </div>
            <div>
              <div className="text-[var(--muted)] text-sm">Precio venta</div>
              {isEditingIdentity ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={summaryDraft.price}
                  onChange={(e) => setSummaryDraft((prev) => ({ ...prev, price: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-lg font-semibold text-[var(--accent)] focus:border-[var(--accent)] focus:outline-none"
                />
              ) : (
                <div className="text-xl font-semibold text-[var(--accent)]">${price.toFixed(2)}</div>
              )}
            </div>
            <div>
              <div className="text-[var(--muted)] text-sm">Margen</div>
              <div className="text-xl font-semibold text-[var(--text)]">
                {isEditingIdentity
                  ? (draftMargin != null ? `${draftMargin}%` : '—')
                  : (margin != null ? `${margin}%` : '—')}
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
        {SHOW_PRODUCT_FACTURACION_SECTION && (
          <ProductFacturacionCard product={localProduct} onUpdate={handleUpdate} />
        )}

        {/* D) Movimientos */}
        <MovimientosTable movements={inventoryMovements} productId={localProduct.id} />

        {/* E) Automatizaciones */}
        {SHOW_PRODUCT_AUTOMATIONS_SECTION && (
          <div className="rounded-3xl bg-[var(--panel-2)] border border-[var(--border)] backdrop-blur-sm p-6">
            <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Automatizaciones</h3>
            <p className="text-sm text-[var(--muted)] mb-4">Estas sugerencias se aplican por defecto.</p>
            <ul className="space-y-2">
              {DEFAULT_AUTOMATION_SUGGESTIONS.map((item) => (
                <li key={item} className="flex items-center justify-between text-sm text-[var(--text)]">
                  <span>{item}</span>
                  <span className="text-[11px] font-semibold text-[var(--accent)]">Activa por defecto</span>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  )
}
