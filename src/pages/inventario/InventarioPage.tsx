import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaShoppingCart, FaBarcode } from 'react-icons/fa'
import { useInventoryStore } from '../../store/inventoryStore'
import { useSettingsStore } from '../../store/settingsStore'
import { InventoryRow } from '../../components/inventory/InventoryRow'
import { LiquidButton } from '../../components/inventory/LiquidButton'
import ProductModal from '../../components/Inventory/ProductModal'
import ImportModal from '../../components/Inventory/ImportModal'
import BarcodePrintModal from '../../components/Inventory/BarcodePrintModal'

export function InventarioPage() {
  const navigate = useNavigate()
  const t = useSettingsStore((s) => s.t)
  const { products, loading, error, fetchProducts, createProduct } = useInventoryStore()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'todos' | 'bajo' | 'sin_stock'>('todos')
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const filtered = products.filter((p) => {
    const q = search.toLowerCase().trim()
    if (q) {
      const match =
        p.name?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
      if (!match) return false
    }
    if (filter === 'sin_stock' && (p.stock ?? 0) > 0) return false
    if (filter === 'bajo') {
      const min = p.minimum_stock ?? 10
      if ((p.stock ?? 0) > min || (p.stock ?? 0) === 0) return false
    }
    return true
  })

  return (
    <div className="min-h-full bg-[var(--bg)] text-[var(--text)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header: clean, main CTA + tabs + discrete secondaries */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-xl font-semibold text-[var(--text)]">{t('inventory.title')}</h1>
            {/* Tabs: sin bordes gruesos */}
            <nav className="flex gap-0.5 rounded-xl bg-[var(--panel)]/60 p-0.5" aria-label="Filtros">
              {(['todos', 'bajo', 'sin_stock'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filter === f
                      ? 'bg-[var(--accent-soft)]/80 text-[var(--accent)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {f === 'todos' ? t('inventory.all') : f === 'bajo' ? t('inventory.low') : t('inventory.outOfStock')}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder={t('inventory.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              autoCapitalize="off"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/40 w-52"
              aria-label={t('inventory.search')}
            />
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="text-xs text-[var(--muted)] hover:text-[var(--text)] px-2 py-1.5 transition-colors"
            >
              {t('inventory.import')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/inventory/pedidos')}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)]/60 transition-colors"
              aria-label={t('inventory.viewOrder') || 'View order'}
            >
              <FaShoppingCart className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowBarcodeModal(true)}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)]/60 transition-colors"
              aria-label={t('inventory.generateBarcodes') || 'Generar códigos de barras'}
              title={t('inventory.barcodeLabels') || 'Etiquetas'}
            >
              <FaBarcode className="w-4 h-4" />
            </button>
            <LiquidButton size="sm" onClick={() => setShowAddProduct(true)}>
              + {t('inventory.addProduct')}
            </LiquidButton>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-[var(--danger)]/8 text-[var(--danger)] px-4 py-2 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-[var(--panel)]/40 py-16 text-center text-sm text-[var(--muted)]">
            {t('inventory.loading') || 'Loading...'}
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.length === 0 ? (
              <div className="rounded-2xl bg-[var(--panel)]/40 py-16 text-center text-sm text-[var(--muted)]">
{t('inventory.noMatch')}
              </div>
            ) : (
              filtered.map((product) => (
                <InventoryRow key={product.id} product={product} />
              ))
            )}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 py-2">
          <p className="text-xs text-[var(--muted)]">
{t('inventory.advancedTools') || 'Advanced inventory tools for bulk loading and warehouse flow.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/inventario/nuevo')}
            className="text-xs text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
          >
{t('inventory.bulkRegistration') || 'Inventario nuevo (registro masivo)'}
          </button>
        </div>

        {showAddProduct && (
          <ProductModal
            product={null}
            onClose={() => setShowAddProduct(false)}
            onSave={async (productData) => {
              try {
                await createProduct(productData)
                await fetchProducts()
                setShowAddProduct(false)
              } catch (err) {
                console.error('Error al guardar producto:', err)
                alert((err as Error)?.message || 'Error al guardar el producto.')
              }
            }}
          />
        )}

        {showImportModal && (
          <ImportModal
            onClose={() => setShowImportModal(false)}
            onImportComplete={() => {
              fetchProducts()
              setShowImportModal(false)
            }}
          />
        )}

        {showBarcodeModal && (
          <BarcodePrintModal onClose={() => setShowBarcodeModal(false)} />
        )}
      </div>
    </div>
  )
}
