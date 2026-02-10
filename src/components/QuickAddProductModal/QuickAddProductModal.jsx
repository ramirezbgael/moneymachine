import React, { useState, useEffect, useRef } from 'react'
import { productService } from '../../services/productService'
import { playScanBeep } from '../../services/soundService'
import { useSaleStore } from '../../store/saleStore'
import '../Modal/Modal.css'
import './QuickAddProductModal.css'

/**
 * Quick add product modal
 * - Shows when scanned barcode doesn't exist
 * - Quick form to create product
 * - Auto-fills barcode from scanner
 */
const QuickAddProductModal = ({ initialBarcode, onSave, onCancel }) => {
  const [productData, setProductData] = useState({
    barcode: initialBarcode || '',
    code: initialBarcode || '',
    name: '',
    description: '',
    price: '0',
    stock: '0'
  })
  const [isCreating, setIsCreating] = useState(false)
  const nameInputRef = useRef(null)
  const addItem = useSaleStore(state => state.addItem)

  // Auto-focus name input on mount
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [])

  // Handle Enter key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !isCreating) {
        // Only process if required fields are filled
        if (productData.name && productData.price) {
          handleCreateProduct()
        }
      } else if (e.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [productData, isCreating, onCancel])

  // Handle input change
  const handleChange = (field, value) => {
    setProductData(prev => ({
      ...prev,
      [field]: value,
      // Auto-sync code with barcode if code is empty
      ...(field === 'barcode' && !prev.code ? { code: value } : {})
    }))
  }

  // Create product and add to sale
  const handleCreateProduct = async () => {
    if (isCreating) return

    // Validate required fields
    if (!productData.name || !productData.price) {
      alert('Name and price are required')
      return
    }

    setIsCreating(true)

    try {
      // Create product
      const newProduct = await productService.create({
        barcode: productData.barcode || productData.code,
        code: productData.code || productData.barcode,
        name: productData.name,
        description: productData.description,
        price: parseFloat(productData.price) || 0,
        stock: parseInt(productData.stock) || 0
      })

      // Add to current sale
      addItem(newProduct, 1)
      playScanBeep()

      // Call onSave callback
      onSave(newProduct)

      // Refocus scanner input
      setTimeout(() => {
        const scannerInput = document.querySelector('.scanner-input')
        if (scannerInput) {
          scannerInput.focus()
        }
      }, 100)
    } catch (error) {
      console.error('Error creating product:', error)
      alert('Error creating product. Please try again.')
      setIsCreating(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal quick-add-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title">Product Not Found</h2>
          <button className="modal__close" onClick={onCancel}>×</button>
        </div>

        <div className="modal__content">
          <div className="quick-add-modal__message">
            <p>Barcode <strong>{initialBarcode}</strong> not found.</p>
            <p>Create a new product quickly:</p>
          </div>

          <div className="quick-add-modal__form">
            <div className="quick-add-modal__field">
              <label className="quick-add-modal__field-label">Barcode *</label>
              <input
                type="text"
                className="quick-add-modal__input"
                value={productData.barcode}
                onChange={(e) => handleChange('barcode', e.target.value)}
                placeholder="Barcode"
              />
            </div>

            <div className="quick-add-modal__field">
              <label className="quick-add-modal__field-label">Code</label>
              <input
                type="text"
                className="quick-add-modal__input"
                value={productData.code}
                onChange={(e) => handleChange('code', e.target.value)}
                placeholder="Internal code"
              />
            </div>

            <div className="quick-add-modal__field">
              <label className="quick-add-modal__field-label">Name *</label>
              <input
                ref={nameInputRef}
                type="text"
                className="quick-add-modal__input"
                value={productData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Product name"
              />
            </div>

            <div className="quick-add-modal__field">
              <label className="quick-add-modal__field-label">Description</label>
              <input
                type="text"
                className="quick-add-modal__input"
                value={productData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Product description"
              />
            </div>

            <div className="quick-add-modal__field-row">
              <div className="quick-add-modal__field">
                <label className="quick-add-modal__field-label">Price *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="quick-add-modal__input"
                  value={productData.price}
                  onChange={(e) => handleChange('price', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="quick-add-modal__field">
                <label className="quick-add-modal__field-label">Stock</label>
                <input
                  type="number"
                  min="0"
                  className="quick-add-modal__input"
                  value={productData.stock}
                  onChange={(e) => handleChange('stock', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="modal__footer">
          <button
            className="modal__btn modal__btn--secondary"
            onClick={onCancel}
            disabled={isCreating}
          >
            Cancel (Esc)
          </button>
          <button
            className="modal__btn modal__btn--primary"
            onClick={handleCreateProduct}
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Create & Add (Enter)'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuickAddProductModal