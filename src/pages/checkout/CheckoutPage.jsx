import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSaleStore } from '../../store/saleStore'
import { useAuthStore } from '../../store/authStore'
import { useReportsStore } from '../../store/reportsStore'
import { processSale } from '../../services/saleService'
import { playSaleComplete } from '../../services/soundService'
import { printTicket } from '../../services/printerService'
import './CheckoutPage.css'

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'card', label: 'Tarjeta' },
  { id: 'transfer', label: 'Transferencia' }
]

const CheckoutPage = () => {
  const navigate = useNavigate()
  const items = useSaleStore(state => state.items)
  const getTotals = useSaleStore(state => state.getTotals)
  const clearSale = useSaleStore(state => state.clearSale)
  const user = useAuthStore(state => state.user)
  const cashSession = useReportsStore(state => state.cashSession)

  const { subtotal, discountAmount, total, itemCount } = getTotals()

  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [step, setStep] = useState('payment')
  const [shouldPrint, setShouldPrint] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [printMessage, setPrintMessage] = useState('')
  const [completedSale, setCompletedSale] = useState(null)

  const isCashPayment = paymentMethod === 'cash'
  const cashReceivedAmount = Number(cashReceived || 0)
  const cashChange = useMemo(() => cashReceivedAmount - total, [cashReceivedAmount, total])
  const hasEnoughCash = !isCashPayment || (Number.isFinite(cashReceivedAmount) && cashReceivedAmount >= total)

  useEffect(() => {
    if (paymentMethod === 'cash') {
      setCashReceived(total > 0 ? total.toFixed(2) : '')
    } else {
      setCashReceived('')
      setError('')
    }
  }, [paymentMethod, total])

  const handleConfirmPayment = async () => {
    if (isProcessing) return

    if (!items.length) {
      setError('No hay productos en la venta.')
      return
    }

    if (isCashPayment && !hasEnoughCash) {
      setError('El monto recibido debe ser mayor o igual al total.')
      return
    }

    setIsProcessing(true)
    setError('')
    setPrintMessage('')

    try {
      const saleData = {
        items,
        subtotal,
        discount: discountAmount,
        total,
        paymentMethod,
        receiptType: 'ticket',
        customer: null,
        userId: user?.id || null,
        cashier: user?.email || 'system',
        registerId: cashSession?.register_id || null,
        sessionId: cashSession?.id || null,
        cashReceived: isCashPayment ? Number(cashReceivedAmount.toFixed(2)) : null,
        cashChange: isCashPayment ? Number(Math.max(cashChange, 0).toFixed(2)) : null
      }

      const processedSale = await processSale(saleData)
      playSaleComplete()
      clearSale()
      setCompletedSale(processedSale)
      setStep('ticket')
    } catch (paymentError) {
      console.error('Error processing payment:', paymentError)
      setError(paymentError.message || 'No se pudo procesar la venta. Intenta de nuevo.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFinish = async () => {
    if (!completedSale || isProcessing) return

    setIsProcessing(true)
    setPrintMessage('')

    if (shouldPrint) {
      try {
        await printTicket(completedSale)
        setPrintMessage('Ticket enviado a impresión.')
      } catch (printError) {
        console.warn('No se pudo imprimir el ticket:', printError)
        setPrintMessage('Venta completada. No se pudo imprimir en este dispositivo.')
      }
    }

    navigate('/')
  }

  if (step === 'ticket' && completedSale) {
    return (
      <section className="checkout-page">
        <div className="checkout-card checkout-card--compact">
          <header className="checkout-header">
            <h1>Venta completada</h1>
            <p>Ahora confirma si deseas imprimir ticket.</p>
          </header>

          <div className="checkout-summary checkout-summary--ticket">
            <div>
              <span>Folio</span>
              <strong>{completedSale.sale_number || completedSale.id}</strong>
            </div>
            <div>
              <span>Total cobrado</span>
              <strong>${Number(completedSale.total || total).toFixed(2)}</strong>
            </div>
            {paymentMethod === 'cash' && (
              <div>
                <span>Cambio</span>
                <strong>${Math.max(cashChange, 0).toFixed(2)}</strong>
              </div>
            )}
          </div>

          <div className="checkout-ticket-choice">
            <p>¿Imprimir ticket?</p>
            <div className="checkout-ticket-options">
              <button
                type="button"
                className={`checkout-method ${!shouldPrint ? 'checkout-method--active' : ''}`}
                onClick={() => setShouldPrint(false)}
              >
                No
              </button>
              <button
                type="button"
                className={`checkout-method ${shouldPrint ? 'checkout-method--active' : ''}`}
                onClick={() => setShouldPrint(true)}
              >
                Sí, imprimir
              </button>
            </div>
          </div>

          {printMessage && <div className="checkout-feedback">{printMessage}</div>}

          <div className="checkout-actions">
            <button type="button" className="checkout-btn checkout-btn--ghost" onClick={() => navigate('/')} disabled={isProcessing}>
              Omitir
            </button>
            <button type="button" className="checkout-btn checkout-btn--primary" onClick={handleFinish} disabled={isProcessing}>
              {isProcessing ? 'Finalizando...' : 'Finalizar venta'}
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="checkout-page">
      <div className="checkout-card checkout-card--compact">
        <header className="checkout-header">
          <button type="button" className="checkout-back" onClick={() => navigate('/')}>
            ← Volver a venta
          </button>
          <h1>Confirmar venta</h1>
          <p>Revisa el pago antes de finalizar.</p>
        </header>

        {!items.length && (
          <div className="checkout-empty">
            <p>No hay productos en la venta actual.</p>
            <button type="button" className="checkout-btn checkout-btn--primary" onClick={() => navigate('/')}>
              Regresar al punto de venta
            </button>
          </div>
        )}

        {!!items.length && (
          <>
            <div className="checkout-summary">
              <div>
                <span>Artículos</span>
                <strong>{itemCount}</strong>
              </div>
              <div>
                <span>Subtotal</span>
                <strong>${subtotal.toFixed(2)}</strong>
              </div>
              {discountAmount > 0 && (
                <div>
                  <span>Descuento</span>
                  <strong>${discountAmount.toFixed(2)}</strong>
                </div>
              )}
              <div className="checkout-summary__total">
                <span>Total</span>
                <strong>${total.toFixed(2)}</strong>
              </div>
            </div>

            <div className="checkout-methods">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  className={`checkout-method ${paymentMethod === method.id ? 'checkout-method--active' : ''}`}
                  onClick={() => setPaymentMethod(method.id)}
                >
                  {method.label}
                </button>
              ))}
            </div>

            {isCashPayment && (
              <div className="checkout-cash">
                <div className="checkout-cash__top">
                  <div className="checkout-cash__field">
                    <label htmlFor="cash-received">Monto recibido</label>
                    <div className="checkout-cash__input">
                      <span>$</span>
                      <input
                        id="cash-received"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={cashReceived}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.target.select()}
                        onChange={(e) => {
                          setCashReceived(e.target.value)
                          setError('')
                        }}
                      />
                    </div>
                  </div>

                  <div className={`checkout-change ${hasEnoughCash ? 'checkout-change--ok' : 'checkout-change--error'}`}>
                    <span>Cambio</span>
                    <strong>${(hasEnoughCash ? cashChange : 0).toFixed(2)}</strong>
                  </div>
                </div>

                <div className="checkout-cash__chips">
                  <button
                    type="button"
                    className="checkout-chip checkout-chip--exact"
                    onClick={() => {
                      setCashReceived(total.toFixed(2))
                      setError('')
                    }}
                  >
                    Exacto
                  </button>
                  {[20, 50, 100, 200, 500, 1000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      className="checkout-chip"
                      onClick={() => {
                        setCashReceived(amount.toFixed(2))
                        setError('')
                      }}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <div className="checkout-error">{error}</div>}

            <footer className="checkout-actions">
              <button type="button" className="checkout-btn checkout-btn--ghost" onClick={() => navigate('/')} disabled={isProcessing}>
                Cancelar
              </button>
              <button
                type="button"
                className="checkout-btn checkout-btn--primary"
                onClick={handleConfirmPayment}
                disabled={isProcessing || !hasEnoughCash}
              >
                {isProcessing ? 'Procesando...' : 'Cobrar y continuar'}
              </button>
            </footer>
          </>
        )}
      </div>
    </section>
  )
}

export default CheckoutPage
