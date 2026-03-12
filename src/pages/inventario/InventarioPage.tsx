import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaShoppingCart, FaBarcode, FaFileInvoice, FaBoxes, FaClock, FaDollarSign, FaArrowUp, FaArrowDown } from 'react-icons/fa'
import { useInventoryStore } from '../../store/inventoryStore'
import { useSettingsStore } from '../../store/settingsStore'
import { InventoryRow } from '../../components/Inventory/InventoryRow'
import { LiquidButton } from '../../components/Inventory/LiquidButton'
import ProductModal from '../../components/Inventory/ProductModal'
import ImportModal from '../../components/Inventory/ImportModal'
import BarcodePrintModal from '../../components/Inventory/BarcodePrintModal'

const ITEMS_PER_PAGE = 10

export function InventarioPage() {
  const navigate = useNavigate()
  const t = useSettingsStore((s) => s.t)
  const { products, loading, error, fetchProducts, createProduct } = useInventoryStore()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'todos' | 'bajo' | 'sin_stock'>('todos')
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)
  const [viewMode, setViewMode] = useState<'empty' | 'results'>('empty')
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [toastMessage, setToastMessage] = useState('')
  const [toastTimer, setToastTimer] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortState, setSortState] = useState<{ key: 'alpha' | 'time' | 'price' | null; direction: 'asc' | 'desc' | null }>({
    key: null,
    direction: null
  })

  // Don't auto-load products on mount - wait for user action
  const handleLoadAll = () => {
    setViewMode('results')
    fetchProducts()
  }

  // Prefetch products for autocomplete but keep search-first dashboard visible
  useEffect(() => {
    if (search.trim() && products.length === 0) {
      fetchProducts()
    }
  }, [search, products.length, fetchProducts])

  const autocompleteItems = products
    .filter((p) => {
      const q = search.toLowerCase().trim()
      if (!q) return false
      return (
        p.name?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
      )
    })
    .slice(0, 6)

  useEffect(() => {
    if (!showAutocomplete || !search.trim()) {
      setHighlightedIndex(-1)
      return
    }

    const totalOptions = autocompleteItems.length > 0 ? autocompleteItems.length + 1 : 0
    if (totalOptions === 0) {
      setHighlightedIndex(-1)
      return
    }

    if (highlightedIndex >= totalOptions) {
      setHighlightedIndex(totalOptions - 1)
    }
  }, [showAutocomplete, search, autocompleteItems.length, highlightedIndex])

  const handleSearchSubmit = () => {
    if (!search.trim()) return
    setShowAutocomplete(false)
    setHighlightedIndex(-1)
    setViewMode('results')
  }

  const handleProductAddedToOrder = (productName: string) => {
    if (toastTimer) {
      window.clearTimeout(toastTimer)
    }
    setToastMessage(`Agregado al pedido: ${productName}`)
    const timerId = window.setTimeout(() => {
      setToastMessage('')
      setToastTimer(null)
    }, 1800)
    setToastTimer(timerId)
  }

  const handleSelectProduct = (productId: string | number) => {
    setShowAutocomplete(false)
    setHighlightedIndex(-1)
    navigate(`/inventory/producto/${productId}`)
  }

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

  const sortedFiltered = [...filtered].sort((a, b) => {
    if (!sortState.key || !sortState.direction) return 0

    let aValue: number | string = 0
    let bValue: number | string = 0

    if (sortState.key === 'alpha') {
      aValue = (a.name || '').toLowerCase()
      bValue = (b.name || '').toLowerCase()
    }

    if (sortState.key === 'price') {
      aValue = Number(a.price || 0)
      bValue = Number(b.price || 0)
    }

    if (sortState.key === 'time') {
      const aDate = a.updated_at || a.created_at || a.last_sale_date || a.lastSaleDate || null
      const bDate = b.updated_at || b.created_at || b.last_sale_date || b.lastSaleDate || null
      aValue = aDate ? new Date(aDate).getTime() : 0
      bValue = bDate ? new Date(bDate).getTime() : 0
    }

    if (aValue < bValue) return sortState.direction === 'asc' ? -1 : 1
    if (aValue > bValue) return sortState.direction === 'asc' ? 1 : -1
    return 0
  })

  const cycleSort = (key: 'alpha' | 'time' | 'price') => {
    setSortState((prev) => {
      if (prev.key !== key) {
        return { key, direction: 'asc' }
      }

      if (prev.direction === 'asc') {
        return { key, direction: 'desc' }
      }

      return { key: null, direction: null }
    })
  }

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / ITEMS_PER_PAGE))
  const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedFiltered = sortedFiltered.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE)
  const showingFrom = sortedFiltered.length === 0 ? 0 : pageStartIndex + 1
  const showingTo = Math.min(pageStartIndex + ITEMS_PER_PAGE, sortedFiltered.length)

  useEffect(() => {
    setCurrentPage(1)
  }, [search, filter, viewMode, sortState.key, sortState.direction])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const visiblePageEnd = Math.min(totalPages, currentPage + 2)
  const visiblePageStart = Math.max(1, visiblePageEnd - 4)
  const visiblePages = Array.from(
    { length: visiblePageEnd - visiblePageStart + 1 },
    (_, idx) => visiblePageStart + idx
  )

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-4 md:p-6 pb-32 md:pb-6 flex flex-col">
      <div className="max-w-7xl mx-auto flex-1 flex flex-col">
        <h1 className="text-2xl font-bold text-[var(--text)] mb-4">Inventario</h1>

        {error && (
          <div className="mb-4 rounded-xl bg-[var(--danger)]/8 text-[var(--danger)] px-4 py-2 text-sm">
            {error}
          </div>
        )}

        {viewMode === 'empty' ? (
          // Empty state: search-first dashboard
          <div className="max-w-3xl mx-auto flex-1 flex flex-col justify-start md:justify-center pt-2 md:pt-0 pb-10 md:pb-0">
            {/* Large search input */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar producto por nombre, marca o SKU..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setHighlightedIndex(-1)
                  }}
                  onFocus={() => setShowAutocomplete(true)}
                  onBlur={() => {
                    // Small delay so item clicks can run before closing dropdown
                    window.setTimeout(() => {
                      setShowAutocomplete(false)
                      setHighlightedIndex(-1)
                    }, 120)
                  }}
                  onKeyDown={(e) => {
                    if (!search.trim()) return

                    if (e.key === 'Escape') {
                      e.preventDefault()
                      setShowAutocomplete(false)
                      setHighlightedIndex(-1)
                      return
                    }

                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setShowAutocomplete(true)
                      const totalOptions = autocompleteItems.length > 0 ? autocompleteItems.length + 1 : 0
                      if (totalOptions > 0) {
                        setHighlightedIndex((prev) => (prev + 1 + totalOptions) % totalOptions)
                      }
                      return
                    }

                    if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setShowAutocomplete(true)
                      const totalOptions = autocompleteItems.length > 0 ? autocompleteItems.length + 1 : 0
                      if (totalOptions > 0) {
                        setHighlightedIndex((prev) => (prev - 1 + totalOptions) % totalOptions)
                      }
                      return
                    }

                    if (e.key === 'Enter') {
                      e.preventDefault()

                      if (
                        showAutocomplete &&
                        autocompleteItems.length > 0 &&
                        highlightedIndex >= 0 &&
                        highlightedIndex < autocompleteItems.length
                      ) {
                        handleSelectProduct(autocompleteItems[highlightedIndex].id)
                        return
                      }

                      if (
                        showAutocomplete &&
                        autocompleteItems.length > 0 &&
                        highlightedIndex === autocompleteItems.length
                      ) {
                        handleSearchSubmit()
                        return
                      }

                      handleSearchSubmit()
                    }
                  }}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoFocus
                  className="w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--bg-tertiary)] px-6 py-4 text-lg font-medium text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/20 transition-all shadow-lg"
                  aria-label="Buscar productos"
                />

                {showAutocomplete && search.trim() && (
                  <div className="absolute left-0 right-0 top-[calc(100%+10px)] rounded-2xl bg-[var(--panel)] border border-[var(--border)]/50 shadow-2xl shadow-black/20 z-40 overflow-hidden">
                    {loading && products.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-[var(--muted)]">Buscando productos...</div>
                    ) : autocompleteItems.length > 0 ? (
                      <>
                        {autocompleteItems.map((product, idx) => (
                          <button
                            key={product.id}
                            type="button"
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            onMouseDown={() => {
                              handleSelectProduct(product.id)
                            }}
                            className={`w-full text-left px-4 py-3 border-b border-[var(--border)]/20 last:border-b-0 transition-colors ${
                              highlightedIndex === idx
                                ? 'bg-[var(--accent)]/14 border-l-2 border-l-[var(--accent)] shadow-[inset_0_0_0_1px_rgba(0,255,136,0.22)]'
                                : 'hover:bg-[var(--panel-2)]'
                            }`}
                          >
                            <div className={`text-sm font-semibold ${highlightedIndex === idx ? 'text-white' : 'text-[var(--text)]'}`}>{product.name}</div>
                            <div className="text-xs text-[var(--muted)]">{product.code || product.barcode || 'Sin codigo'}</div>
                          </button>
                        ))}
                        <button
                          type="button"
                          onMouseEnter={() => setHighlightedIndex(autocompleteItems.length)}
                          onMouseDown={() => {
                            handleSearchSubmit()
                          }}
                          className={`w-full text-left px-4 py-3 text-sm font-semibold text-[var(--accent)] transition-colors ${
                            highlightedIndex === autocompleteItems.length
                              ? 'bg-[var(--accent)]/14 border-l-2 border-l-[var(--accent)] shadow-[inset_0_0_0_1px_rgba(0,255,136,0.22)] text-white'
                              : 'hover:bg-[var(--accent)]/10'
                          }`}
                        >
                          Ver todos los resultados
                        </button>
                      </>
                    ) : (
                      <div className="px-4 py-3 text-sm text-[var(--muted)]">No se encontraron coincidencias</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action cards */}
            <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4 mb-6">
              <button
                onClick={() => setShowAddProduct(true)}
                className="group relative rounded-2xl bg-[var(--panel)]/40 shadow-lg shadow-black/5 p-3 md:p-6 text-center md:text-left transition-all hover:bg-[var(--panel)]/70 hover:shadow-2xl hover:shadow-[var(--accent)]/15 hover:scale-[1.02] min-h-[96px] md:min-h-0 aspect-square md:aspect-auto flex flex-col justify-center"
              >
                <div className="text-2xl md:text-4xl mb-1 md:mb-3">📦</div>
                <h3 className="text-xs md:text-lg font-bold text-[var(--text)] mb-0 md:mb-2 group-hover:text-[var(--accent)] transition-colors leading-tight">
                  Agregar producto
                </h3>
                <p className="hidden md:block text-sm text-[var(--muted)]">
                  Registra un nuevo producto en el inventario
                </p>
              </button>

              <button
                onClick={() => setShowImportModal(true)}
                className="group relative rounded-2xl bg-[var(--panel)]/40 shadow-lg shadow-black/5 p-3 md:p-6 text-center md:text-left transition-all hover:bg-[var(--panel)]/70 hover:shadow-2xl hover:shadow-[var(--accent)]/15 hover:scale-[1.02] min-h-[96px] md:min-h-0 aspect-square md:aspect-auto flex flex-col justify-center"
              >
                <div className="text-2xl md:text-4xl mb-1 md:mb-3">📄</div>
                <h3 className="text-xs md:text-lg font-bold text-[var(--text)] mb-0 md:mb-2 group-hover:text-[var(--accent)] transition-colors leading-tight">
                  Importar factura
                </h3>
                <p className="hidden md:block text-sm text-[var(--muted)]">
                  Carga masiva desde archivo o factura
                </p>
              </button>

              <button
                onClick={handleLoadAll}
                className="group relative rounded-2xl bg-[var(--panel)]/40 shadow-lg shadow-black/5 p-3 md:p-6 text-center md:text-left transition-all hover:bg-[var(--panel)]/70 hover:shadow-2xl hover:shadow-[var(--accent)]/15 hover:scale-[1.02] min-h-[96px] md:min-h-0 aspect-square md:aspect-auto flex flex-col justify-center"
              >
                <div className="text-2xl md:text-4xl mb-1 md:mb-3">📋</div>
                <h3 className="text-xs md:text-lg font-bold text-[var(--text)] mb-0 md:mb-2 group-hover:text-[var(--accent)] transition-colors leading-tight">
                  Ver todos los productos
                </h3>
                <p className="hidden md:block text-sm text-[var(--muted)]">
                  Explorar el inventario completo
                </p>
              </button>
            </div>

            {/* Empty state text */}
            <div className="text-center py-6">
              <p className="text-[var(--muted)] text-sm">
                Busca un producto o usa una acción rápida para comenzar.
              </p>
            </div>

            {/* Secondary actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 pt-6 pb-8 md:pb-4 border-t border-[var(--border)]/30">
              <button
                onClick={() => navigate('/inventory/pedidos')}
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel)]/45 px-3 py-2.5 text-sm text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-colors"
              >
                <FaShoppingCart className="w-4 h-4" />
                Ver pedidos
              </button>
              <button
                onClick={() => setShowBarcodeModal(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel)]/45 px-3 py-2.5 text-sm text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-colors"
              >
                <FaBarcode className="w-4 h-4" />
                Imprimir códigos de barras
              </button>
              <button
                onClick={() => navigate('/inventario/nuevo')}
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-3 py-2.5 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/15 transition-colors"
              >
                <FaBoxes className="w-4 h-4" />
                Registro masivo
              </button>
            </div>
          </div>
        ) : (
          // Results view: existing product list with filters
          <>
            <div className="mb-6 grid gap-3 lg:grid-cols-[auto,1fr] lg:items-end">
              <div className="space-y-2">
                <button
                  onClick={() => setViewMode('empty')}
                  className="block text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                >
                  ← Volver al inicio
                </button>
                <nav className="inline-flex gap-0.5 rounded-lg bg-[var(--panel)]/60 p-0.5 border border-[var(--border)]/40" aria-label="Filtros">
                  {(['todos', 'bajo', 'sin_stock'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                        filter === f
                          ? 'bg-[var(--accent-soft)]/80 text-[var(--accent)] shadow-md'
                          : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)]/40'
                      }`}
                    >
                      {f === 'todos' ? 'Todos' : f === 'bajo' ? 'Bajo stock' : 'Sin stock'}
                    </button>
                  ))}
                </nav>
              </div>
              <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 lg:justify-end lg:overflow-x-auto">
                <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)]/40 bg-[var(--panel)]/55 p-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => cycleSort('alpha')}
                    className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                      sortState.key === 'alpha'
                        ? 'bg-[var(--accent-soft)]/80 text-[var(--accent)]'
                        : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)]/50'
                    }`}
                    title="Orden alfabético"
                  >
                    <span>A</span>
                    {sortState.key === 'alpha' && sortState.direction === 'asc' ? <FaArrowUp className="w-3 h-3" /> : null}
                    {sortState.key === 'alpha' && sortState.direction === 'desc' ? <FaArrowDown className="w-3 h-3" /> : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => cycleSort('time')}
                    className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                      sortState.key === 'time'
                        ? 'bg-[var(--accent-soft)]/80 text-[var(--accent)]'
                        : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)]/50'
                    }`}
                    title="Orden por fecha"
                  >
                    <FaClock className="w-3 h-3" />
                    {sortState.key === 'time' && sortState.direction === 'asc' ? <FaArrowUp className="w-3 h-3" /> : null}
                    {sortState.key === 'time' && sortState.direction === 'desc' ? <FaArrowDown className="w-3 h-3" /> : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => cycleSort('price')}
                    className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                      sortState.key === 'price'
                        ? 'bg-[var(--accent-soft)]/80 text-[var(--accent)]'
                        : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)]/50'
                    }`}
                    title="Orden por precio"
                  >
                    <FaDollarSign className="w-3 h-3" />
                    {sortState.key === 'price' && sortState.direction === 'asc' ? <FaArrowUp className="w-3 h-3" /> : null}
                    {sortState.key === 'price' && sortState.direction === 'desc' ? <FaArrowDown className="w-3 h-3" /> : null}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Buscar por nombre o código..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  autoCapitalize="off"
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] px-4 py-2.5 text-sm font-medium text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 w-60 xl:w-64 transition-all shrink-0"
                  aria-label="Buscar productos"
                />
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--panel)]/80 transition-all hover:shadow-md border border-[var(--border)]/30"
                  aria-label="Importar factura"
                  title="Importar factura (XML, PDF, CSV)"
                >
                  <FaFileInvoice className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/inventory/pedidos')}
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--panel)]/80 transition-all hover:shadow-md border border-[var(--border)]/30"
                  aria-label="Ver pedido"
                >
                  <FaShoppingCart className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowBarcodeModal(true)}
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--panel)]/80 transition-all hover:shadow-md border border-[var(--border)]/30"
                  aria-label="Imprimir etiquetas de código de barras"
                  title="Imprimir etiquetas de código de barras"
                >
                  <FaBarcode className="w-5 h-5" />
                </button>
                <LiquidButton size="sm" onClick={() => setShowAddProduct(true)}>
                  <span className="whitespace-nowrap">+ Agregar producto</span>
                </LiquidButton>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl bg-[var(--panel)]/40 py-16 text-center text-sm text-[var(--muted)]">
                Cargando productos...
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {filtered.length === 0 ? (
                  <div className="lg:col-span-2 rounded-2xl bg-[var(--panel)]/40 py-16 text-center text-sm text-[var(--muted)]">
                    No hay productos que coincidan.
                  </div>
                ) : (
                  paginatedFiltered.map((product) => (
                    <InventoryRow
                      key={product.id}
                      product={product}
                      onAddedToOrder={handleProductAddedToOrder}
                    />
                  ))
                )}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 py-2 pb-8 md:pb-2">
              <p className="text-xs text-[var(--muted)]">
                Mostrando {showingFrom}-{showingTo} de {sortedFiltered.length} productos
              </p>
              {sortedFiltered.length > ITEMS_PER_PAGE && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 rounded-md text-xs border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)]/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  {visiblePages.map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-8 px-2 py-1 rounded-md text-xs border transition-colors ${
                        page === currentPage
                          ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]'
                          : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)]/40'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 rounded-md text-xs border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)]/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => navigate('/inventario/nuevo')}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/15 transition-colors"
              >
                <FaBoxes className="w-3 h-3" />
                Inventario nuevo (registro masivo)
              </button>
            </div>
          </>
        )}

        {showAddProduct && (
          <ProductModal
            product={null}
            onClose={() => setShowAddProduct(false)}
            onSave={async (productData) => {
              try {
                await createProduct(productData)
                await fetchProducts()
                setShowAddProduct(false)
                setViewMode('results') // Show results after adding product
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
              setViewMode('results') // Show results after import
            }}
          />
        )}

        {showBarcodeModal && (
          <BarcodePrintModal onClose={() => setShowBarcodeModal(false)} />
        )}

        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-[120] pointer-events-none">
            <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--panel)] px-4 py-3 text-sm font-medium text-[var(--text)] shadow-xl shadow-black/35">
              {toastMessage}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
