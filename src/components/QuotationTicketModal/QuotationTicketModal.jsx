import React, { useState, useEffect } from 'react'
import { FaTimes, FaQrcode } from 'react-icons/fa'
import { useSettingsStore } from '../../store/settingsStore'
import './QuotationTicketModal.css'

/**
 * Quotation Ticket Modal
 * Shows complete quotation ticket with products, prices, tax, total, and QR code
 */
const QuotationTicketModal = ({ quotationCode, items = [], totals = {}, onClose }) => {
  const t = useSettingsStore(state => state.t)
  const currency = useSettingsStore(state => state.currency)
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  useEffect(() => {
    // Generate QR code using a simple QR code API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(quotationCode)}`
    setQrCodeUrl(qrUrl)
  }, [quotationCode])

  const handlePrint = () => {
    window.print()
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount)
  }

  const {
    subtotal = 0,
    discountAmount = 0,
    subtotalAfterDiscount = 0,
    taxRate = 0,
    taxAmount = 0,
    total = 0
  } = totals

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal quotation-ticket-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">{t('quotation.ticketTitle') || 'Cotización'}</h2>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>

        <div className="modal__content">
          {/* Ticket Content */}
          <div className="quotation-ticket">
            {/* Header */}
            <div className="quotation-ticket__header">
              <div className="quotation-ticket__business-name">
                {t('quotation.businessName') || 'Mi Negocio'}
              </div>
              <div className="quotation-ticket__type">
                {t('quotation.ticketTitle') || 'COTIZACIÓN'}
              </div>
              <div className="quotation-ticket__code">
                {t('currentSale.quotationCode')}: {quotationCode}
              </div>
              <div className="quotation-ticket__date">
                {new Date().toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="quotation-ticket__divider"></div>

            {/* Products List */}
            <div className="quotation-ticket__products">
              <div className="quotation-ticket__products-header">
                <div className="quotation-ticket__col-product">{t('quotation.product') || 'Producto'}</div>
                <div className="quotation-ticket__col-qty">{t('quotation.qty') || 'Cant'}</div>
                <div className="quotation-ticket__col-price">{t('quotation.price') || 'Precio'}</div>
                <div className="quotation-ticket__col-subtotal">{t('quotation.subtotal') || 'Subtotal'}</div>
              </div>

              {items.map((item, index) => (
                <div key={item.id || index} className="quotation-ticket__product-row">
                  <div className="quotation-ticket__col-product">
                    <div className="quotation-ticket__product-name">{item.product.name}</div>
                    <div className="quotation-ticket__product-code">{item.product.code}</div>
                  </div>
                  <div className="quotation-ticket__col-qty">{item.quantity}</div>
                  <div className="quotation-ticket__col-price">{formatCurrency(item.unitPrice)}</div>
                  <div className="quotation-ticket__col-subtotal">{formatCurrency(item.subtotal)}</div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="quotation-ticket__divider"></div>

            {/* Totals */}
            <div className="quotation-ticket__totals">
              <div className="quotation-ticket__total-line">
                <span>{t('quotation.subtotal') || 'Subtotal'}:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              
              {discountAmount > 0 && (
                <div className="quotation-ticket__total-line quotation-ticket__total-line--discount">
                  <span>{t('quotation.discount') || 'Descuento'}:</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              {taxRate > 0 && (
                <>
                  <div className="quotation-ticket__total-line">
                    <span>{t('quotation.subtotalAfterDiscount') || 'Subtotal después de descuento'}:</span>
                    <span>{formatCurrency(subtotalAfterDiscount)}</span>
                  </div>
                  <div className="quotation-ticket__total-line">
                    <span>{t('quotation.tax') || 'Impuesto'} ({taxRate}%):</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                </>
              )}

              <div className="quotation-ticket__divider"></div>

              <div className="quotation-ticket__total-line quotation-ticket__total-line--final">
                <span>{t('quotation.total') || 'TOTAL'}:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="quotation-ticket__qr-section">
              <div className="quotation-ticket__qr-label">
                <FaQrcode /> {t('currentSale.scanToLoad')}
              </div>
              {qrCodeUrl && (
                <div className="quotation-ticket__qr-container">
                  <img 
                    src={qrCodeUrl} 
                    alt={`QR Code: ${quotationCode}`}
                    className="quotation-ticket__qr-image"
                  />
                </div>
              )}
              <div className="quotation-ticket__qr-hint">
                {t('quotation.scanHint') || 'Escanee este código para cargar la venta rápidamente'}
              </div>
            </div>

            {/* Footer */}
            <div className="quotation-ticket__footer">
              <div className="quotation-ticket__footer-text">
                {t('quotation.footerText') || 'Esta cotización es válida por 30 días'}
              </div>
            </div>
          </div>
        </div>

        <div className="modal__footer">
          <button
            className="modal__btn modal__btn--secondary"
            onClick={onClose}
          >
            {t('common.close')}
          </button>
          <button
            className="modal__btn modal__btn--primary"
            onClick={handlePrint}
          >
            🖨️ {t('print.yes') || 'Imprimir'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuotationTicketModal
