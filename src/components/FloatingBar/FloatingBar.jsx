import React, { useState, useEffect } from 'react'
import { useSaleStore } from '../../store/saleStore'
import { useSettingsStore } from '../../store/settingsStore'
import { playRegisterOpen } from '../../services/soundService'
import './FloatingBar.css'

/**
 * Floating bottom bar with totals and discount
 * Fixed at bottom, always visible
 * F2 hotkey for checkout
 */
const FloatingBar = ({ onCheckout }) => {
  const t = useSettingsStore(state => state.t)
  const getTotals = useSaleStore(state => state.getTotals)
  const setDiscount = useSaleStore(state => state.setDiscount)
  const discount = useSaleStore(state => state.discount)
  
  const [showDiscountInput, setShowDiscountInput] = useState(false)
  const [discountValue, setDiscountValue] = useState('')
  
  const { itemCount, subtotal, discountAmount, total } = getTotals()
  const hasItems = itemCount > 0

  // Handle F2 hotkey globally
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2' && total > 0) {
        e.preventDefault()
        playRegisterOpen()
        onCheckout()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [total, onCheckout])

  const handleApplyDiscount = () => {
    const value = parseFloat(discountValue)
    if (!isNaN(value) && value >= 0 && value <= 100) {
      setDiscount(value, 'percentage')
      setShowDiscountInput(false)
      setDiscountValue('')
    }
  }

  const handleClearDiscount = () => {
    setDiscount(0, 'percentage')
    setDiscountValue('')
    setShowDiscountInput(false)
  }

  return (
    <div className="floating-bar">
      <div className="floating-bar__content">
        <div className="floating-bar__left">
          <div className="floating-bar__items">
            <span className="floating-bar__label">{t('currentSale.items')}:</span>
            <span className="floating-bar__value">{itemCount}</span>
          </div>

          {hasItems && (
            <div className="floating-bar__discount-control">
              {!showDiscountInput ? (
                <button
                  className="floating-bar__discount-btn"
                  onClick={() => setShowDiscountInput(true)}
                >
                  {discount > 0 ? `${t('payment.totalLabel')}: ${discount}%` : '+ Discount'}
                </button>
              ) : (
                <div className="floating-bar__discount-input-group">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    className="floating-bar__discount-input"
                    placeholder="% descuento"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleApplyDiscount()
                      if (e.key === 'Escape') {
                        setShowDiscountInput(false)
                        setDiscountValue('')
                      }
                    }}
                    autoFocus
                  />
                  <button
                    className="floating-bar__discount-apply"
                    onClick={handleApplyDiscount}
                  >
                    ✓
                  </button>
                  <button
                    className="floating-bar__discount-cancel"
                    onClick={handleClearDiscount}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="floating-bar__totals">
          {discount > 0 && (
            <>
              <div className="floating-bar__subtotal-line">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              
              <div className="floating-bar__discount-line">
                <span>Descuento ({discount}%):</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            </>
          )}
          
          <div className="floating-bar__total">
            <span className="floating-bar__total-label">{t('currentSale.total')}</span>
            <span className="floating-bar__total-amount">${total.toFixed(2)}</span>
          </div>
        </div>

        <button
          className="floating-bar__checkout-btn"
          disabled={!hasItems}
          onClick={() => {
            playRegisterOpen()
            onCheckout()
          }}
        >
          {t('currentSale.checkout')}
          <span className="floating-bar__hotkey">[F2]</span>
        </button>
      </div>
    </div>
  )
}

export default FloatingBar
