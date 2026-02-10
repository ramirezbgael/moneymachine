import React from 'react'
import { FaTimes } from 'react-icons/fa'
import './ImagePreviewModal.css'

/**
 * Image Preview Modal
 * Shows a large preview of product image
 */
const ImagePreviewModal = ({ imageUrl, onClose }) => {
  return (
    <div className="image-preview-overlay" onClick={onClose}>
      <div className="image-preview-modal" onClick={(e) => e.stopPropagation()}>
        <button className="image-preview__close" onClick={onClose}>
          <FaTimes />
        </button>
        <div className="image-preview__container">
          <img src={imageUrl} alt="Product preview" className="image-preview__image" />
        </div>
      </div>
    </div>
  )
}

export default ImagePreviewModal
