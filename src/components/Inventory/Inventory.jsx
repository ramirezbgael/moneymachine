import React, { useState, useEffect, useRef } from 'react'
import { FaEdit, FaTrash, FaPlus, FaMinus, FaHistory, FaExclamationTriangle, FaImage, FaFilter, FaTags, FaTruck, FaClock, FaBox, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa'
import { useInventoryStore } from '../../store/inventoryStore'
import { productService } from '../../services/productService'
import { useSettingsStore } from '../../store/settingsStore'
import ProductModal from './ProductModal'
import ImagePreviewModal from './ImagePreviewModal'
import ImportModal from './ImportModal'
import './Inventory.css'

/**
 * Inventory view component
 * Enterprise-grade inventory management
 */
const Inventory = () => {
  const t = useSettingsStore(state => state.t)
  const { products, loading, error, fetchProducts, createProduct, updateProduct, deleteProduct } = useInventoryStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [activeFilters, setActiveFilters] = useState({
    outOfStock: false,
    lowStock: false
  })
  const [sortColumn, setSortColumn] = useState(null) // 'name', 'code', 'price', 'stock', 'lastMovement'
  const [sortDirection, setSortDirection] = useState('asc') // 'asc' or 'desc'
  const searchInputRef = useRef(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [lastSync, setLastSync] = useState(new Date())
  const [operationalView, setOperationalView] = useState(false)
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [adjustProduct, setAdjustProduct] = useState(null)
  const [adjustValue, setAdjustValue] = useState('0')
  const [adjustJustification, setAdjustJustification] = useState('')
  const [adjustJustificationError, setAdjustJustificationError] = useState('')
  const [previewImage, setPreviewImage] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)

  useEffect(() => {
    fetchProducts()
    setLastSync(new Date())
  }, [fetchProducts])

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only focus if not typing in an input
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Calculate inventory metrics for filter links
  const inventoryMetrics = {
    outOfStock: products.filter(p => p.stock === 0).length,
    lowStock: products.filter(p => p.stock > 0 && p.stock <= 10).length
  }

  // Handle filter toggle
  const toggleFilter = (filterName) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterName]: !prev[filterName]
    }))
  }

  // Handle column sorting
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to ascending
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Filter products based on search and filters
  let filteredProducts = products.filter(product => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = 
        product.code?.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query) ||
        product.name?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }

    // Alert filter (keep for backward compatibility)
    if (selectedAlert === 'critical') {
      if (product.stock > 5 || product.stock === 0) return false
    } else if (selectedAlert === 'lowStock') {
      if (product.stock <= 5 || product.stock > 10 || product.stock === 0) return false
    } else if (selectedAlert === 'noMovement') {
      const lastSale = product.last_sale_date || product.lastSaleDate
      if (lastSale) {
        const daysSinceSale = (new Date() - new Date(lastSale)) / (1000 * 60 * 60 * 24)
        if (daysSinceSale <= 30) return false
      }
    }

    // New filter system - Simple out of stock and low stock filters
    if (activeFilters.outOfStock) {
      // Show only products with stock === 0
      if (product.stock !== 0) return false
    }
    
    if (activeFilters.lowStock) {
      // Show only products with stock > 0 and <= 10
      if (product.stock === 0 || product.stock > 10) return false
    }
    
    // If both filters are active, show products that match either condition
    if (activeFilters.outOfStock && activeFilters.lowStock) {
      if (product.stock > 10) return false
    }

    return true
  })

  // Sort filtered products
  if (sortColumn) {
    filteredProducts = [...filteredProducts].sort((a, b) => {
      let aValue, bValue

      switch (sortColumn) {
        case 'name':
          aValue = (a.name || '').toLowerCase()
          bValue = (b.name || '').toLowerCase()
          break
        case 'code':
          aValue = (a.code || '').toLowerCase()
          bValue = (b.code || '').toLowerCase()
          break
        case 'price':
          aValue = parseFloat(a.price || 0)
          bValue = parseFloat(b.price || 0)
          break
        case 'stock':
          aValue = parseInt(a.stock || 0)
          bValue = parseInt(b.stock || 0)
          break
        case 'lastMovement':
          const aDate = a.last_sale_date || a.lastSaleDate
          const bDate = b.last_sale_date || b.lastSaleDate
          aValue = aDate ? new Date(aDate).getTime() : 0
          bValue = bDate ? new Date(bDate).getTime() : 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  const handleAddProduct = () => {
    setEditingProduct(null)
    setShowAddModal(true)
  }

  const handleEditProduct = (product) => {
    setEditingProduct(product)
    setShowAddModal(true)
  }

  const changeAdjustValue = (delta) => {
    setAdjustValue(prev => {
      const current = Math.max(0, parseInt(prev || '0', 10))
      const next = Math.max(0, current + delta)
      return String(next)
    })
  }

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(productId)
    }
  }

  // Quick actions with modal - unified stock adjustment
  const openAdjustModal = (product) => {
    setAdjustProduct(product)
    setAdjustValue(`${product.stock || 0}`)
    setAdjustJustification('')
    setAdjustJustificationError('')
    setAdjustModalOpen(true)
  }

  const closeAdjustModal = () => {
    setAdjustModalOpen(false)
    setAdjustProduct(null)
    setAdjustValue('0')
    setAdjustJustification('')
    setAdjustJustificationError('')
  }

  const handleAdjustConfirm = async () => {
    if (!adjustProduct) return
    
    // Validate justification
    if (!adjustJustification || adjustJustification.trim() === '') {
      setAdjustJustificationError('Debes justificar el cambio de stock')
      return
    }

    const newStock = Math.max(0, parseInt(adjustValue, 10) || 0)
    const oldStock = adjustProduct.stock || 0
    
    // Update product with justification
    await updateProduct(adjustProduct.id, { 
      ...adjustProduct, 
      stock: newStock,
      stockJustification: adjustJustification.trim(),
      stockChangeDate: new Date().toISOString()
    })
    
    closeAdjustModal()
  }

  const viewMovements = (product) => {
    window.alert(`Movements for ${product.name || product.code || 'product'} coming soon.`)
  }

  const handleAlertClick = (alertType) => {
    if (selectedAlert === alertType) {
      setSelectedAlert(null)
    } else {
      setSelectedAlert(alertType)
    }
  }

  const formatLastSync = (date) => {
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStockStatus = (stock) => {
    if (stock === 0) return 'critical'
    if (stock <= 5) return 'critical'  // Red
    if (stock <= 15) return 'low'      // Yellow
    return 'ok'                        // Green
  }

  // Legacy active filters for display (keeping for compatibility)
  const legacyActiveFilters = [
    selectedAlert ? `Alert: ${selectedAlert}` : null,
    searchQuery ? `Search: ${searchQuery}` : null
  ].filter(Boolean)

  if (loading) {
    return (
      <div className="inventory">
        <div className="inventory__loading">Loading inventory...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="inventory">
        <div className="inventory__error">
          <p>Error loading inventory: {error}</p>
          <button onClick={() => fetchProducts()}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="inventory">
      {/* Header */}
      <header className="inventory__header">
        <div className="inventory__header-content">
          <div>
            <h1 className="inventory__title">{t('inventory.title')}</h1>
            <p className="inventory__subtitle">{t('inventory.subtitle')}</p>
          </div>
          <div className="inventory__header-actions">
            <button className="inventory__btn inventory__btn--secondary">
              {t('inventory.reports')}
            </button>
            <button 
              className="inventory__btn inventory__btn--tertiary"
              onClick={() => setShowImportModal(true)}
            >
              {t('inventory.import')}
            </button>
            <button className="inventory__btn inventory__btn--primary" onClick={handleAddProduct}>
              + {t('inventory.addProduct')}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="inventory__content">
        {/* Search Bar - Above everything */}
        <section className="inventory__search-section">
          <input
            ref={searchInputRef}
            type="text"
            className="inventory__search-input"
            placeholder={`${t('inventory.search')} (Presiona / para buscar)`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </section>

        {/* Simple Filter Links */}
        {(inventoryMetrics.outOfStock > 0 || inventoryMetrics.lowStock > 0) && (
          <section className="inventory__filter-links">
            {inventoryMetrics.outOfStock > 0 && (
              <a
                href="#"
                className={`inventory__filter-link inventory__filter-link--out-of-stock ${activeFilters.outOfStock ? 'inventory__filter-link--active' : ''}`}
                onClick={(e) => {
                  e.preventDefault()
                  toggleFilter('outOfStock')
                }}
              >
                Sin stock: {inventoryMetrics.outOfStock}
              </a>
            )}
            {inventoryMetrics.lowStock > 0 && (
              <a
                href="#"
                className={`inventory__filter-link inventory__filter-link--low-stock ${activeFilters.lowStock ? 'inventory__filter-link--active' : ''}`}
                onClick={(e) => {
                  e.preventDefault()
                  toggleFilter('lowStock')
                }}
              >
                Stock bajo: {inventoryMetrics.lowStock}
              </a>
            )}
          </section>
        )}

        {/* Product Table or Operational View */}
        {!operationalView ? (
          <section className="inventory__table-section">
            <div className="inventory__table-container">
              <table className="inventory__table">
                <thead>
                  <tr>
                    <th className="inventory__th-image"></th>
                    <th 
                      className="inventory__th-sortable"
                      onClick={() => handleSort('name')}
                    >
                      <span>{t('inventory.name')}</span>
                      <div className="inventory__sort-indicator">
                        {sortColumn === 'name' ? (
                          sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                        ) : (
                          <FaSort className="inventory__sort-icon--inactive" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="inventory__th-sortable"
                      onClick={() => handleSort('code')}
                    >
                      <span>{t('inventory.code')}</span>
                      <div className="inventory__sort-indicator">
                        {sortColumn === 'code' ? (
                          sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                        ) : (
                          <FaSort className="inventory__sort-icon--inactive" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="inventory__th-sortable"
                      onClick={() => handleSort('price')}
                    >
                      <span>{t('inventory.price')}</span>
                      <div className="inventory__sort-indicator">
                        {sortColumn === 'price' ? (
                          sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                        ) : (
                          <FaSort className="inventory__sort-icon--inactive" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="inventory__th-sortable"
                      onClick={() => handleSort('stock')}
                    >
                      <span>{t('inventory.stock')}</span>
                      <div className="inventory__sort-indicator">
                        {sortColumn === 'stock' ? (
                          sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                        ) : (
                          <FaSort className="inventory__sort-icon--inactive" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="inventory__th-sortable"
                      onClick={() => handleSort('lastMovement')}
                    >
                      <span>{t('inventory.lastMovement')}</span>
                      <div className="inventory__sort-indicator">
                        {sortColumn === 'lastMovement' ? (
                          sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                        ) : (
                          <FaSort className="inventory__sort-icon--inactive" />
                        )}
                      </div>
                    </th>
                    <th>{t('inventory.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="inventory__empty">
                        {searchQuery || selectedAlert ? t('inventory.noMatch') : t('inventory.empty')}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product, idx) => {
                      const stockStatus = getStockStatus(product.stock)
                      // Support both snake_case (from DB) and camelCase (from mock)
                      const lastSale = product.last_sale_date || product.lastSaleDate
                      const lastMovement = lastSale
                        ? new Date(lastSale).toLocaleDateString()
                        : '—'
                      const rowClass = `inventory__row inventory__row--${stockStatus} ${filteredProducts.length === 1 ? 'inventory__row--single' : ''}`
                      const productImage = product.image_url || product.image
                      return (
                        <tr key={product.id || idx} className={rowClass}>
                          <td className="inventory__image-cell">
                            <div 
                              className="inventory__thumbnail"
                              onClick={() => productImage && setPreviewImage(productImage)}
                              style={{ cursor: productImage ? 'pointer' : 'default' }}
                            >
                              {productImage ? (
                                <img 
                                  src={productImage} 
                                  alt={product.name}
                                  className="inventory__thumbnail-img"
                                />
                              ) : (
                                <div className="inventory__thumbnail-placeholder">
                                  <FaImage />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="inventory__name-cell">
                            <div className="inventory__name-primary">{product.name}</div>
                            {product.description && (
                              <div className="inventory__name-secondary">{product.description}</div>
                            )}
                          </td>
                          <td className="inventory__code-cell">
                            <div className="inventory__code">{product.code}</div>
                            {product.barcode && (
                              <div className="inventory__barcode-small">{product.barcode}</div>
                            )}
                          </td>
                          <td className="inventory__price-cell">
                            <div className="inventory__price-highlight">${product.price?.toFixed(2) || '0.00'}</div>
                          </td>
                          <td className="inventory__stock-cell">
                            <span className={`inventory__stock-badge inventory__stock-badge--${stockStatus}`}>
                              {product.stock || 0}
                            </span>
                          </td>
                          <td className="inventory__last-movement">{lastMovement}</td>
                          <td className="inventory__actions">
                            <div className="inventory__actions-grid">
                              <button
                                className="inventory__action-btn inventory__action-btn--stock"
                                onClick={() => openAdjustModal(product)}
                                title={t('inventory.adjustStock')}
                              >
                                ± Stock
                              </button>
                              <button
                                className="inventory__action-btn"
                                onClick={() => viewMovements(product)}
                                title="View movements"
                              >
                                <FaHistory />
                              </button>
                              <button
                                className="inventory__action-btn"
                                onClick={() => handleEditProduct(product)}
                                title="Edit"
                              >
                                <FaEdit />
                              </button>
                              <button
                                className="inventory__action-btn inventory__action-btn--delete"
                                onClick={() => handleDeleteProduct(product.id)}
                                title="Delete"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="inventory__operational">
            {filteredProducts.length === 0 ? (
              <div className="inventory__empty">
                {searchQuery || selectedAlert ? 'No products match the current filters' : 'No products in inventory'}
              </div>
            ) : (
              <div className="inventory__operational-grid">
                {filteredProducts.map((product, idx) => {
                  const stockStatus = getStockStatus(product.stock)
                  return (
                    <div key={product.id || idx} className={`inventory__op-card inventory__op-card--${stockStatus}`}>
                      <div className="inventory__op-name">{product.name}</div>
                      <div className="inventory__op-code">{product.code}</div>
                      <div className="inventory__op-stock">
                        Stock: <span className={`inventory__stock-pill inventory__stock-pill--${stockStatus}`}>{product.stock || 0}</span>
                      </div>
                      <div className="inventory__op-actions">
                        <button onClick={() => openAdjustModal(product)} className="inventory__op-btn inventory__op-btn--stock">
                          ± {t('inventory.stock')}
                        </button>
                      </div>
                      <div className="inventory__op-subtext">
                        Price: ${product.price?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowAddModal(false)
            setEditingProduct(null)
          }}
          onSave={async (productData) => {
            try {
              if (editingProduct) {
                await updateProduct(editingProduct.id, productData)
              } else {
                await createProduct(productData)
              }
              setShowAddModal(false)
              setEditingProduct(null)
            } catch (error) {
              console.error('Error saving product:', error)
              alert(error.message || 'Error al guardar el producto. Por favor, intenta de nuevo.')
            }
          }}
        />
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => {
            // Refresh products after import
            fetchProducts()
          }}
        />
      )}

      {/* Adjust Stock Modal */}
      {adjustModalOpen && (
        <div className="adjust-modal-overlay" onClick={closeAdjustModal}>
          <div className="adjust-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adjust-modal__header">
              <h3 className="adjust-modal__title">{t('inventory.adjustStock')}</h3>
              <button className="adjust-modal__close" onClick={closeAdjustModal}>×</button>
            </div>
            <div className="adjust-modal__content">
              <div className="adjust-modal__product">
                <div className="adjust-modal__name">{adjustProduct?.name}</div>
                <div className="adjust-modal__code">{adjustProduct?.code}</div>
                <div className="adjust-modal__stock">
                  {t('inventory.currentStock')}: {adjustProduct?.stock || 0}
                </div>
              </div>
              
              <label className="adjust-modal__label">
                {t('inventory.newStock')} <span className="adjust-modal__required">*</span>
              </label>
              <div className="adjust-modal__quantity">
                <button
                  className="adjust-modal__qty-btn adjust-modal__qty-btn--left"
                  onClick={() => changeAdjustValue(-1)}
                  aria-label="Decrease quantity"
                >
                  <FaMinus />
                </button>
                <input
                  type="number"
                  min="0"
                  className="adjust-modal__input"
                  value={adjustValue}
                  onChange={(e) => setAdjustValue(e.target.value)}
                />
                <button
                  className="adjust-modal__qty-btn adjust-modal__qty-btn--right"
                  onClick={() => changeAdjustValue(1)}
                  aria-label="Increase quantity"
                >
                  <FaPlus />
                </button>
              </div>

              {adjustProduct && (
                <div className="adjust-modal__difference">
                  {parseInt(adjustValue) > (adjustProduct.stock || 0) ? (
                    <span className="adjust-modal__diff--positive">
                      +{parseInt(adjustValue) - (adjustProduct.stock || 0)} {t('inventory.units')}
                    </span>
                  ) : parseInt(adjustValue) < (adjustProduct.stock || 0) ? (
                    <span className="adjust-modal__diff--negative">
                      {parseInt(adjustValue) - (adjustProduct.stock || 0)} {t('inventory.units')}
                    </span>
                  ) : (
                    <span className="adjust-modal__diff--neutral">
                      {t('inventory.noChange')}
                    </span>
                  )}
                </div>
              )}

              <label className="adjust-modal__label">
                {t('inventory.justification')} <span className="adjust-modal__required">*</span>
              </label>
              <textarea
                className="adjust-modal__justification"
                value={adjustJustification}
                onChange={(e) => {
                  setAdjustJustification(e.target.value)
                  setAdjustJustificationError('')
                }}
                placeholder={t('inventory.justificationPlaceholder')}
                rows="4"
                required
              />
              {adjustJustificationError && (
                <div className="adjust-modal__error">{adjustJustificationError}</div>
              )}
            </div>
            <div className="adjust-modal__footer">
              <button className="adjust-modal__btn adjust-modal__btn--secondary" onClick={closeAdjustModal}>
                {t('common.cancel')}
              </button>
              <button
                className="adjust-modal__btn adjust-modal__btn--primary"
                onClick={handleAdjustConfirm}
                disabled={!adjustValue || parseInt(adjustValue, 10) < 0}
              >
                {t('inventory.confirmAdjustment')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


export default Inventory