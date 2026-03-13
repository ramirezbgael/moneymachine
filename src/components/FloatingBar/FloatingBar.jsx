import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaCashRegister, FaScissors } from 'react-icons/fa6'
import { useSaleStore } from '../../store/saleStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useReportsStore } from '../../store/reportsStore'
import { playRegisterOpen } from '../../services/soundService'
import './FloatingBar.css'

/**
 * Floating bottom bar with totals and discount
 * Fixed at bottom, always visible
 * F2 hotkey for checkout
 */
const FloatingBar = ({ onCheckout, onSavePending, savingPending = false }) => {
  const navigate = useNavigate()
  const t = useSettingsStore(state => state.t)
  const getTotals = useSaleStore(state => state.getTotals)
  const setDiscount = useSaleStore(state => state.setDiscount)
  const discount = useSaleStore(state => state.discount)

  const cashSession = useReportsStore(state => state.cashSession)
  const cashXCut = useReportsStore(state => state.cashXCut)
  const fetchXCut = useReportsStore(state => state.fetchXCut)
  const fetchCashSession = useReportsStore(state => state.fetchCashSession)

  const [showDiscountInput, setShowDiscountInput] = useState(false)
  const [discountValue, setDiscountValue] = useState('')
  const [showCajaPanel, setShowCajaPanel] = useState(false)
  const panelRef = useRef(null)
  
  const { itemCount, subtotal, discountAmount, total } = getTotals()
  const hasItems = itemCount > 0
  const isSessionOpen = cashSession?.status === 'open'

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

  // Load cash session & X-cut when panel opens
  useEffect(() => {
    if (showCajaPanel) {
      fetchCashSession()
      if (cashSession?.id) fetchXCut()
    }
  }, [showCajaPanel]) // eslint-disable-line

  // Close panel when clicking outside
  useEffect(() => {
    if (!showCajaPanel) return
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowCajaPanel(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showCajaPanel])

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

  const renderCajaPanel = () => (
    <div className="floating-bar__caja-panel" ref={panelRef}>
      <div className="floating-bar__caja-panel-head">
        <span className="floating-bar__caja-panel-title">
          <FaCashRegister />
          Caja — {isSessionOpen ? 'Abierta' : 'Cerrada'}
        </span>
        <button type="button" className="floating-bar__caja-panel-close" onClick={() => setShowCajaPanel(false)}>✕</button>
      </div>

      {isSessionOpen && (
        <div className="floating-bar__caja-stats">
          <div>
            <span>Apertura</span>
            <strong>${Number(cashSession.opening_amount || 0).toFixed(2)}</strong>
          </div>
          <div>
            <span>Efectivo esperado</span>
            <strong>${Number(cashXCut?.currentBalance || 0).toFixed(2)}</strong>
          </div>
          <div>
            <span>Ventas en sesión</span>
            <strong>${Number(cashXCut?.totalSales || 0).toFixed(2)}</strong>
          </div>
        </div>
      )}

      {!isSessionOpen && (
        <p className="floating-bar__caja-no-session">No hay sesión de caja activa.</p>
      )}

      <div className="floating-bar__caja-actions">
        {hasItems && onSavePending && (
          <button
            type="button"
            className="floating-bar__caja-btn floating-bar__caja-btn--primary"
            disabled={savingPending}
            onClick={async () => {
              await onSavePending()
              setShowCajaPanel(false)
            }}
          >
            {savingPending ? t('currentSale.savingPending') : t('currentSale.savePending')}
          </button>
        )}

        <button
          type="button"
          className="floating-bar__caja-btn floating-bar__caja-btn--primary"
          onClick={() => { navigate('/cash-register/movimientos'); setShowCajaPanel(false) }}
        >
          Ver movimientos
        </button>
        <button
          type="button"
          className="floating-bar__caja-btn floating-bar__caja-btn--danger"
          disabled={!isSessionOpen}
          onClick={() => { navigate('/cash-register/corte'); setShowCajaPanel(false) }}
        >
          Corte Z / Cerrar caja
        </button>
        <button
          type="button"
          className="floating-bar__caja-btn"
          onClick={() => { navigate('/cash-register'); setShowCajaPanel(false) }}
        >
          Panel de caja
        </button>
      </div>
    </div>
  )

  return (
    <div className="floating-bar">
      {showCajaPanel && renderCajaPanel()}
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
          
          <div
            className={`floating-bar__total ${showCajaPanel ? 'is-caja-active' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="Ver opciones de caja"
            onClick={() => setShowCajaPanel(v => !v)}
            onKeyDown={(e) => e.key === 'Enter' && setShowCajaPanel(v => !v)}
          >
            <span className="floating-bar__total-label">{t('currentSale.total')}</span>
            <span className="floating-bar__total-amount">${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="floating-bar__actions">
          <button
            type="button"
            className={`floating-bar__caja-toggle ${showCajaPanel ? 'is-active' : ''}`}
            onClick={() => setShowCajaPanel(v => !v)}
            title="Opciones de caja"
            aria-label="Opciones de caja"
          >
            <FaScissors />
          </button>

          {hasItems && onSavePending && (
            <button
              className="floating-bar__pending-btn-mobile"
              disabled={savingPending}
              onClick={onSavePending}
            >
              {savingPending ? t('currentSale.savingPending') : t('currentSale.savePending')}
            </button>
          )}

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
    </div>
  )
}

export default FloatingBar
