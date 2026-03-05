import React, { useState, useRef } from 'react'
import { FaTimes, FaFileUpload, FaExclamationTriangle } from 'react-icons/fa'
import { useSettingsStore } from '../../store/settingsStore'
import { importProducts } from '../../services/importService'
import InvoiceReviewModal from './InvoiceReviewModal'
import './ImportModal.css'

/**
 * Modal para importar productos desde XML (CFDI), CSV o PDF.
 * Al parsear, abre InvoiceReviewModal para revisar y confirmar partidas.
 */
export default function ImportModal({ onClose, onImportComplete }) {
  const t = useSettingsStore((s) => s.t)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [invoiceData, setInvoiceData] = useState(null)
  const inputRef = useRef(null)

  const accept = '.xml,.csv,.pdf'

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setError(null)
    setInvoiceData(null)
    const ext = (selected.name || '').toLowerCase().split('.').pop()
    if (!['xml', 'csv', 'pdf'].includes(ext)) {
      setError('Formato no soportado. Use XML, CSV o PDF.')
      return
    }
    setLoading(true)
    try {
      const result = await importProducts(selected)
      if (result._parsingError) {
        setError(result._parsingError)
        setInvoiceData(null)
      } else {
        setError(null)
        setInvoiceData({
          items: result.items,
          supplier: result.supplier || '',
          folio: result.folio || '',
        })
      }
    } catch (err) {
      setError(err?.message || 'Error al procesar')
      setInvoiceData(null)
    } finally {
      setLoading(false)
    }
    e.target.value = ''
  }

  const handleRemoveFile = () => {
    setFile(null)
    setError(null)
    setInvoiceData(null)
  }

  const handleReviewComplete = () => {
    onImportComplete?.()
    onClose?.()
  }

  // Si ya hay partidas detectadas, mostrar directamente el modal de revisión
  if (invoiceData?.items?.length > 0) {
    return (
      <InvoiceReviewModal
        invoiceData={invoiceData}
        onClose={() => { setInvoiceData(null); setFile(null); setError(null); onClose?.(); }}
        onComplete={handleReviewComplete}
      />
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">{t('inventory.import') || 'Importar (XML / CSV / PDF)'}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            <FaTimes />
          </button>
        </div>
        <div className="modal__content">
          <div className="import-modal__info">
            <p>Importa productos desde archivos XML (CFDI), CSV o PDF.</p>
            <p className="import-modal__hint">Formatos: CSV, XML (factura CFDI México)</p>
          </div>

          <div className="import-modal__file-section">
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              className="import-modal__file-input"
              onChange={handleFileChange}
              disabled={loading}
            />
            <label
              htmlFor="file"
              className="import-modal__file-label"
              onClick={(e) => { e.preventDefault(); inputRef.current?.click(); }}
            >
              <FaFileUpload />
              {loading ? 'Procesando…' : 'Seleccionar archivo'}
            </label>
          </div>

          {file && (
            <div className="import-modal__preview">
              <span className="import-modal__preview-icon"><FaFileUpload /></span>
              <div className="import-modal__preview-info">
                <div className="import-modal__preview-name">{file.name}</div>
                <div className="import-modal__preview-size">
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <button
                type="button"
                className="import-modal__preview-remove"
                onClick={handleRemoveFile}
                aria-label="Quitar archivo"
              >
                ×
              </button>
            </div>
          )}

          {error && (
            <div className="import-modal__error">
              <FaExclamationTriangle />
              <span>{error}</span>
            </div>
          )}
        </div>
        <div className="modal__footer">
          <button type="button" className="modal__btn modal__btn--secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
