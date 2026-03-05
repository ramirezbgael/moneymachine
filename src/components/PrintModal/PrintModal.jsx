import React, { useState, useEffect } from 'react'
import { printTicket, isTauri, getTicketText } from '../../services/printerService'
import { useSettingsStore } from '../../store/settingsStore'
import '../Modal/Modal.css'
import './PrintModal.css'

/**
 * Print confirmation modal
 * - Ask if user wants to print ticket
 * - In Tauri: sends plain text to thermal printer
 * - In browser: no direct print (avoids PostScript garbage); show ticket text + Copy
 */
const PrintModal = ({ sale, onConfirm, onCancel }) => {
  const printerName = useSettingsStore((s) => s.printerName) || ''
  const printerWidth = useSettingsStore((s) => s.printerWidth) || '80mm'
  const [shouldPrint, setShouldPrint] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [copied, setCopied] = useState(false)
  const inTauri = isTauri()
  const ticketText = sale ? getTicketText(sale) : ''

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        setShouldPrint(prev => !prev)
      } else if (e.key === 'Enter' && !isPrinting) {
        handleConfirm()
      } else if (e.key === 'Escape') {
        handleConfirm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shouldPrint, isPrinting])

  const handleCopyTicket = async () => {
    if (!ticketText) return
    try {
      await navigator.clipboard.writeText(ticketText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_) {
      alert('No se pudo copiar. Selecciona el texto del ticket y cópialo manualmente.')
    }
  }

  const handleConfirm = async () => {
    if (shouldPrint && sale) {
      if (inTauri) {
        setIsPrinting(true)
        try {
          await printTicket(sale, { printerName, printerWidth })
          await new Promise((resolve) => setTimeout(resolve, 500))
        } catch (error) {
          console.error('Error printing ticket:', error)
          alert(error?.message || 'Error al imprimir. Revisa que la impresora esté encendida y configurada en Configuración.')
        } finally {
          setIsPrinting(false)
        }
      }
    }
    onConfirm(shouldPrint)
  }

  return (
    <div className="modal-overlay" onClick={handleConfirm}>
      <div
        className="modal print-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title">Venta completada</h2>
        </div>

        <div className="modal__content">
          <div className="print-modal__message">
            <p>¡Venta registrada correctamente!</p>
            <p className="print-modal__total">
              Total: <span>${sale?.total.toFixed(2)}</span>
            </p>
            <p className="print-modal__question">
              ¿Imprimir ticket?
            </p>
            {!inTauri && (
              <p className="print-modal__browser-hint">
                En el navegador no se envía a impresora térmica (evita que salga código raro). Usa la app de escritorio para imprimir directo, o copia el ticket abajo.
              </p>
            )}
            <p className="print-modal__hint">← → para cambiar, Enter para continuar</p>
          </div>

          <div className="print-modal__options">
            <button
              className={`print-modal__option ${!shouldPrint ? 'print-modal__option--active' : ''}`}
              onClick={() => setShouldPrint(false)}
              autoFocus
            >
              No
            </button>
            <button
              className={`print-modal__option ${shouldPrint ? 'print-modal__option--active' : ''}`}
              onClick={() => setShouldPrint(true)}
            >
              Sí, imprimir
            </button>
          </div>

          {shouldPrint && !inTauri && ticketText && (
            <div className="print-modal__ticket-copy">
              <pre className="print-modal__ticket-pre">{ticketText}</pre>
              <button
                type="button"
                className="print-modal__copy-btn"
                onClick={handleCopyTicket}
              >
                {copied ? '✓ Copiado' : 'Copiar ticket'}
              </button>
            </div>
          )}
        </div>

        <div className="modal__footer">
          <button
            className="modal__btn modal__btn--primary"
            onClick={handleConfirm}
            disabled={isPrinting}
          >
            {isPrinting ? 'Imprimiendo…' : (
              <>
                Continuar
                <span className="print-modal__hotkey">[Enter]</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PrintModal