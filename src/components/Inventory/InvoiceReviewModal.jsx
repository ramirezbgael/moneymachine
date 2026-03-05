import React, { useState, useEffect, useRef } from 'react'
import { FaTimes, FaCheck, FaEdit, FaSearch, FaPlus, FaExclamationTriangle, FaChevronDown, FaChevronUp } from 'react-icons/fa'
import { useSettingsStore } from '../../store/settingsStore'
import { matchingService } from '../../services/matchingService'
import { productService } from '../../services/productService'
import { useInventoryStore } from '../../store/inventoryStore'
import './InvoiceReviewModal.css'

/**
 * Invoice Review Modal
 * Shows all invoice items in a table with matching, allows editing and confirmation
 */
const InvoiceReviewModal = ({ invoiceData, onClose, onComplete }) => {
  const t = useSettingsStore(state => state.t)
  const { createProduct, updateProduct, fetchProducts } = useInventoryStore()
  const [items, setItems] = useState([])
  const [isMatching, setIsMatching] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [stats, setStats] = useState({ total: 0, confirmed: 0, new: 0, skipped: 0 })
  const tableRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    if (invoiceData && invoiceData.items) {
      matchItems()
    }
  }, [invoiceData])

  useEffect(() => {
    // Keyboard navigation
    const handleKeyDown = (e) => {
      if (editingItem !== null) return // Don't navigate while editing
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          if (selectedIndex < items.length - 1) {
            setSelectedIndex(selectedIndex + 1)
            scrollToItem(selectedIndex + 1)
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          if (selectedIndex > 0) {
            setSelectedIndex(selectedIndex - 1)
            scrollToItem(selectedIndex - 1)
          }
          break
        case 'Enter':
          e.preventDefault()
          if (items[selectedIndex] && !items[selectedIndex].isConfirmed) {
            handleConfirmItem(selectedIndex)
          }
          break
        case 'Escape':
          e.preventDefault()
          if (editingItem !== null) {
            setEditingItem(null)
          } else {
            onClose()
          }
          break
        case '/':
          if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault()
            searchInputRef.current?.focus()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, items, editingItem])

  const matchItems = async () => {
    if (!invoiceData || !invoiceData.items) return
    
    setIsMatching(true)
    try {
      const matchedItems = await matchingService.matchInvoiceItems(invoiceData.items)
      
      // Calculate suggested sale price (33% markup) for each item
      const itemsWithPricing = matchedItems.map(item => {
        const cost = item.cost || item.price || 0 // Purchase price from invoice
        const suggestedSalePrice = cost * 1.33 // 33% markup
        return {
          ...item,
          cost: cost, // Purchase price (costo de compra)
          suggestedSalePrice: Math.round(suggestedSalePrice * 100) / 100, // Round to 2 decimals
          salePrice: item.selectedProduct?.price || suggestedSalePrice // Use existing price if product exists, otherwise suggested
        }
      })
      
      setItems(itemsWithPricing)
      setStats(prev => ({ ...prev, total: itemsWithPricing.length }))
    } catch (error) {
      console.error('Error matching items:', error)
    } finally {
      setIsMatching(false)
    }
  }

  const scrollToItem = (index) => {
    const row = tableRef.current?.querySelector(`[data-item-index="${index}"]`)
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleSearch = async (query) => {
    setSearchQuery(query)
    if (!query || query.trim() === '') {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const results = await productService.search(query)
      setSearchResults(results.slice(0, 10))
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectProduct = (itemIndex, product) => {
    const item = items[itemIndex]
    const cost = item.cost || item.price || 0
    const suggestedSalePrice = cost * 1.33
    
    setItems(prev => prev.map((it, idx) => 
      idx === itemIndex 
        ? { 
            ...it, 
            selectedProduct: product, 
            action: 'match', 
            isEditing: false,
            cost: cost, // Keep invoice cost
            suggestedSalePrice: Math.round(suggestedSalePrice * 100) / 100,
            salePrice: product.price || suggestedSalePrice // Use existing price or suggested
          }
        : it
    ))
    setEditingItem(null)
  }

  const handleMarkAsNew = (itemIndex) => {
    setItems(prev => prev.map((item, idx) => 
      idx === itemIndex 
        ? { ...item, selectedProduct: null, action: 'new', isEditing: false }
        : item
    ))
    setEditingItem(null)
  }

  const handleEditItem = (itemIndex) => {
    setEditingItem(itemIndex)
    setSelectedIndex(itemIndex)
  }

  const handleUpdateItem = (itemIndex, updates) => {
    setItems(prev => prev.map((item, idx) => 
      idx === itemIndex 
        ? { ...item, ...updates, isEditing: false }
        : item
    ))
    setEditingItem(null)
  }

  const handleUpdateSalePrice = (itemIndex, newSalePrice) => {
    setItems(prev => prev.map((item, idx) => 
      idx === itemIndex 
        ? { ...item, salePrice: parseFloat(newSalePrice) || item.suggestedSalePrice }
        : item
    ))
  }

  const handleConfirmItem = async (itemIndex) => {
    const item = items[itemIndex]
    if (!item || item.isConfirmed) return

    try {
      // Get sale price (user edited or suggested)
      const salePrice = item.salePrice || item.suggestedSalePrice || (item.cost * 1.33)
      const cost = item.cost || item.price || 0
      
      if (item.action === 'new' || !item.selectedProduct) {
        // Create new product with both cost and price
        const productData = {
          name: item.name,
          code: item.code || `PROD${Date.now()}-${itemIndex}`,
          barcode: item.barcode || '',
          price: salePrice, // Sale price (precio de venta)
          cost: cost, // Purchase price (precio de compra)
          stock: item.stock || 0,
          description: item.description || item.name
        }
        
        const newProduct = await createProduct(productData)
        
        setItems(prev => prev.map((it, idx) => 
          idx === itemIndex 
            ? { ...it, selectedProduct: newProduct, isConfirmed: true, action: 'match' }
            : it
        ))
        
        setStats(prev => ({ ...prev, confirmed: prev.confirmed + 1, new: prev.new + 1 }))
      } else if (item.selectedProduct) {
        // Update existing product: stock, cost, and price
        const newStock = (item.selectedProduct.stock || 0) + (item.stock || 0)
        await updateProduct(item.selectedProduct.id, { 
          stock: newStock,
          cost: cost, // Update purchase price
          price: salePrice // Update sale price
        })
        
        setItems(prev => prev.map((it, idx) => 
          idx === itemIndex 
            ? { ...it, isConfirmed: true }
            : it
        ))
        
        setStats(prev => ({ ...prev, confirmed: prev.confirmed + 1 }))
      }
    } catch (error) {
      console.error('Error confirming item:', error)
      alert(`Error: ${error.message}`)
    }
  }

  const handleSkipItem = (itemIndex) => {
    setItems(prev => prev.map((item, idx) => 
      idx === itemIndex 
        ? { ...item, isSkipped: true, isConfirmed: false }
        : item
    ))
    setStats(prev => ({ ...prev, skipped: prev.skipped + 1 }))
  }

  const handleConfirmAll = async () => {
    const unconfirmed = items.filter((item, idx) => !item.isConfirmed && !item.isSkipped)
    
    for (let i = 0; i < unconfirmed.length; i++) {
      const item = unconfirmed[i]
      const index = items.findIndex((it, idx) => it === item && idx === items.indexOf(item))
      const actualIndex = items.findIndex((it, idx) => 
        it.name === item.name && 
        it.price === item.price && 
        it.stock === item.stock &&
        !it.isConfirmed && 
        !it.isSkipped
      )
      
      if (actualIndex >= 0) {
        await handleConfirmItem(actualIndex)
        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    await fetchProducts()
    onComplete?.()
    setTimeout(() => onClose(), 1000)
  }

  const getConfidenceBadge = (confidence) => {
    const color = matchingService.getConfidenceColor(confidence)
    const label = matchingService.getConfidenceLabel(confidence)
    
    return (
      <span className="invoice-review__confidence-badge" style={{ backgroundColor: `${color}20`, color, borderColor: `${color}40` }}>
        {label}
      </span>
    )
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0)
  }

  // Check for parsing errors
  if (invoiceData?._parsingError) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal invoice-review-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal__header">
            <h2 className="modal__title">Error al Procesar Factura</h2>
            <button className="modal__close" onClick={onClose}>×</button>
          </div>
          <div className="modal__content">
            <div className="invoice-review__error">
              <FaExclamationTriangle />
              <div>
                <h3>No se detectaron partidas válidas</h3>
                <p>{invoiceData._parsingError}</p>
                <p className="invoice-review__error-hint">
                  <strong>Sugerencias:</strong>
                </p>
                <ul className="invoice-review__error-list">
                  <li>Verifica que el PDF contenga texto (no imágenes escaneadas)</li>
                  <li>Revisa que la factura tenga una sección de productos/conceptos claramente identificable</li>
                  <li>Intenta convertir el PDF a formato XML o CSV</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="modal__footer">
            <button className="modal__btn modal__btn--primary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isMatching) {
    return (
      <div className="modal-overlay">
        <div className="modal invoice-review-modal">
          <div className="invoice-review__loading">
            <div className="invoice-review__spinner" />
            <p>Buscando coincidencias en el inventario...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal invoice-review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h2 className="modal__title">Revisar Factura</h2>
            {invoiceData.supplier && (
              <p className="invoice-review__supplier">Proveedor: {invoiceData.supplier}</p>
            )}
            {invoiceData.folio && (
              <p className="invoice-review__folio">Folio: {invoiceData.folio}</p>
            )}
          </div>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>

        <div className="modal__content">
          {/* Parsing Warning */}
          {invoiceData?._parsingWarning && (
            <div className="invoice-review__warning">
              <FaExclamationTriangle />
              <span>{invoiceData._parsingWarning}</span>
            </div>
          )}

          {/* Stats */}
          <div className="invoice-review__stats">
            <div className="invoice-review__stat">
              <span className="invoice-review__stat-label">Total:</span>
              <span className="invoice-review__stat-value">{stats.total}</span>
            </div>
            <div className="invoice-review__stat invoice-review__stat--success">
              <span className="invoice-review__stat-label">Confirmados:</span>
              <span className="invoice-review__stat-value">{stats.confirmed}</span>
            </div>
            <div className="invoice-review__stat invoice-review__stat--new">
              <span className="invoice-review__stat-label">Nuevos:</span>
              <span className="invoice-review__stat-value">{stats.new}</span>
            </div>
            <div className="invoice-review__stat invoice-review__stat--warning">
              <span className="invoice-review__stat-label">Omitidos:</span>
              <span className="invoice-review__stat-value">{stats.skipped}</span>
            </div>
          </div>

          {/* Search */}
          <div className="invoice-review__search">
            <div className="invoice-review__search-input-wrapper">
              <FaSearch className="invoice-review__search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar producto (/)"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="invoice-review__search-input"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="invoice-review__search-results">
                {searchResults.map((product) => (
                  <div
                    key={product.id}
                    className="invoice-review__search-item"
                    onClick={() => {
                      if (editingItem !== null) {
                        handleSelectProduct(editingItem, product)
                      }
                    }}
                  >
                    <div className="invoice-review__search-name">{product.name}</div>
                    <div className="invoice-review__search-code">Código: {product.code}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="invoice-review__table-container">
            <table className="invoice-review__table" ref={tableRef}>
              <thead>
                <tr>
                  <th style={{ width: '30px' }}></th>
                  <th style={{ width: '30%' }}>Descripción</th>
                  <th style={{ width: '12%' }}>Coincidencia</th>
                  <th style={{ width: '8%' }}>Cantidad</th>
                  <th style={{ width: '12%' }}>Precio Compra</th>
                  <th style={{ width: '12%' }}>Precio Venta</th>
                  <th style={{ width: '12%' }}>Subtotal</th>
                  <th style={{ width: '4%' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr
                    key={index}
                    data-item-index={index}
                    className={`
                      invoice-review__row
                      ${selectedIndex === index ? 'invoice-review__row--selected' : ''}
                      ${item.isConfirmed ? 'invoice-review__row--confirmed' : ''}
                      ${item.isSkipped ? 'invoice-review__row--skipped' : ''}
                    `}
                    onClick={() => setSelectedIndex(index)}
                  >
                    <td>
                      {item.isConfirmed ? (
                        <FaCheck className="invoice-review__check-icon" />
                      ) : item.isSkipped ? (
                        <span className="invoice-review__skip-icon">—</span>
                      ) : (
                        <span className="invoice-review__pending-icon">○</span>
                      )}
                    </td>
                    <td>
                      {editingItem === index ? (
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(index, { name: e.target.value })}
                          className="invoice-review__edit-input"
                          autoFocus
                          onBlur={() => setEditingItem(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setEditingItem(null)
                            }
                          }}
                        />
                      ) : (
                        <div className="invoice-review__description">
                          <div className="invoice-review__description-text">
                            <strong>{item.name}</strong>
                            <span className="invoice-review__description-label"> (de la factura)</span>
                          </div>
                          {item.selectedProduct && (
                            <div className="invoice-review__matched-product invoice-review__matched-product--active">
                              → Se actualizará: <strong>{item.selectedProduct.name}</strong>
                            </div>
                          )}
                          {item._lowConfidenceWarning && item.bestMatch && (
                            <div className="invoice-review__matched-product invoice-review__matched-product--warning">
                              ⚠️ Coincidencia sugerida: {item.bestMatch.product.name} (BAJA)
                              <br />
                              <span className="invoice-review__action-hint">→ Se creará como producto nuevo</span>
                            </div>
                          )}
                          {!item.selectedProduct && !item._lowConfidenceWarning && (
                            <div className="invoice-review__matched-product invoice-review__matched-product--new">
                              → Se creará como producto nuevo
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      {item._lowConfidenceWarning && item.bestMatch ? (
                        <div className="invoice-review__match-info invoice-review__match-info--warning">
                          {getConfidenceBadge(item.bestMatch.confidence)}
                          <div className="invoice-review__match-name">
                            {item.bestMatch.product.name}
                          </div>
                          <div className="invoice-review__low-confidence-hint">
                            ⚠️ Coincidencia baja - Se sugiere crear producto nuevo
                          </div>
                        </div>
                      ) : item.bestMatch ? (
                        <div className="invoice-review__match-info">
                          {getConfidenceBadge(item.bestMatch.confidence)}
                          {item.bestMatch.product && (
                            <div className="invoice-review__match-name">
                              {item.bestMatch.product.name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="invoice-review__no-match">Nuevo producto</span>
                      )}
                    </td>
                    <td>
                      {editingItem === index ? (
                        <input
                          type="number"
                          value={item.stock || 0}
                          onChange={(e) => handleUpdateItem(index, { stock: parseFloat(e.target.value) || 0 })}
                          className="invoice-review__edit-input invoice-review__edit-input--number"
                          min="0"
                          step="1"
                        />
                      ) : (
                        <span>{item.stock || 0}</span>
                      )}
                    </td>
                    <td>
                      <span className="invoice-review__cost">
                        {formatCurrency(item.cost || item.price || 0)}
                      </span>
                    </td>
                    <td>
                      <div className="invoice-review__price-edit">
                        <input
                          type="number"
                          value={item.salePrice || item.suggestedSalePrice || 0}
                          onChange={(e) => handleUpdateSalePrice(index, e.target.value)}
                          className="invoice-review__edit-input invoice-review__edit-input--number invoice-review__sale-price-input"
                          min="0"
                          step="0.01"
                          placeholder={item.suggestedSalePrice?.toFixed(2)}
                          disabled={item.isConfirmed}
                        />
                        {item.suggestedSalePrice && !item.isConfirmed && (
                          <span className="invoice-review__suggested-hint">
                            Sugerido: {formatCurrency(item.suggestedSalePrice)} (+33%)
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="invoice-review__subtotal">
                        {formatCurrency((item.salePrice || item.suggestedSalePrice || item.price || 0) * (item.stock || 0))}
                      </span>
                    </td>
                    <td>
                      <div className="invoice-review__actions">
                        {!item.isConfirmed && !item.isSkipped && (
                          <>
                            <button
                              className="invoice-review__action-btn invoice-review__action-btn--edit"
                              onClick={() => handleEditItem(index)}
                              title="Editar"
                            >
                              <FaEdit />
                            </button>
                            {item._lowConfidenceWarning ? (
                              <>
                                <button
                                  className="invoice-review__action-btn invoice-review__action-btn--new"
                                  onClick={() => handleConfirmItem(index)}
                                  title="Crear como producto nuevo (recomendado)"
                                >
                                  <FaPlus />
                                </button>
                                {item.bestMatch && (
                                  <button
                                    className="invoice-review__action-btn invoice-review__action-btn--confirm"
                                    onClick={() => {
                                      // Force match with low confidence product
                                      handleSelectProduct(index, item.bestMatch.product)
                                      setTimeout(() => handleConfirmItem(index), 100)
                                    }}
                                    title="Usar coincidencia baja (no recomendado)"
                                  >
                                    <FaCheck />
                                  </button>
                                )}
                              </>
                            ) : item.bestMatch && item.selectedProduct ? (
                              <button
                                className="invoice-review__action-btn invoice-review__action-btn--confirm"
                                onClick={() => handleConfirmItem(index)}
                                title="Confirmar coincidencia"
                              >
                                <FaCheck />
                              </button>
                            ) : (
                              <button
                                className="invoice-review__action-btn invoice-review__action-btn--new"
                                onClick={() => handleConfirmItem(index)}
                                title="Crear producto nuevo"
                              >
                                <FaPlus />
                              </button>
                            )}
                            <button
                              className="invoice-review__action-btn invoice-review__action-btn--skip"
                              onClick={() => handleSkipItem(index)}
                              title="Omitir"
                            >
                              ×
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Keyboard hints */}
          <div className="invoice-review__hints">
            <span>↑ ↓ Navegar</span>
            <span>Enter Confirmar</span>
            <span>Esc Cancelar</span>
            <span>/ Buscar</span>
          </div>
        </div>

        <div className="modal__footer">
          <button
            className="modal__btn modal__btn--secondary"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="modal__btn modal__btn--primary"
            onClick={handleConfirmAll}
            disabled={stats.confirmed === stats.total}
          >
            Confirmar Todos ({stats.total - stats.confirmed} pendientes)
          </button>
        </div>
      </div>
    </div>
  )
}

export default InvoiceReviewModal
