import React, { useState, useEffect, useRef } from 'react'
import { FaArrowRight, FaArrowLeft, FaCheck, FaUpload, FaFilePdf, FaFileCode, FaCamera, FaImage, FaMagic, FaTimes } from 'react-icons/fa'
import { useInventoryStore } from '../../store/inventoryStore'
import { useSettingsStore } from '../../store/settingsStore'
import { imageService } from '../../services/imageService'
import './ProductModal.css'

/**
 * Product Modal - Two modes:
 * 1. Add mode: Step-by-step form (Typeform style)
 * 2. Edit mode: Full form with all fields visible
 */
const ProductModal = ({ product, onClose, onSave }) => {
  const t = useSettingsStore(state => state.t)
  const { products } = useInventoryStore()
  const isEditMode = !!product
  
  // Edit mode state
  const [formData, setFormData] = useState({
    code: product?.code || '',
    name: product?.name || '',
    barcode: product?.barcode || '',
    description: product?.description || '',
    cost: product?.cost?.toString() || '0',
    price: product?.price?.toString() || '0',
    stock: product?.stock?.toString() || '0',
    image_url: product?.image_url || product?.image || null
  })
  
  // Image state
  const [productImage, setProductImage] = useState(product?.image_url || product?.image || null)
  const [imagePreview, setImagePreview] = useState(product?.image_url || product?.image || null)
  const [removingBackground, setRemovingBackground] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState(null)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const videoRef = useRef(null)
  
  // Original values for comparison (edit mode only)
  const [originalData, setOriginalData] = useState(isEditMode ? { ...formData } : null)
  
  // Invoice requirement state
  const [requiresInvoice, setRequiresInvoice] = useState(false)
  const [invoiceFiles, setInvoiceFiles] = useState({ pdf: null, xml: null })
  const [invoiceError, setInvoiceError] = useState('')
  
  // Add mode state (step-by-step)
  const [currentStep, setCurrentStep] = useState(0)
  const [suggestedCode, setSuggestedCode] = useState('')
  const inputRef = useRef(null)

  const steps = [
    { key: 'code', label: 'Product Code', placeholder: 'Enter product code', required: true },
    { key: 'name', label: 'Product Name', placeholder: 'Enter product name', required: true },
    { key: 'image', label: 'Product Image', placeholder: 'Upload or capture image', required: false, type: 'image' },
    { key: 'barcode', label: 'Barcode', placeholder: 'Enter barcode (optional)', required: false },
    { key: 'description', label: 'Description', placeholder: 'Enter description (optional)', required: false },
    { key: 'cost', label: 'Purchase Price', placeholder: '0.00', required: true, type: 'number' },
    { key: 'price', label: 'Sale Price', placeholder: '0.00', required: true, type: 'number' },
    { key: 'stock', label: 'Initial Stock', placeholder: '0', required: false, type: 'number' }
  ]

  // Initialize original data on mount (edit mode)
  useEffect(() => {
    if (isEditMode && product) {
      const productImageUrl = product.image_url || product.image || null
      const original = {
        code: product.code || '',
        name: product.name || '',
        barcode: product.barcode || '',
        description: product.description || '',
        cost: product.cost?.toString() || '0',
        price: product.price?.toString() || '0',
        stock: product.stock?.toString() || '0',
        image_url: productImageUrl
      }
      setOriginalData(original)
      setFormData(original)
      setProductImage(productImageUrl)
      setImagePreview(productImageUrl)
    }
  }, [isEditMode, product])

  // Generate suggested code on mount (add mode)
  useEffect(() => {
    if (!isEditMode && !formData.code) {
      generateSuggestedCode()
    }
  }, [])

  // Check if price or stock changed (edit mode)
  useEffect(() => {
    if (isEditMode && originalData) {
      const priceChanged = parseFloat(formData.price) !== parseFloat(originalData.price)
      const costChanged = parseFloat(formData.cost) !== parseFloat(originalData.cost)
      const stockChanged = parseInt(formData.stock) !== parseInt(originalData.stock)
      
      setRequiresInvoice(priceChanged || costChanged || stockChanged)
      if (!priceChanged && !costChanged && !stockChanged) {
        setInvoiceFiles({ pdf: null, xml: null })
        setInvoiceError('')
      }
    }
  }, [formData.price, formData.cost, formData.stock, originalData, isEditMode])

  // Auto-focus input on step change (add mode)
  useEffect(() => {
    if (!isEditMode && inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentStep, isEditMode])

  // Setup video stream when camera modal opens
  useEffect(() => {
    if (showCamera && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream
    }
    
    // Cleanup on unmount
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [showCamera, cameraStream])

  const generateSuggestedCode = async () => {
    try {
      const existingCodes = products
        .map(p => p.code)
        .filter(code => /^[A-Z]+(\d+)$/.test(code))
        .map(code => {
          const match = code.match(/(\d+)$/)
          return match ? parseInt(match[1]) : 0
        })
      
      const maxNumber = existingCodes.length > 0 ? Math.max(...existingCodes) : 0
      const nextNumber = maxNumber + 1
      const suggested = `PROD${String(nextNumber).padStart(4, '0')}`
      
      setSuggestedCode(suggested)
      setFormData(prev => ({ ...prev, code: suggested }))
    } catch (error) {
      console.error('Error generating code:', error)
      setSuggestedCode('PROD0001')
      setFormData(prev => ({ ...prev, code: 'PROD0001' }))
    }
  }

  const handleNext = () => {
    const currentField = steps[currentStep]
    
    // For image step, it's optional so we can always proceed
    if (currentField.required && currentField.type !== 'image' && !formData[currentField.key]) {
      return
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFileChange = (type, e) => {
    const file = e.target.files[0]
    if (file) {
      if (type === 'pdf' && file.type !== 'application/pdf') {
        setInvoiceError('El archivo PDF no es válido')
        return
      }
      if (type === 'xml' && !file.name.endsWith('.xml')) {
        setInvoiceError('El archivo XML no es válido')
        return
      }
      setInvoiceFiles(prev => ({ ...prev, [type]: file }))
      setInvoiceError('')
    }
  }

  // Image handling functions
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProductImage(reader.result)
        setImagePreview(reader.result)
        setFormData(prev => ({ ...prev, image_url: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      })
      setCameraStream(stream)
      setShowCamera(true)
      
      // Set video source when video element is ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      }, 100)
    } catch (error) {
      console.error('Error accessing camera:', error)
      // Fallback to file input if camera access fails
      if (cameraInputRef.current) {
        cameraInputRef.current.click()
      } else {
        alert('No se pudo acceder a la cámara. Por favor, usa el botón "Subir Imagen" para seleccionar una foto.')
      }
    }
  }

  const handleCapturePhoto = () => {
    if (!videoRef.current) return
    
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoRef.current, 0, 0)
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9)
    setProductImage(imageData)
    setImagePreview(imageData)
    setFormData(prev => ({ ...prev, image_url: imageData }))
    
    handleCloseCamera()
  }

  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setShowCamera(false)
  }

  const handleRemoveBackground = async () => {
    if (!productImage) return
    
    setRemovingBackground(true)
    try {
      // Convert image to blob/file for processing
      let imageBlob
      
      if (productImage.startsWith('data:')) {
        // Base64 to blob
        const response = await fetch(productImage)
        imageBlob = await response.blob()
      } else if (productImage instanceof File) {
        imageBlob = productImage
      } else {
        // URL to blob
        const response = await fetch(productImage)
        imageBlob = await response.blob()
      }
      
      // Create image element to get dimensions
      const img = new Image()
      const imgUrl = URL.createObjectURL(imageBlob)
      img.src = imgUrl
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })
      
      // Create canvas for simple background removal
      // This is a simplified approach - for better results, use @imgly/background-removal
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      
      // Draw image
      ctx.drawImage(img, 0, 0)
      
      // Simple edge detection and transparency (basic approach)
      // For production, consider using @imgly/background-removal library
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      // Simple background removal: make white/light backgrounds transparent
      // This is a basic implementation - professional libraries do better
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const brightness = (r + g + b) / 3
        
        // Make very light pixels transparent (threshold can be adjusted)
        if (brightness > 240) {
          data[i + 3] = 0 // Make transparent
        }
      }
      
      ctx.putImageData(imageData, 0, 0)
      
      // Convert to base64
      const processedImage = canvas.toDataURL('image/png')
      
      setProductImage(processedImage)
      setImagePreview(processedImage)
      setFormData(prev => ({ ...prev, image_url: processedImage }))
      
      URL.revokeObjectURL(imgUrl)
      
      alert('Fondo eliminado (versión básica). Para mejores resultados, considera usar una herramienta profesional.')
    } catch (error) {
      console.error('Error removing background:', error)
      alert('Error al quitar el fondo. Asegúrate de que la imagen sea válida.')
    } finally {
      setRemovingBackground(false)
    }
  }

  const handleRemoveImage = () => {
    setProductImage(null)
    setImagePreview(null)
    setFormData(prev => ({ ...prev, image_url: null }))
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    // Validate invoice requirement (edit mode)
    if (isEditMode && requiresInvoice && !invoiceFiles.pdf) {
      setInvoiceError('Debes subir al menos el PDF de la factura para justificar los cambios')
      return
    }

    let imageUrl = productImage || formData.image_url

    // Upload image to Supabase Storage if we have one (and it's not already a URL)
    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
      // It's a file, need to upload
      try {
        const tempProductId = product?.id || `temp-${Date.now()}`
        imageUrl = await imageService.uploadProductImage(imageUrl, tempProductId)
      } catch (error) {
        console.error('Error uploading image:', error)
        // Continue with base64 if upload fails - imageService already handles fallback
        if (typeof imageUrl === 'string' && imageUrl.startsWith('data:')) {
          // Already base64, keep it
        } else {
          // Convert to base64 as fallback
          imageUrl = null
        }
      }
    } else if (imageUrl && imageUrl.startsWith('data:')) {
      // Base64 image, try to upload to Supabase but keep base64 as fallback
      try {
        const tempProductId = product?.id || `temp-${Date.now()}`
        const uploadedUrl = await imageService.uploadProductImage(imageUrl, tempProductId)
        // Only use uploaded URL if it's not base64 (means upload succeeded)
        if (uploadedUrl && !uploadedUrl.startsWith('data:')) {
          imageUrl = uploadedUrl
        }
        // Otherwise keep base64
      } catch (error) {
        console.error('Error uploading base64 image:', error)
        // Keep base64 as fallback - imageService already returns base64 on error
      }
    }

    const submitData = {
      ...formData,
      cost: parseFloat(formData.cost) || 0,
      price: parseFloat(formData.price) || 0,
      stock: parseInt(formData.stock) || 0,
      image_url: imageUrl
    }
    
    // Remove image field if it exists (use image_url instead)
    delete submitData.image

    // Include invoice files if required
    if (isEditMode && requiresInvoice && invoiceFiles.pdf) {
      submitData.invoicePdf = invoiceFiles.pdf
      submitData.invoiceXml = invoiceFiles.xml
    }

    onSave(submitData)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isEditMode) {
      e.preventDefault()
      handleNext()
    }
  }

  // EDIT MODE: Full form
  if (isEditMode) {
    const hasChanges = originalData && (
      formData.code !== originalData.code ||
      formData.name !== originalData.name ||
      formData.barcode !== originalData.barcode ||
      formData.description !== originalData.description ||
      formData.cost !== originalData.cost ||
      formData.price !== originalData.price ||
      formData.stock !== originalData.stock ||
      formData.image_url !== originalData.image_url
    )

    const profitMargin = formData.cost && formData.price
      ? ((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.price) * 100).toFixed(1)
      : '0'

    return (
      <>
        {/* Camera Modal */}
        {showCamera && (
          <div className="camera-modal-overlay" onClick={handleCloseCamera}>
            <div className="camera-modal" onClick={(e) => e.stopPropagation()}>
              <div className="camera-modal__header">
                <h3>Capturar Foto</h3>
                <button className="camera-modal__close" onClick={handleCloseCamera}>×</button>
              </div>
              <div className="camera-modal__preview">
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline
                  style={{ width: '100%', maxWidth: '100%', height: 'auto', maxHeight: '60vh', objectFit: 'contain', borderRadius: 'var(--radius-md)' }}
                />
              </div>
              <div className="camera-modal__actions">
                <button className="camera-modal__btn camera-modal__btn--cancel" onClick={handleCloseCamera}>
                  Cancelar
                </button>
                <button className="camera-modal__btn camera-modal__btn--capture" onClick={handleCapturePhoto}>
                  📷 Capturar
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="product-modal-overlay" onClick={onClose}>
          <div className="product-modal product-modal--edit" onClick={(e) => e.stopPropagation()}>
          <div className="product-modal__header">
            <h2 className="product-modal__title">{t('inventory.editProduct')}</h2>
            <button className="product-modal__close" onClick={onClose}>×</button>
          </div>

          <div className="product-modal__content product-modal__content--edit">
            {/* Image Section */}
            <div className="product-modal__image-section">
              <label className="product-modal__form-label">IMAGEN DEL PRODUCTO</label>
              <div className="product-modal__image-container">
                {imagePreview ? (
                  <div className="product-modal__image-preview">
                    <img src={imagePreview} alt="Product preview" className="product-modal__preview-img" />
                    <button
                      type="button"
                      className="product-modal__image-remove"
                      onClick={handleRemoveImage}
                      title="Eliminar imagen"
                    >
                      <FaTimes />
                    </button>
                  </div>
                ) : (
                  <div className="product-modal__image-placeholder">
                    <FaImage />
                    <span>Sin imagen</span>
                  </div>
                )}
                <div className="product-modal__image-actions">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="product-modal__image-input"
                    id="product-image-upload"
                  />
                  <label htmlFor="product-image-upload" className="product-modal__image-btn">
                    <FaUpload /> Subir Imagen
                  </label>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      // Fallback: if getUserMedia fails, use file input
                      const file = e.target.files[0]
                      if (file && file.type.startsWith('image/')) {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          setProductImage(reader.result)
                          setImagePreview(reader.result)
                          setFormData(prev => ({ ...prev, image_url: reader.result }))
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                    className="product-modal__image-input"
                    id="product-image-camera"
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="product-modal__image-btn"
                    onClick={handleCameraCapture}
                  >
                    <FaCamera /> Capturar
                  </button>
                  {productImage && (
                    <button
                      type="button"
                      className="product-modal__image-btn product-modal__image-btn--magic"
                      onClick={handleRemoveBackground}
                      disabled={removingBackground}
                    >
                      <FaMagic /> {removingBackground ? 'Procesando...' : 'Quitar Fondo'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="product-modal__form-grid">
              <div className="product-modal__form-group">
                <label className="product-modal__form-label">
                  {t('inventory.code')} <span className="product-modal__required">*</span>
                </label>
                <input
                  type="text"
                  className="product-modal__form-input"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>

              <div className="product-modal__form-group">
                <label className="product-modal__form-label">
                  {t('inventory.name')} <span className="product-modal__required">*</span>
                </label>
                <input
                  type="text"
                  className="product-modal__form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="product-modal__form-group">
                <label className="product-modal__form-label">{t('inventory.barcode')}</label>
                <input
                  type="text"
                  className="product-modal__form-input"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>

              <div className="product-modal__form-group product-modal__form-group--full">
                <label className="product-modal__form-label">{t('inventory.description')}</label>
                <textarea
                  className="product-modal__form-textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                />
              </div>

              <div className="product-modal__form-group">
                <label className="product-modal__form-label">
                  {t('inventory.purchasePrice')} <span className="product-modal__required">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="product-modal__form-input"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  required
                />
              </div>

              <div className="product-modal__form-group">
                <label className="product-modal__form-label">
                  {t('inventory.price')} <span className="product-modal__required">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="product-modal__form-input"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
                {formData.cost && formData.price && (
                  <div className="product-modal__helper">
                    Margen de ganancia: {profitMargin}%
                  </div>
                )}
              </div>

              <div className="product-modal__form-group">
                <label className="product-modal__form-label">
                  {t('inventory.stock')}
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="product-modal__form-input"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                />
              </div>
            </div>

            {/* Invoice requirement section */}
            {requiresInvoice && (
              <div className="product-modal__invoice-section">
                <div className="product-modal__invoice-warning">
                  ⚠️ Has modificado precios o stock. Debes subir una factura para justificar los cambios.
                </div>
                <div className="product-modal__invoice-files">
                  <div className="product-modal__invoice-group">
                    <label className="product-modal__invoice-label">
                      <FaFilePdf /> Factura PDF <span className="product-modal__required">*</span>
                    </label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileChange('pdf', e)}
                      className="product-modal__invoice-input"
                    />
                    {invoiceFiles.pdf && (
                      <span className="product-modal__invoice-name">{invoiceFiles.pdf.name}</span>
                    )}
                  </div>
                  <div className="product-modal__invoice-group">
                    <label className="product-modal__invoice-label">
                      <FaFileCode /> Factura XML (Opcional)
                    </label>
                    <input
                      type="file"
                      accept=".xml"
                      onChange={(e) => handleFileChange('xml', e)}
                      className="product-modal__invoice-input"
                    />
                    {invoiceFiles.xml && (
                      <span className="product-modal__invoice-name">{invoiceFiles.xml.name}</span>
                    )}
                  </div>
                </div>
                {invoiceError && (
                  <div className="product-modal__invoice-error">{invoiceError}</div>
                )}
              </div>
            )}
          </div>

          <div className="product-modal__footer">
            <button
              type="button"
              className="product-modal__btn product-modal__btn--secondary"
              onClick={onClose}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="product-modal__btn product-modal__btn--primary"
              onClick={handleSubmit}
              disabled={!hasChanges}
            >
              <FaCheck />
              {t('inventory.saveChanges')}
            </button>
          </div>
        </div>
      </div>
      </>
    )
  }

  // ADD MODE: Step-by-step form
  const currentField = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100
  // Image step is optional, so we can always proceed
  const canGoNext = currentField.type === 'image' || !currentField.required || formData[currentField.key]

  return (
    <>
      {/* Camera Modal */}
      {showCamera && (
        <div className="camera-modal-overlay" onClick={handleCloseCamera}>
          <div className="camera-modal" onClick={(e) => e.stopPropagation()}>
            <div className="camera-modal__header">
              <h3>Capturar Foto</h3>
              <button className="camera-modal__close" onClick={handleCloseCamera}>×</button>
            </div>
            <div className="camera-modal__preview">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline
                style={{ width: '100%', maxWidth: '100%', height: 'auto', maxHeight: '60vh', objectFit: 'contain', borderRadius: 'var(--radius-md)' }}
              />
            </div>
            <div className="camera-modal__actions">
              <button className="camera-modal__btn camera-modal__btn--cancel" onClick={handleCloseCamera}>
                Cancelar
              </button>
              <button className="camera-modal__btn camera-modal__btn--capture" onClick={handleCapturePhoto}>
                📷 Capturar
              </button>
            </div>
          </div>
        </div>
      )}
    <div className="product-modal-overlay" onClick={onClose}>
      <div className="product-modal" onClick={(e) => e.stopPropagation()}>
        {/* Progress Bar */}
        <div className="product-modal__progress">
          <div 
            className="product-modal__progress-bar" 
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="product-modal__header">
          <button className="product-modal__close" onClick={onClose}>×</button>
          <div className="product-modal__step-indicator">
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>

        {/* Content */}
        <div className="product-modal__content">
          <h2 className="product-modal__question">
            {currentField.label}
            {currentField.required && <span className="product-modal__required">*</span>}
          </h2>
          
          {currentField.key === 'code' && suggestedCode && (
            <div className="product-modal__suggestion">
              <span className="product-modal__suggestion-text">Suggested code:</span>
              <button
                type="button"
                className="product-modal__suggestion-btn"
                onClick={() => {
                  setFormData(prev => ({ ...prev, code: suggestedCode }))
                  inputRef.current?.focus()
                }}
              >
                {suggestedCode}
              </button>
            </div>
          )}

          {/* Image Step */}
          {currentField.type === 'image' ? (
            <div className="product-modal__image-step">
              {imagePreview ? (
                <div className="product-modal__image-preview-step">
                  <img src={imagePreview} alt="Product preview" className="product-modal__preview-img-step" />
                  <button
                    type="button"
                    className="product-modal__image-remove-step"
                    onClick={handleRemoveImage}
                    title="Eliminar imagen"
                  >
                    <FaTimes />
                  </button>
                </div>
              ) : (
                <div className="product-modal__image-placeholder-step">
                  <FaImage />
                  <span>Sin imagen</span>
                </div>
              )}
              <div className="product-modal__image-actions-step">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="product-modal__image-input"
                  id="product-image-upload-step"
                />
                <label htmlFor="product-image-upload-step" className="product-modal__image-btn-step">
                  <FaUpload /> Subir Imagen
                </label>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    // Fallback: if getUserMedia fails, use file input
                    const file = e.target.files[0]
                    if (file && file.type.startsWith('image/')) {
                      const reader = new FileReader()
                      reader.onloadend = () => {
                        setProductImage(reader.result)
                        setImagePreview(reader.result)
                        setFormData(prev => ({ ...prev, image_url: reader.result }))
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                  className="product-modal__image-input"
                  id="product-image-camera-step"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="product-modal__image-btn-step"
                  onClick={handleCameraCapture}
                >
                  <FaCamera /> Capturar
                </button>
                {productImage && (
                  <button
                    type="button"
                    className="product-modal__image-btn-step product-modal__image-btn-step--magic"
                    onClick={handleRemoveBackground}
                    disabled={removingBackground}
                  >
                    <FaMagic /> {removingBackground ? 'Procesando...' : 'Quitar Fondo'}
                  </button>
                )}
              </div>
              <p className="product-modal__image-hint">La imagen se guardará en Supabase Storage</p>
            </div>
          ) : (
            <div className="product-modal__input-wrapper">
              {currentField.type === 'number' ? (
                <input
                  ref={inputRef}
                  type="number"
                  step={currentField.key === 'stock' ? '1' : '0.01'}
                  min="0"
                  className="product-modal__input"
                  value={formData[currentField.key]}
                  onChange={(e) => setFormData({ ...formData, [currentField.key]: e.target.value })}
                  onKeyPress={handleKeyPress}
                  placeholder={currentField.placeholder}
                  required={currentField.required}
                />
              ) : (
                <input
                  ref={inputRef}
                  type="text"
                  className="product-modal__input"
                  value={formData[currentField.key]}
                  onChange={(e) => setFormData({ ...formData, [currentField.key]: e.target.value })}
                  onKeyPress={handleKeyPress}
                  placeholder={currentField.placeholder}
                  required={currentField.required}
                />
              )}
            </div>
          )}

          {/* Helper text for prices */}
          {currentField.key === 'cost' && formData.cost && formData.price && (
            <div className="product-modal__helper">
              Profit margin: {((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.price) * 100).toFixed(1)}%
            </div>
          )}

          {currentField.key === 'price' && formData.cost && formData.price && (
            <div className="product-modal__helper">
              Profit: ${(parseFloat(formData.price) - parseFloat(formData.cost)).toFixed(2)} per unit
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="product-modal__footer">
          {currentStep > 0 && (
            <button
              type="button"
              className="product-modal__btn product-modal__btn--back"
              onClick={handleBack}
            >
              <FaArrowLeft />
              Back
            </button>
          )}
          
          <div className="product-modal__footer-spacer" />
          
          <button
            type="button"
            className="product-modal__btn product-modal__btn--next"
            onClick={handleNext}
            disabled={!canGoNext}
          >
            {currentStep === steps.length - 1 ? (
              <>
                <FaCheck />
                Create
              </>
            ) : (
              <>
                Next
                <FaArrowRight />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </>
  )
}

export default ProductModal
