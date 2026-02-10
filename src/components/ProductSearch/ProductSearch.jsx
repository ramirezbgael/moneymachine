import React, { useState, useRef, useEffect } from 'react'
import { FaExclamationTriangle } from 'react-icons/fa'
import { useSaleStore } from '../../store/saleStore'
import { productService } from '../../services/productService'
import { quotationService } from '../../services/quotationService'
import { useSettingsStore } from '../../store/settingsStore'
import { playScanBeep } from '../../services/soundService'
import './ProductSearch.css'

const LOW_STOCK_THRESHOLD = 5
function getStockLevel(product) {
  if (typeof product.stock !== 'number') return 'ok'
  if (product.stock === 0) return 'none'
  if (product.stock <= LOW_STOCK_THRESHOLD) return 'low'
  return 'ok'
}

/**
 * Product search component
 * Always visible, listens to keyboard and barcode scanner
 */
const ProductSearch = () => {
  const t = useSettingsStore(state => state.t)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef(null)
  const resultsRef = useRef(null)
  const searchIdRef = useRef(0)
  const { addItem, clearSale, setDiscount } = useSaleStore()

  // Search products on query change (ignore stale responses so scan+Enter doesn't show old suggestions)
  useEffect(() => {
    if (!query.trim()) {
      searchIdRef.current += 1
      setResults([])
      setIsOpen(false)
      setSelectedIndex(-1)
      return
    }
    const id = ++searchIdRef.current
    let cancelled = false
    const run = async () => {
      const searchResults = await productService.search(query)
      if (cancelled || id !== searchIdRef.current) return
      setResults(searchResults)
      setIsOpen(searchResults.length > 0)
      setSelectedIndex(-1)
    }
    run()
    return () => { cancelled = true }
  }, [query])

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelectProduct(results[selectedIndex])
        } else if (results[0]) {
          handleSelectProduct(results[0])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setQuery('')
        inputRef.current?.blur()
        break
      default:
        break
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex]
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex, results])

  // Handle input change
  const handleChange = (e) => {
    setQuery(e.target.value)
  }

  // Handle Enter key for barcode scanning
  const handleKeyDownInput = async (e) => {
    if (e.key === 'Enter' && query.trim() && !isOpen) {
      e.preventDefault()
      const scannedCode = query.trim()
      
      // Check if it's a quotation code (starts with QUOTE-)
      if (scannedCode.startsWith('QUOTE-')) {
        try {
          console.log('📋 Quotation code detected:', scannedCode)
          const quotationData = await quotationService.quotationToSaleItems(scannedCode)
          
          if (quotationData && quotationData.items && quotationData.items.length > 0) {
            // Clear current sale
            clearSale()
            
            // Load quotation items
            for (const item of quotationData.items) {
              addItem(item.product, item.quantity)
            }
            
            // Set discount if exists
            if (quotationData.discount > 0) {
              setDiscount(quotationData.discount, 'percentage')
            }
            
            setQuery('')
            alert(`✅ Cotización cargada: ${quotationData.items.length} productos`)
            
            // Refocus for next scan
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.focus()
              }
            }, 100)
            return
          } else {
            alert('❌ Cotización no encontrada o expirada')
            setQuery('')
            return
          }
        } catch (error) {
          console.error('Error loading quotation:', error)
          alert('Error al cargar cotización: ' + error.message)
          setQuery('')
          return
        }
      }
      
      // Try to find product by code/barcode
      const product = await productService.findByCode(scannedCode)
      if (product) {
        addItem(product, 1)
        playScanBeep()
        searchIdRef.current += 1
        setResults([])
        setIsOpen(false)
        setQuery('')
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus()
          }
        }, 100)
      } else {
        // Product not found - could trigger quick add modal here
        searchIdRef.current += 1
        setResults([])
        setIsOpen(false)
        setQuery('')
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }
    }
  }

  // Handle product selection
  const handleSelectProduct = (product) => {
    addItem(product, 1)
    playScanBeep()
    searchIdRef.current += 1
    setResults([])
    setIsOpen(false)
    setSelectedIndex(-1)
    setQuery('')
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 100)
  }

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target) &&
        resultsRef.current &&
        !resultsRef.current.contains(e.target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-focus on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  return (
    <div className="product-search">
      <input
        ref={inputRef}
        type="text"
        className="product-search__input"
        value={query}
        onChange={handleChange}
        onKeyDown={(e) => {
          // Handle barcode scanning (Enter when dropdown is closed)
          if (!isOpen) {
            handleKeyDownInput(e)
          } else {
            // Handle navigation when dropdown is open
            handleKeyDown(e)
          }
        }}
        onFocus={() => {
          if (results.length > 0) {
            setIsOpen(true)
          }
        }}
        onBlur={(e) => {
          // Don't close if clicking on results
          if (!e.relatedTarget || !e.relatedTarget.closest('.product-search__results')) {
            // Delay to allow click on result
            setTimeout(() => setIsOpen(false), 200)
          }
        }}
        placeholder={t('currentSale.searchPlaceholder')}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        autoCapitalize="off"
        inputMode="text"
        name="barcode-sku"
        data-lpignore
        data-form-type="other"
        data-1p-ignore
        aria-autocomplete="list"
        role="searchbox"
      />

      {isOpen && results.length > 0 && (
        <div className="product-search__results" ref={resultsRef}>
          {results.map((product, index) => {
            const stockLevel = getStockLevel(product)
            const noStock = typeof product.stock === 'number' && product.stock === 0
            return (
              <div
                key={product.id}
                className={`product-search__result product-search__result--stock-${stockLevel} ${
                  index === selectedIndex ? 'product-search__result--selected' : ''
                }`}
                onClick={() => handleSelectProduct(product)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="product-search__result-code">{product.code}</div>
                <div className="product-search__result-main">
                  <div className="product-search__result-name">
                    {noStock && (
                      <span className="product-search__result-alert" title="Sin stock">
                        <FaExclamationTriangle />
                      </span>
                    )}
                    {product.name}
                  </div>
                  {noStock && (
                    <div className="product-search__result-stock-msg">Sin stock</div>
                  )}
                </div>
                <div className="product-search__result-price">
                  ${product.price.toFixed(2)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ProductSearch