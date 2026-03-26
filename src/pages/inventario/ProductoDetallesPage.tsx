import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useInventoryStore } from '../../store/inventoryStore'
import { ProductHeader } from '../../components/Inventory/ProductHeader'
import { ProductStats } from '../../components/Inventory/ProductStats'
import { ProductInfo } from '../../components/Inventory/ProductInfo'
import { InventorySettings } from '../../components/Inventory/InventorySettings'
import { MovimientosTable } from '../../components/Inventory/MovimientosTable'
import type { Product } from '../../types/inventory'
import './ProductoDetallesPage.css'

export function ProductoDetallesPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    products,
    setSelectedProduct,
    inventoryMovements,
    fetchProducts,
    updateProduct,
    deleteProduct,
  } = useInventoryStore()

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
  const [restockDays, setRestockDays] = useState('')
  const [supplierLocal, setSupplierLocal] = useState('')
  const [unitLocal, setUnitLocal] = useState('pieza')
  const [locationLocal, setLocationLocal] = useState('')

  useEffect(() => {
    if (!products.length) fetchProducts()
  }, [fetchProducts, products.length])

  useEffect(() => {
    const p = id ? products.find((pr) => String(pr.id) === id) ?? null : null
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
    const ext = localProduct as Record<string, unknown>
    setRestockDays(
      ext.restock_frequency_days != null && ext.restock_frequency_days !== ''
        ? String(ext.restock_frequency_days)
        : ''
    )
    setSupplierLocal((localProduct.supplier as string) || '')
    setUnitLocal(ext.unit != null ? String(ext.unit) : 'pieza')
    setLocationLocal(ext.location != null ? String(ext.location) : '')
  }, [localProduct])

  const handleUpdate = useCallback((data: Partial<Product>) => {
    if (!localProduct) return
    const next = { ...localProduct, ...data }
    setLocalProduct(next)
    updateProduct(localProduct.id, data)
  }, [localProduct, updateProduct])

  const handleDelete = () => {
    if (!localProduct) return
    const confirmed = window.confirm(
      `¿Eliminar "${localProduct.name}"? Esta acción no se puede deshacer.`
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
    if (!localProduct) return
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
    setIsEditingIdentity(false)
  }

  if (!localProduct && products.length > 0) {
    return (
      <div className="producto-detalles-page flex flex-1 flex-col px-6 py-10 text-zinc-300">
        <p>Producto no encontrado.</p>
        <button
          type="button"
          onClick={() => navigate('/inventory')}
          className="mt-4 text-sm text-emerald-400 hover:underline"
        >
          Volver al inventario
        </button>
      </div>
    )
  }

  if (!localProduct) {
    return (
      <div className="producto-detalles-page flex flex-1 flex-col items-center justify-center text-zinc-500">
        Cargando…
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

  return (
    <div className="producto-detalles-page flex min-h-0 flex-1 flex-col text-zinc-100">
      <div className="mx-auto w-full max-w-7xl flex-1 bg-[#09090b] px-4 py-5 md:px-6 md:py-6">
        <ProductHeader
          product={localProduct}
          onEditProduct={() => setIsEditingIdentity((v) => !v)}
          editButtonLabel={isEditingIdentity ? 'Cancelar edición' : 'Editar'}
          onDelete={handleDelete}
        />

        <div className="mt-6">
          <ProductStats
            stock={stock}
            minStock={min}
            cost={cost}
            price={price}
            marginPercent={margin}
            draftMarginPercent={draftMargin}
            isEditing={isEditingIdentity}
            summaryDraft={summaryDraft}
            onSummaryChange={(next) => setSummaryDraft((prev) => ({ ...prev, ...next }))}
          />
        </div>

        {isEditingIdentity && (
          <div className="mt-6 flex flex-wrap justify-end gap-2 rounded-xl bg-zinc-900/50 p-3 ring-1 ring-zinc-800/80">
            <button
              type="button"
              onClick={handleCancelIdentity}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveIdentity}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
            >
              Guardar cambios
            </button>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <ProductInfo
            product={localProduct}
            isEditing={isEditingIdentity}
            identityDraft={identityDraft}
            onIdentityChange={(next) => setIdentityDraft((prev) => ({ ...prev, ...next }))}
            onImageUpload={handleIdentityImageUpload}
          />
          <InventorySettings
            minimumStock={min}
            restockDays={restockDays}
            supplier={supplierLocal}
            unit={unitLocal}
            location={locationLocal}
            onMinimumStockChange={(v) => handleUpdate({ minimum_stock: v })}
            onRestockDaysChange={(v) => {
              setRestockDays(v)
              if (v === '') {
                handleUpdate({ restock_frequency_days: undefined })
              } else {
                const n = parseInt(v, 10)
                if (!Number.isNaN(n)) {
                  handleUpdate({ restock_frequency_days: n })
                }
              }
            }}
            onSupplierChange={(v) => {
              setSupplierLocal(v)
              handleUpdate({ supplier: v || undefined })
            }}
            onUnitChange={(v) => {
              setUnitLocal(v)
              handleUpdate({ unit: v })
            }}
            onLocationChange={(v) => {
              setLocationLocal(v)
              handleUpdate({ location: v || undefined })
            }}
          />
        </div>

        <div className="mt-8">
          <MovimientosTable movements={inventoryMovements} productId={localProduct.id} />
        </div>
      </div>
    </div>
  )
}
