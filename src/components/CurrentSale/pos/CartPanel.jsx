import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaCashRegister, FaScissors } from 'react-icons/fa6'
import { CartItem } from './CartItem'
import { useSaleStore } from '../../../store/saleStore'
import { useSettingsStore } from '../../../store/settingsStore'
import { useReportsStore } from '../../../store/reportsStore'
import { playRegisterOpen } from '../../../services/soundService'
import './CheckoutPushButton.css'

export function CartPanel({
  id,
  role,
  'aria-labelledby': ariaLabelledBy,
  className = '',
  isMobileLayout = false,
  onCheckout,
  onSavePending,
  savingPending,
  cartPulse,
  onProductAddedFeedback
}) {
  const navigate = useNavigate()
  const t = useSettingsStore((s) => s.t)
  const items = useSaleStore((s) => s.items)
  const getTotals = useSaleStore((s) => s.getTotals)
  const setDiscount = useSaleStore((s) => s.setDiscount)
  const discount = useSaleStore((s) => s.discount)
  const incrementQuantity = useSaleStore((s) => s.incrementQuantity)
  const decrementQuantity = useSaleStore((s) => s.decrementQuantity)
  const removeItem = useSaleStore((s) => s.removeItem)

  const cashSession = useReportsStore((s) => s.cashSession)
  const cashXCut = useReportsStore((s) => s.cashXCut)
  const fetchXCut = useReportsStore((s) => s.fetchXCut)
  const fetchCashSession = useReportsStore((s) => s.fetchCashSession)

  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showDiscountInput, setShowDiscountInput] = useState(false)
  const [discountValue, setDiscountValue] = useState('')
  const [showCajaPanel, setShowCajaPanel] = useState(false)
  const panelRef = useRef(null)
  const listRef = useRef(null)

  const { itemCount, subtotal, discountAmount, total } = getTotals()
  const hasItems = itemCount > 0
  const isSessionOpen = cashSession?.status === 'open'

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2' && total > 0) {
        const tag = e.target?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        playRegisterOpen()
        onCheckout()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [total, onCheckout])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (!items.length) return
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => (i < items.length - 1 ? i + 1 : 0))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => (i > 0 ? i - 1 : items.length - 1))
          break
        case 'Delete':
          e.preventDefault()
          if (selectedIndex >= 0 && items[selectedIndex]) {
            removeItem(items[selectedIndex].id)
            setSelectedIndex((i) => Math.max(0, i - 1))
          }
          break
        case '+':
        case '=':
          e.preventDefault()
          if (selectedIndex >= 0 && items[selectedIndex]) {
            incrementQuantity(items[selectedIndex].id)
            onProductAddedFeedback?.(items[selectedIndex].product?.id)
          }
          break
        case '-':
        case '_':
          e.preventDefault()
          if (selectedIndex >= 0 && items[selectedIndex]) {
            decrementQuantity(items[selectedIndex].id)
          }
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    items,
    selectedIndex,
    removeItem,
    incrementQuantity,
    decrementQuantity,
    onProductAddedFeedback
  ])

  useEffect(() => {
    if (selectedIndex < 0 || !listRef.current) return
    const row = listRef.current.querySelector(`[data-ci="${selectedIndex}"]`)
    row?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  useEffect(() => {
    if (showCajaPanel) {
      fetchCashSession()
      if (cashSession?.id) fetchXCut()
    }
  }, [showCajaPanel, fetchCashSession, fetchXCut, cashSession?.id])

  useEffect(() => {
    if (!showCajaPanel) return
    const close = (ev) => {
      if (panelRef.current && !panelRef.current.contains(ev.target)) {
        setShowCajaPanel(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
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

  return (
    <aside
      id={id}
      role={role}
      aria-labelledby={ariaLabelledBy}
      className={`pos-sale-cart relative z-[1] flex w-full shrink-0 flex-col max-lg:border-t max-lg:border-[color:var(--pos-border-subtle)] max-lg:bg-[var(--pos-bg-deep)] lg:w-[400px] ${className} ${
        isMobileLayout ? 'max-lg:min-h-0 max-lg:flex-1' : ''
      } ${cartPulse ? 'ring-2 ring-[rgb(82_196_138/0.35)] ring-offset-2 ring-offset-[var(--pos-bg-deep)]' : ''} transition-[box-shadow] duration-300`}
    >
      {showCajaPanel && (
        <div ref={panelRef} className="pos-sale-popover absolute bottom-36 left-3 right-3 z-20 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-[var(--pos-text)]">
              <FaCashRegister className="text-[var(--pos-accent)]" />
              Caja — {isSessionOpen ? 'Abierta' : 'Cerrada'}
            </span>
            <button
              type="button"
              onClick={() => setShowCajaPanel(false)}
              className="rounded-lg px-2 py-1 text-[var(--pos-text-muted)] hover:bg-[rgb(82_196_138/0.08)] hover:text-[var(--pos-text)]"
            >
              ✕
            </button>
          </div>
          {isSessionOpen ? (
            <div className="mb-3 grid gap-2 text-xs text-[var(--pos-text-muted)]">
              <div className="flex justify-between">
                <span>Apertura</span>
                <strong className="tabular-nums text-[var(--pos-text)]">
                  ${Number(cashSession.opening_amount || 0).toFixed(2)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Efectivo esperado</span>
                <strong className="tabular-nums text-[var(--pos-text)]">
                  ${Number(cashXCut?.currentBalance || 0).toFixed(2)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Ventas en sesión</span>
                <strong className="tabular-nums text-[var(--pos-text)]">
                  ${Number(cashXCut?.totalSales || 0).toFixed(2)}
                </strong>
              </div>
            </div>
          ) : (
            <p className="mb-3 text-xs text-[var(--pos-text-dim)]">No hay sesión de caja activa.</p>
          )}
          <div className="flex flex-col gap-2">
            {hasItems && onSavePending && (
              <button
                type="button"
                disabled={savingPending}
                onClick={() => {
                  onSavePending()
                  setShowCajaPanel(false)
                }}
                className="rounded-xl bg-[rgb(82_196_138/0.1)] py-2.5 text-sm font-medium text-[var(--pos-accent)] transition hover:bg-[rgb(82_196_138/0.16)]"
              >
                {savingPending ? t('currentSale.savingPending') : t('currentSale.savePending')}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                navigate('/cash-register/movimientos')
                setShowCajaPanel(false)
              }}
              className="rounded-xl border border-[var(--pos-border-subtle)] py-2 text-sm text-[var(--pos-text-muted)] hover:bg-[rgb(82_196_138/0.06)]"
            >
              Ver movimientos
            </button>
            <button
              type="button"
              disabled={!isSessionOpen}
              onClick={() => {
                navigate('/cash-register/corte')
                setShowCajaPanel(false)
              }}
              className="rounded-xl border border-red-500/25 bg-red-500/10 py-2 text-sm text-red-300 disabled:opacity-40"
            >
              Corte Z / Cerrar caja
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('/cash-register')
                setShowCajaPanel(false)
              }}
              className="rounded-xl py-2 text-sm text-[var(--pos-text-dim)] hover:text-[var(--pos-text-muted)]"
            >
              Panel de caja
            </button>
          </div>
        </div>
      )}

      <div
        className={`pos-sale-cart-header flex items-center justify-between px-3 lg:px-4 ${
          isMobileLayout ? 'py-2' : 'py-3'
        }`}
      >
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-[var(--pos-text)]">
            {t('currentSale.title')}
          </h2>
          <p className="text-xs text-[var(--pos-text-muted)]">
            {itemCount} {t('currentSale.items').toLowerCase()}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCajaPanel((v) => !v)}
          title="Opciones de caja"
          className={`flex items-center justify-center rounded-xl border transition active:scale-95 ${
            isMobileLayout ? 'h-11 min-h-[44px] w-11 min-w-[44px]' : 'h-10 w-10'
          } ${
            showCajaPanel
              ? 'border-[rgb(82_196_138/0.35)] bg-[rgb(82_196_138/0.1)] text-[var(--pos-accent)]'
              : 'border-[var(--pos-border-subtle)] bg-[var(--pos-surface-raised)] text-[var(--pos-text-muted)] hover:border-[rgb(82_196_138/0.22)] hover:text-[var(--pos-text)]'
          }`}
        >
          <FaScissors />
        </button>
      </div>

      <div
        ref={listRef}
        className={`min-h-0 flex-1 space-y-2 overflow-y-auto px-3 lg:min-h-[200px] ${
          isMobileLayout
            ? 'pos-sale-cart__scroll flex min-h-0 flex-col py-2'
            : 'min-h-[200px] py-3'
        }`}
      >
        {!hasItems ? (
          <div
            className={`flex flex-col items-center justify-center text-center ${
              isMobileLayout
                ? 'min-h-0 flex-1 px-2 py-3'
                : 'flex h-full min-h-[220px] justify-center px-2 py-6'
            }`}
          >
            <div
              className={`pos-sale-catalog-empty w-full max-w-sm rounded-xl border border-dashed px-4 py-8 ${
                isMobileLayout ? '' : ''
              }`}
            >
              <p className="pos-sale-catalog-empty-title text-sm font-medium">Carrito vacío</p>
              <p className="pos-sale-catalog-empty-sub mt-2 text-xs leading-relaxed">
                Busca o toca un producto para agregarlo. Escanea un código y pulsa Enter.
              </p>
            </div>
          </div>
        ) : (
          items.map((item, index) => (
            <div key={item.id} data-ci={index}>
              <CartItem
                item={item}
                t={t}
                touchFriendly={isMobileLayout}
                onIncrement={(id) => {
                  incrementQuantity(id)
                  onProductAddedFeedback?.(item.product?.id)
                }}
                onDecrement={decrementQuantity}
                onRemove={removeItem}
                isSelected={selectedIndex === index}
                onSelect={() => setSelectedIndex(index)}
              />
            </div>
          ))
        )}
      </div>

      <div
        className={`pos-sale-cart-footer mt-auto backdrop-blur-sm ${
          isMobileLayout
            ? 'pos-sale-cart-footer--mobile shrink-0 space-y-2 border-t border-[var(--pos-border-subtle)] bg-[var(--pos-bg-deep)] px-3 pb-1.5 pt-2'
            : 'space-y-3 px-4 py-4'
        }`}
      >
        {hasItems && (
          <div className="flex flex-wrap items-center gap-2">
            {!showDiscountInput ? (
              <button
                type="button"
                onClick={() => setShowDiscountInput(true)}
                className={`rounded-xl border border-[var(--pos-border-subtle)] px-3 text-xs font-semibold text-[var(--pos-text-muted)] transition hover:border-[rgb(82_196_138/0.22)] hover:bg-[rgb(82_196_138/0.06)] hover:text-[var(--pos-text)] active:scale-[0.99] ${
                  isMobileLayout ? 'min-h-[44px] py-2.5' : 'py-1.5'
                }`}
              >
                {discount > 0 ? `${t('payment.totalLabel')}: ${discount}%` : '+ Descuento %'}
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyDiscount()
                    if (e.key === 'Escape') {
                      setShowDiscountInput(false)
                      setDiscountValue('')
                    }
                  }}
                  placeholder="%"
                  className="w-20 rounded-lg border border-[var(--pos-border-subtle)] bg-[var(--pos-surface-raised)] px-2 py-1.5 text-sm text-[var(--pos-text)] outline-none focus:border-[rgb(82_196_138/0.45)]"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleApplyDiscount}
                  className="rounded-lg bg-[rgb(82_196_138/0.12)] px-2 py-1.5 text-xs font-semibold text-[var(--pos-accent)]"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={handleClearDiscount}
                  className="rounded-lg px-2 py-1.5 text-xs text-[var(--pos-text-dim)] hover:text-[var(--pos-text-muted)]"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        )}

        {discount > 0 && hasItems && (
          <div className="space-y-1 text-xs text-[var(--pos-text-muted)]">
            <div className="flex justify-between tabular-nums">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between tabular-nums text-amber-200/80">
              <span>Descuento ({discount}%)</span>
              <span>−${discountAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="pos-sale-total-card px-4 py-4">
          <div className="flex items-end justify-between gap-3">
            <span className="pos-sale-total-label">{t('currentSale.total')}</span>
            <span className="pos-sale-total-amount">${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={!hasItems}
            onClick={() => {
              playRegisterOpen()
              onCheckout()
            }}
            className="pos-checkout-push"
            title="F2"
          >
            <span className="pos-checkout-push__shadow" aria-hidden="true" />
            <span className="pos-checkout-push__edge" aria-hidden="true" />
            <span className="pos-checkout-push__front">
              {t('currentSale.checkout')}
              <span className="pos-checkout-push__hint">F2</span>
            </span>
          </button>
          {hasItems && onSavePending && (
            <button
              type="button"
              disabled={savingPending}
              onClick={onSavePending}
              title="F3"
              className="pos-sale-pending-secondary"
            >
              {savingPending ? t('currentSale.savingPending') : t('currentSale.savePending')}
              <span className="pos-sale-kbd">F3</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

export default CartPanel
