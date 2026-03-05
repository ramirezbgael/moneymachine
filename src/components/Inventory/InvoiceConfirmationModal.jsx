import React, { useState, useEffect } from 'react'
import { FaTimes, FaCheck, FaSearch, FaEdit, FaExclamationTriangle, FaSpinner } from 'react-icons/fa'
import { useSettingsStore } from '../../store/settingsStore'
import { productService } from '../../services/productService'
import { useInventoryStore } from '../../store/inventoryStore'
import './InvoiceConfirmationModal.css'

/**
 * Invoice Confirmation Modal
 * Shows each product from invoice, searches for matches, and allows confirmation/editing
 */
const InvoiceConfirmationModal = ({ products, onClose, onComplete }) => {
  const t = useSettingsStore(state => state.t)
  const { createProduct, updateProduct, fetchProducts } = useInventoryStore()
  const [processedProducts, setProcessedProducts] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [editingCode, setEditingCode] = useState(false)
  const [editedCode, setEditedCode] = useState('')
  const [stats, setStats] = useState({ total: 0, processed: 0, skipped: 0, errors: 0 })

  useEffect(() => {
    if (products && products.length > 0) {
      // Initialize processed products with search state
      const initialized = products.map((product, idx) => ({
        ...product,
        _index: idx,
        _matchedProduct: null,
        _isSearching: false,
        _isConfirmed: false,
        _isSkipped: false,
        _error: null,
        _finalCode: product.code || `PROD${Date.now()}-${idx}`
      }))
      setProcessedProducts(initialized)
      setStats({ total: products.length, processed: 0, skipped: 0, errors: 0 })
      setEditedCode(initialized[0]?._finalCode || '')
      
      // Auto-search for first product
      if (initialized[0]) {
        searchForMatch(initialized[0], 0)
      }
    }
  }, [products])

  const searchForMatch = async (product, index) => {
    if (!product.code || product.code === '') return
    
    setIsSearching(true)
    setProcessedProducts(prev => 
      prev.map((p, i) => i === index ? { ...p, _isSearching: true } : p)
    )

    try {
      // Search by code
      const match = await productService.findByCode(product.code)
      
      setProcessedProducts(prev => 
        prev.map((p, i) => 
          i === index 
            ? { ...p, _matchedProduct: match || null, _isSearching: false }
            : p
        )
      )
      
      // Also do a text search for similar products
      if (!match && product.name) {
        const searchResults = await productService.search(product.name.substring(0, 20))
        setSearchResults(searchResults.slice(0, 5)) // Limit to 5 results
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setProcessedProducts(prev => 
        prev.map((p, i) => 
          i === index ? { ...p, _isSearching: false } : p
        )
      )
    } finally {
      setIsSearching(false)
    }
  }

  const handleConfirmProduct = async () => {
    const currentProduct = processedProducts[currentIndex]
    if (!currentProduct) return

    setIsProcessing(true)

    try {
      const finalCode = editingCode ? editedCode.trim() : currentProduct._finalCode
      
      if (!finalCode || finalCode === '') {
        throw new Error('El código no puede estar vacío')
      }

      // Check if code already exists (if not matching existing product)
      if (!currentProduct._matchedProduct) {
        const existing = await productService.findByCode(finalCode)
        if (existing && existing.id !== currentProduct._matchedProduct?.id) {
          throw new Error(`El código "${finalCode}" ya existe en el inventario`)
        }
      }

      // Prepare product data
      const productData = {
        name: currentProduct.name,
        code: finalCode,
        barcode: currentProduct.barcode || finalCode,
        price: currentProduct.price || 0,
        cost: currentProduct.cost || currentProduct.price || 0,
        stock: currentProduct.stock || 0,
        description: currentProduct.description || currentProduct.name
      }

      // If matched product exists, update stock instead of creating
      if (currentProduct._matchedProduct) {
        const newStock = (currentProduct._matchedProduct.stock || 0) + (currentProduct.stock || 0)
        await updateProduct(
          currentProduct._matchedProduct.id,
          { stock: newStock }
        )
      } else {
        // Create new product
        await createProduct(productData)
      }

      // Mark as confirmed
      setProcessedProducts(prev => 
        prev.map((p, i) => 
          i === currentIndex 
            ? { ...p, _isConfirmed: true, _finalCode: finalCode }
            : p
        )
      )

      setStats(prev => ({ ...prev, processed: prev.processed + 1 }))

      // Move to next product
      if (currentIndex < processedProducts.length - 1) {
        const nextIndex = currentIndex + 1
        setCurrentIndex(nextIndex)
        setEditedCode(processedProducts[nextIndex]?._finalCode || '')
        setEditingCode(false)
        setSearchResults([])
        
        // Auto-search next product
        if (processedProducts[nextIndex]) {
          searchForMatch(processedProducts[nextIndex], nextIndex)
        }
      } else {
        // All products processed
        await fetchProducts()
        onComplete?.()
        setTimeout(() => onClose(), 1500)
      }
    } catch (error) {
      console.error('Error confirming product:', error)
      setProcessedProducts(prev => 
        prev.map((p, i) => 
          i === currentIndex 
            ? { ...p, _error: error.message, _isConfirmed: false }
            : p
        )
      )
      setStats(prev => ({ ...prev, errors: prev.errors + 1 }))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSkipProduct = () => {
    setProcessedProducts(prev => 
      prev.map((p, i) => 
        i === currentIndex ? { ...p, _isSkipped: true } : p
      )
    )
    setStats(prev => ({ ...prev, skipped: prev.skipped + 1 }))

    // Move to next product
    if (currentIndex < processedProducts.length - 1) {
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      setEditedCode(processedProducts[nextIndex]?._finalCode || '')
      setEditingCode(false)
      setSearchResults([])
      
      if (processedProducts[nextIndex]) {
        searchForMatch(processedProducts[nextIndex], nextIndex)
      }
    } else {
      // All products processed
      fetchProducts()
      onComplete?.()
      setTimeout(() => onClose(), 1500)
    }
  }

  const handleUseMatch = (matchedProduct) => {
    setProcessedProducts(prev => 
      prev.map((p, i) => 
        i === currentIndex 
          ? { ...p, _matchedProduct: matchedProduct, _finalCode: matchedProduct.code }
          : p
      )
    )
    setEditedCode(matchedProduct.code)
    setEditingCode(false)
  }

  const currentProduct = processedProducts[currentIndex]
  const matchedProduct = currentProduct?._matchedProduct

  if (!currentProduct) {
    return null
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal invoice-confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Confirmar Productos de Factura</h2>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>

        <div className="modal__content">
          {/* Progress */}
          <div className="invoice-confirmation__progress">
            <div className="invoice-confirmation__progress-bar">
              <div 
                className="invoice-confirmation__progress-fill"
                style={{ width: `${((currentIndex + 1) / processedProducts.length) * 100}%` }}
              />
            </div>
            <div className="invoice-confirmation__progress-text">
              Producto {currentIndex + 1} de {processedProducts.length}
            </div>
          </div>

          {/* Stats */}
          <div className="invoice-confirmation__stats">
            <div className="invoice-confirmation__stat">
              <span className="invoice-confirmation__stat-label">Total:</span>
              <span className="invoice-confirmation__stat-value">{stats.total}</span>
            </div>
            <div className="invoice-confirmation__stat invoice-confirmation__stat--success">
              <span className="invoice-confirmation__stat-label">Procesados:</span>
              <span className="invoice-confirmation__stat-value">{stats.processed}</span>
            </div>
            <div className="invoice-confirmation__stat invoice-confirmation__stat--warning">
              <span className="invoice-confirmation__stat-label">Omitidos:</span>
              <span className="invoice-confirmation__stat-value">{stats.skipped}</span>
            </div>
            {stats.errors > 0 && (
              <div className="invoice-confirmation__stat invoice-confirmation__stat--error">
                <span className="invoice-confirmation__stat-label">Errores:</span>
                <span className="invoice-confirmation__stat-value">{stats.errors}</span>
              </div>
            )}
          </div>

          {/* Current Product */}
          <div className="invoice-confirmation__product">
            <h3 className="invoice-confirmation__product-title">Producto Actual</h3>
            
            <div className="invoice-confirmation__product-info">
              <div className="invoice-confirmation__field">
                <label>Nombre:</label>
                <div className="invoice-confirmation__value">{currentProduct.name}</div>
              </div>

              <div className="invoice-confirmation__field">
                <label>Código:</label>
                {editingCode ? (
                  <div className="invoice-confirmation__code-edit">
                    <input
                      type="text"
                      value={editedCode}
                      onChange={(e) => setEditedCode(e.target.value)}
                      className="invoice-confirmation__code-input"
                      autoFocus
                    />
                    <button
                      className="invoice-confirmation__code-save"
                      onClick={() => {
                        setEditingCode(false)
                        setProcessedProducts(prev => 
                          prev.map((p, i) => 
                            i === currentIndex 
                              ? { ...p, _finalCode: editedCode.trim() || currentProduct.code }
                              : p
                          )
                        )
                      }}
                    >
                      <FaCheck />
                    </button>
                  </div>
                ) : (
                  <div className="invoice-confirmation__code-display">
                    <span>{currentProduct._finalCode}</span>
                    <button
                      className="invoice-confirmation__code-edit-btn"
                      onClick={() => {
                        setEditingCode(true)
                        setEditedCode(currentProduct._finalCode)
                      }}
                    >
                      <FaEdit />
                    </button>
                    {currentProduct._isSearching && (
                      <FaSpinner className="invoice-confirmation__spinner" />
                    )}
                  </div>
                )}
              </div>

              <div className="invoice-confirmation__field-group">
                <div className="invoice-confirmation__field">
                  <label>Cantidad:</label>
                  <div className="invoice-confirmation__value">{currentProduct.stock || 0}</div>
                </div>
                <div className="invoice-confirmation__field">
                  <label>Precio Unitario:</label>
                  <div className="invoice-confirmation__value">
                    ${(currentProduct.price || 0).toFixed(2)}
                  </div>
                </div>
                <div className="invoice-confirmation__field">
                  <label>Costo:</label>
                  <div className="invoice-confirmation__value">
                    ${(currentProduct.cost || currentProduct.price || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Match Found */}
            {matchedProduct && (
              <div className="invoice-confirmation__match">
                <div className="invoice-confirmation__match-header">
                  <FaCheck />
                  <span>Coincidencia encontrada</span>
                </div>
                <div className="invoice-confirmation__match-info">
                  <div><strong>Nombre:</strong> {matchedProduct.name}</div>
                  <div><strong>Código:</strong> {matchedProduct.code}</div>
                  <div><strong>Stock actual:</strong> {matchedProduct.stock || 0}</div>
                  <div><strong>Nuevo stock:</strong> {(matchedProduct.stock || 0) + (currentProduct.stock || 0)}</div>
                </div>
                <button
                  className="invoice-confirmation__match-btn"
                  onClick={() => handleUseMatch(matchedProduct)}
                >
                  Usar este producto
                </button>
              </div>
            )}

            {/* Search Results */}
            {!matchedProduct && searchResults.length > 0 && (
              <div className="invoice-confirmation__search-results">
                <div className="invoice-confirmation__search-header">
                  <FaSearch />
                  <span>Productos similares encontrados</span>
                </div>
                <div className="invoice-confirmation__search-list">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="invoice-confirmation__search-item"
                      onClick={() => handleUseMatch(result)}
                    >
                      <div className="invoice-confirmation__search-name">{result.name}</div>
                      <div className="invoice-confirmation__search-code">Código: {result.code}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Match */}
            {!matchedProduct && !currentProduct._isSearching && searchResults.length === 0 && currentProduct.code && (
              <div className="invoice-confirmation__no-match">
                <FaExclamationTriangle />
                <span>No se encontró coincidencia. Se creará un nuevo producto.</span>
              </div>
            )}

            {/* Error */}
            {currentProduct._error && (
              <div className="invoice-confirmation__error">
                <FaExclamationTriangle />
                <span>{currentProduct._error}</span>
              </div>
            )}
          </div>
        </div>

        <div className="modal__footer">
          <button
            className="modal__btn modal__btn--secondary"
            onClick={handleSkipProduct}
            disabled={isProcessing}
          >
            Omitir
          </button>
          <button
            className="modal__btn modal__btn--primary"
            onClick={handleConfirmProduct}
            disabled={isProcessing || !currentProduct._finalCode}
          >
            {isProcessing ? 'Procesando...' : 'Confirmar y Continuar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default InvoiceConfirmationModal
