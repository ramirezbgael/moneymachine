import React, { useState, useEffect } from 'react'
import { useSaleStore } from '../../store/saleStore'
import { processSale } from '../../services/saleService'
import { playSaleComplete } from '../../services/soundService'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import '../Modal/Modal.css'
import './PaymentModal.css'

/**
 * Simplified Payment Modal - MVP
 * - Only payment method selection (Cash, Card, Transfer)
 * - Quick confirmation
 * - Keyboard navigation
 */
const PaymentModalMVP = ({ onComplete, onCancel }) => {
  const t = useSettingsStore(state => state.t)
  const items = useSaleStore(state => state.items)
  const getTotals = useSaleStore(state => state.getTotals)
  const clearSale = useSaleStore(state => state.clearSale)
  const user = useAuthStore(state => state.user)

  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')

  const { subtotal, discountAmount, total, itemCount } = getTotals()
  const paymentMethods = [
    { id: 'cash', label: t('payment.cash') },
    { id: 'card', label: t('payment.card') },
    { id: 'transfer', label: t('payment.transfer') }
  ]

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      const currentIndex = paymentMethods.findIndex(m => m.id === paymentMethod)
      
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        const direction = e.key === 'ArrowRight' ? 1 : -1
        const newIndex = (currentIndex + direction + paymentMethods.length) % paymentMethods.length
        setPaymentMethod(paymentMethods[newIndex].id)
      } else if (e.key === 'Enter' && !isProcessing) {
        e.preventDefault()
        handleProcessPayment()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [paymentMethod, isProcessing, onCancel])

  // Process payment
  const handleProcessPayment = async () => {
    if (isProcessing) return
    if (items.length === 0) {
      setError('No items in cart')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      const saleData = {
        items,
        subtotal,
        discount: discountAmount,
        total,
        paymentMethod,
        receiptType: 'ticket', // MVP: only tickets
        customer: null, // MVP: no customer management
        userId: user?.id || null,
        cashier: user?.email || 'system'
      }

      const processedSale = await processSale(saleData)

      // Sonido cachín al finalizar la venta
      playSaleComplete()

      // Clear current sale
      clearSale()

      // Call onComplete callback
      onComplete(processedSale)
    } catch (error) {
      console.error('Error processing payment:', error)
      setError(error.message || 'Error processing payment. Please try again.')
      setIsProcessing(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal payment-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title">{t('payment.title')}</h2>
          <button className="modal__close" onClick={onCancel}>×</button>
        </div>

        <div className="modal__content">
          {/* Total Display */}
          <div className="payment-modal__total">
            <div className="payment-modal__total-label">{t('payment.totalToPay')}</div>
            <div className="payment-modal__total-amount">${total.toFixed(2)}</div>
            <div className="payment-modal__items-count">{itemCount} {t('currentSale.items')}</div>
            
            {discountAmount > 0 && (
              <div className="payment-modal__discount-info">
                Descuento aplicado: ${discountAmount.toFixed(2)}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="payment-modal__section">
            <label className="payment-modal__label">
              {t('payment.paymentMethod')}
              <span className="payment-modal__hint">{t('payment.arrowsHint')}</span>
            </label>
            <div className="payment-modal__options">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  className={`payment-modal__option ${paymentMethod === method.id ? 'payment-modal__option--active' : ''}`}
                  onClick={() => setPaymentMethod(method.id)}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="payment-modal__error">
              {error}
            </div>
          )}
        </div>

        <div className="modal__footer">
          <button
            className="modal__btn modal__btn--secondary"
            onClick={onCancel}
            disabled={isProcessing}
          >
            {t('payment.cancel')} (Esc)
          </button>
          <button
            className="modal__btn modal__btn--primary"
            onClick={handleProcessPayment}
            disabled={isProcessing || items.length === 0}
          >
            {isProcessing ? t('payment.processing') : (
              <>
                {t('payment.confirm')}
                <span className="payment-modal__hotkey">[Enter]</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PaymentModalMVP
