import React, { useRef, useEffect, useState } from 'react'
import { useSaleStore } from '../../store/saleStore'
import { productService } from '../../services/productService'
import './ScannerInput.css'

/**
 * Scanner input component
 * Listens to keyboard and barcode scanner input
 * - F2: Focus/refocus input
 * - Enter: Add product or trigger not found callback
 */
const ScannerInput = ({ onProductNotFound }) => {
  const inputRef = useRef(null)
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(true)
  const addItem = useSaleStore(state => state.addItem)

  // Auto-focus on mount and when F2 is pressed
  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isFocused])

  // Handle F2 hotkey globally
  useEffect(() => {
    const handleKeyDown = (e) => {
      // F2 key
      if (e.key === 'F2' || (e.key === 'f' && e.shiftKey && e.keyCode === 113)) {
        e.preventDefault()
        setIsFocused(true)
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Handle input change
  const handleChange = (e) => {
    setValue(e.target.value)
  }

  // Handle Enter key
  const handleKeyDown = async (e) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault()
      const barcode = value.trim()
      console.log('📥 Scanner input received:', barcode)
      setValue('')

      try {
        // Try to find product
        const product = await productService.findByCode(barcode)

        if (product) {
          console.log('✅ Product found, adding to sale:', product.name, product.code)
          // Product found - add to sale
          const success = addItem(product, 1)
          if (success) {
            console.log('✅ Product added successfully')
          } else {
            console.warn('⚠️ Product found but could not be added (stock issue?)')
            alert(`Producto encontrado pero no se pudo agregar. Verifica el stock disponible.`)
          }
          // Keep focus for next scan
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus()
            }
          }, 100)
        } else {
          console.warn('❌ Product not found:', barcode)
          // Product not found - show quick add modal
          if (onProductNotFound) {
            onProductNotFound(barcode)
          } else {
            alert(`Producto no encontrado: ${barcode}`)
          }
        }
      } catch (error) {
        console.error('❌ Error searching for product:', error)
        alert(`Error al buscar producto: ${error.message}`)
        // Refocus input
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus()
          }
        }, 100)
      }
    }
  }

  // Handle focus/blur
  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = (e) => {
    // Only blur if clicking outside
    // Don't blur if clicking on a button or modal
    if (!e.relatedTarget || !e.relatedTarget.closest('.scanner-input, .modal, button')) {
      setIsFocused(false)
    }
  }

  return (
    <div className="scanner-input-container">
        <label className="scanner-input__label">
          Scanner / Keyboard Input
          <span className="scanner-input__hotkey">F2 to focus</span>
        </label>
        <input
        ref={inputRef}
        type="text"
        className={`scanner-input ${isFocused ? 'scanner-input--focused' : ''}`}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Scan barcode or type code, then press Enter"
        autoComplete="off"
      />
    </div>
  )
}

export default ScannerInput