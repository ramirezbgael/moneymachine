import React, { useState, useEffect, useRef } from 'react'
import { FaExclamationTriangle } from 'react-icons/fa'
import { FixedSizeList as List } from 'react-window'
import { useSaleStore } from '../../store/saleStore'
import { useSettingsStore } from '../../store/settingsStore'
import './ItemsList.css'

const LOW_STOCK_THRESHOLD = 5
function getStockLevel(item) {
  const stock = item.product?.stock
  if (typeof stock !== 'number') return 'ok'
  if (stock === 0 || item.quantity > stock) return 'none'
  if (stock <= LOW_STOCK_THRESHOLD) return 'low'
  return 'ok'
}

/**
 * Virtualized items list component
 * - Infinite scroll with virtualization
 * - Inline quantity editing
 * - Keyboard navigation (↑ ↓ Delete + -)
 */
const ItemsList = () => {
  const t = useSettingsStore(state => state.t)
  const items = useSaleStore(state => state.items)
  const updateItemQuantity = useSaleStore(state => state.updateItemQuantity)
  const incrementQuantity = useSaleStore(state => state.incrementQuantity)
  const decrementQuantity = useSaleStore(state => state.decrementQuantity)
  const removeItem = useSaleStore(state => state.removeItem)
  
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [editingIndex, setEditingIndex] = useState(-1)
  const [editingValue, setEditingValue] = useState('')
  const listRef = useRef(null)

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle if typing in input
      if (e.target.tagName === 'INPUT') return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev < items.length - 1 ? prev + 1 : (items.length > 0 ? 0 : -1)
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
          break
        case 'Delete':
          e.preventDefault()
          if (selectedIndex >= 0 && items[selectedIndex]) {
            removeItem(items[selectedIndex].id)
            setSelectedIndex(Math.max(0, selectedIndex - 1))
          }
          break
        case '+':
        case '=':
        case 'ArrowRight':
          e.preventDefault()
          if (selectedIndex >= 0 && items[selectedIndex]) {
            incrementQuantity(items[selectedIndex].id)
          }
          break
        case '-':
        case '_':
        case 'ArrowLeft':
          e.preventDefault()
          if (selectedIndex >= 0 && items[selectedIndex]) {
            decrementQuantity(items[selectedIndex].id)
          }
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && items[selectedIndex]) {
            setEditingIndex(selectedIndex)
            setEditingValue(items[selectedIndex].quantity.toString())
          }
          break
        case 'Escape':
          e.preventDefault()
          setEditingIndex(-1)
          setSelectedIndex(-1)
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [items, selectedIndex, removeItem, incrementQuantity, decrementQuantity])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      listRef.current.scrollToItem(selectedIndex, 'smart')
    }
  }, [selectedIndex])

  // Handle quantity edit
  const handleQuantityEdit = (itemId, newValue) => {
    const numValue = parseInt(newValue)
    if (!isNaN(numValue) && numValue > 0) {
      updateItemQuantity(itemId, numValue)
    }
    setEditingIndex(-1)
  }

  // Render item row
  const Row = ({ index, style }) => {
    const item = items[index]
    if (!item) return null

    const isSelected = index === selectedIndex
    const isEditing = index === editingIndex
    const stockLevel = getStockLevel(item)
    const noStock = typeof item.product.stock === 'number' && (item.product.stock === 0 || item.quantity > item.product.stock)

    return (
      <div
        style={style}
        className={`items-list__row items-list__row--stock-${stockLevel} ${isSelected ? 'items-list__row--selected' : ''}`}
        onClick={() => setSelectedIndex(index)}
      >
        <div className="items-list__row-content">
          {/* Product Info */}
          <div className="items-list__name-cell">
            <div className="items-list__name">
              {noStock && (
                <span className="items-list__stock-alert" title="Stock insuficiente o sin stock">
                  <FaExclamationTriangle />
                </span>
              )}
              {item.product.name}
            </div>
            {noStock && (
              <div className="items-list__stock-msg">
                {item.product.stock === 0 ? 'Sin stock' : `Disponible: ${item.product.stock}`}
              </div>
            )}
          </div>

          {/* Unit Price */}
          <div className="items-list__unit-price">
            ${item.unitPrice.toFixed(2)}
          </div>

          {/* Quantity Controls */}
          <div className="items-list__quantity-controls">
            <button
              className="items-list__qty-btn"
              onClick={(e) => {
                e.stopPropagation()
                decrementQuantity(item.id)
              }}
              title="Decrease quantity (- or ←)"
            >
              −
            </button>
            
            {isEditing ? (
              <input
                type="number"
                min="1"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => handleQuantityEdit(item.id, editingValue)}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') {
                    handleQuantityEdit(item.id, editingValue)
                  } else if (e.key === 'Escape') {
                    setEditingIndex(-1)
                  }
                }}
                className="items-list__quantity-input"
                autoFocus
              />
            ) : (
              <span 
                className="items-list__quantity-value"
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  setEditingIndex(index)
                  setEditingValue(item.quantity.toString())
                }}
              >
                {item.quantity}
              </span>
            )}
            
            <button
              className="items-list__qty-btn"
              onClick={(e) => {
                e.stopPropagation()
                incrementQuantity(item.id)
              }}
              title="Increase quantity (+ or →)"
            >
              +
            </button>
          </div>

          {/* Subtotal */}
          <div className="items-list__subtotal">
            ${item.subtotal.toFixed(2)}
          </div>

          {/* Remove Button */}
          <button
            className="items-list__remove-btn"
            onClick={(e) => {
              e.stopPropagation()
              removeItem(item.id)
            }}
            title="Remove item (Delete)"
          >
            ×
          </button>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="items-list items-list--empty">
        <div className="items-list__empty-message">
          <p>{t('currentSale.empty')}</p>
          <p className="items-list__empty-hint">
            {t('currentSale.searchPlaceholder')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="items-list">
      <div className="items-list__header">
        <div className="items-list__header-name">{t('inventory.name')}</div>
        <div className="items-list__header-price">{t('inventory.price')}</div>
        <div className="items-list__header-quantity">{t('reports.quantity')}</div>
        <div className="items-list__header-subtotal">Subtotal</div>
        <div className="items-list__header-actions">{t('inventory.actions')}</div>
      </div>
      
      <div className="items-list__virtual-list">
        <List
          ref={listRef}
          height={600}
          width="100%"
          itemCount={items.length}
          itemSize={48}
        >
          {Row}
        </List>
      </div>
    </div>
  )
}

export default ItemsList