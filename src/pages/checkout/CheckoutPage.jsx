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

/** Billetes MXN habituales: al pulsar se suma esa cantidad al monto recibido */
const BILL_DENOMINATIONS_MXN = [20, 50, 100, 200, 500, 1000]

/** Compara montos en centavos para evitar fallos con total 37.24 vs recibido 37.24 por float. */
const cents = (n) => (Number.isFinite(n) ? Math.round(n * 100) : NaN)

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
  /** Tras clearSale() el total pasa a 0; guardamos el cambio para el paso “ticket”. */
  const [completedCashChange, setCompletedCashChange] = useState(0)

  const isCashPayment = paymentMethod === 'cash'
  const cashReceivedAmount = Number(cashReceived || 0)
  const cashChange = useMemo(() => {
    const diff = cashReceivedAmount - total
    return Number.isFinite(diff) ? Math.round(diff * 100) / 100 : diff
  }, [cashReceivedAmount, total])
  const hasEnoughCash =
    !isCashPayment ||
    (Number.isFinite(cashReceivedAmount) && cents(cashReceivedAmount) >= cents(total))
  const showChange =
    isCashPayment && hasEnoughCash && Number.isFinite(cashChange) && Math.round(cashChange * 100) > 0

  useEffect(() => {
    if (paymentMethod === 'cash') {
      setCashReceived(total > 0 ? total.toFixed(2) : '')
    } else {
      setCashReceived('')
      setError('')
    }
  }, [paymentMethod, total])

  const setExactCash = () => {
    setCashReceived(total > 0 ? total.toFixed(2) : '')
    setError('')
  }

  /**
   * Billetes: si el campo ya es el monto exacto de la venta (p. ej. venía de "Exacto"),
   * el siguiente billete sustituye el valor (pagaron con un $20, no $6+$20).
   * Si ya indicaste otro monto, se suma (varios billetes).
   */
  const applyBillDenomination = (amount) => {
    const base = Number.parseFloat(String(cashReceived).replace(',', '.')) || 0
    if (cents(base) === cents(total)) {
      setCashReceived(amount.toFixed(2))
    } else {
      setCashReceived((base + amount).toFixed(2))
    }
    setError('')
  }

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
      setCompletedCashChange(isCashPayment ? Number(Math.max(cashChange, 0).toFixed(2)) : 0)
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

  const shellClass =
    'checkout-page flex min-h-full w-full flex-1 flex-col bg-[#0a0a0a] text-[#e8ede9]'

  /** Ancho cómodo en escritorio; móvil sigue en una columna */
  const innerShell =
    'mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-6 pt-5 md:px-6 md:pb-8 md:pt-6 lg:max-w-6xl lg:px-10 lg:pb-10 lg:pt-8'

  if (step === 'ticket' && completedSale) {
    const ticketChange = paymentMethod === 'cash' ? completedCashChange : 0
    const showTicketChange = paymentMethod === 'cash' && ticketChange > 0.004

    return (
      <section className={shellClass}>
        <div className={innerShell}>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12 xl:gap-16">
            <div className="min-w-0 flex-1 space-y-6 lg:max-w-[min(100%,28rem)]">
              <header className="space-y-2">
                <h1 className="text-xl font-semibold tracking-tight text-[#e8ede9]">Venta completada</h1>
                <p className="text-sm text-[#7d948a]">Confirma si deseas imprimir ticket.</p>
              </header>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 border-b border-[rgb(82_196_138/0.1)] pb-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-[#7d948a]">Folio</span>
                  <span className="text-lg font-bold tabular-nums text-[#e8ede9]">
                    {completedSale.sale_number || completedSale.id}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-[rgb(82_196_138/0.1)] pb-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-[#7d948a]">Total cobrado</span>
                  <span className="text-xl font-bold tabular-nums text-[#e8ede9] drop-shadow-[0_0_20px_rgba(82,196,138,0.2)]">
                    ${Number(completedSale.total || total).toFixed(2)}
                  </span>
                </div>
                {showTicketChange && (
                  <div className="rounded-2xl bg-gradient-to-br from-[rgb(82_196_138/0.14)] to-[rgb(82_196_138/0.04)] px-4 py-3">
                    <div className="flex items-end justify-between gap-3">
                      <span className="text-xs font-medium uppercase tracking-wider text-[#7d948a]">Cambio</span>
                      <span className="text-2xl font-bold tabular-nums text-[#6ee7a8] drop-shadow-[0_0_16px_rgba(82,196,138,0.35)]">
                        ${ticketChange.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col border-0 lg:min-h-[min(100%,320px)] lg:border-l lg:border-[rgb(82_196_138/0.1)] lg:pl-10 xl:pl-14">
              <div className="mb-6 space-y-3">
                <p className="text-sm font-medium text-[#7d948a]">¿Imprimir ticket?</p>
                <div className="flex w-full gap-1 rounded-full bg-[rgb(20_30_27)] p-1 ring-1 ring-inset ring-[rgb(82_196_138/0.08)]">
                  <button
                    type="button"
                    className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-all ${
                      !shouldPrint
                        ? 'bg-[rgb(82_196_138/0.22)] text-[#f0fdf4] shadow-[0_0_24px_rgba(82,196,138,0.18)]'
                        : 'text-[#7d948a] hover:bg-white/[0.06] hover:text-[#c4d4cc]'
                    }`}
                    onClick={() => setShouldPrint(false)}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-all ${
                      shouldPrint
                        ? 'bg-[rgb(82_196_138/0.22)] text-[#f0fdf4] shadow-[0_0_24px_rgba(82,196,138,0.18)]'
                        : 'text-[#7d948a] hover:bg-white/[0.06] hover:text-[#c4d4cc]'
                    }`}
                    onClick={() => setShouldPrint(true)}
                  >
                    Sí, imprimir
                  </button>
                </div>
              </div>

              {printMessage && (
                <p className="mb-6 rounded-xl bg-[rgb(82_196_138/0.08)] px-3 py-2 text-sm font-medium text-[#6ee7a8]">
                  {printMessage}
                </p>
              )}

              <div className="mt-auto flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  className="w-full rounded-2xl bg-gradient-to-b from-[#5fd4a0] to-[#52c48a] py-4 text-base font-bold text-[#0a1f16] shadow-[0_0_24px_rgba(82,196,138,0.35)] transition hover:brightness-105 disabled:opacity-50 lg:max-w-md"
                  onClick={handleFinish}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Finalizando...' : 'Finalizar venta'}
                </button>
                <button
                  type="button"
                  className="w-full py-2 text-center text-sm font-medium text-[#7d948a] transition hover:text-[#c4d4cc] disabled:opacity-50 lg:max-w-md lg:text-left"
                  onClick={() => navigate('/')}
                  disabled={isProcessing}
                >
                  Omitir
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={shellClass}>
      <div className={innerShell}>
        <header className="mb-6 space-y-2 lg:mb-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-left text-sm font-semibold text-[#52c48a] transition hover:text-[#6ee7a8]"
          >
            ← Volver a venta
          </button>
          <h1 className="text-xl font-semibold tracking-tight text-[#e8ede9]">Confirmar venta</h1>
          <p className="text-sm text-[#7d948a]">Revisa el pago antes de finalizar.</p>
        </header>

        {!items.length && (
          <div className="flex flex-1 flex-col items-start gap-4 py-4">
            <p className="text-sm text-[#7d948a]">No hay productos en la venta actual.</p>
            <button
              type="button"
              className="rounded-2xl bg-gradient-to-b from-[#5fd4a0] to-[#52c48a] px-6 py-3 text-sm font-bold text-[#0a1f16] shadow-[0_0_20px_rgba(82,196,138,0.3)] transition hover:brightness-105"
              onClick={() => navigate('/')}
            >
              Regresar al punto de venta
            </button>
          </div>
        )}

        {!!items.length && (
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12 xl:gap-16">
            {/* Columna izquierda: resumen + total */}
            <div className="min-w-0 flex-1 space-y-6 lg:max-w-[min(100%,26rem)]">
              <div className="space-y-2">
                <p className="text-sm text-[#7d948a]">
                  <span className="tabular-nums">{itemCount}</span>
                  <span className="mx-1.5 text-[#5c6f66]">·</span>
                  <span className="tabular-nums font-medium text-[#a8bdb2]">${total.toFixed(2)}</span>
                </p>
                {discountAmount > 0 && (
                  <p className="text-xs text-[#7d948a]">
                    Descuento −<span className="tabular-nums">${discountAmount.toFixed(2)}</span>
                  </p>
                )}
              </div>

              <div className="text-center lg:text-left">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7d948a]">Total</p>
                <p
                  className="text-4xl font-bold tabular-nums tracking-tight text-white sm:text-5xl lg:text-5xl xl:text-6xl"
                  style={{
                    textShadow: '0 0 40px rgba(82, 196, 138, 0.35), 0 0 80px rgba(82, 196, 138, 0.12)'
                  }}
                >
                  ${total.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Columna derecha: pago + efectivo + acciones */}
            <div className="flex min-w-0 flex-1 flex-col border-0 lg:border-l lg:border-[rgb(82_196_138/0.1)] lg:pl-10 xl:pl-14">
              <div className="mb-6">
                <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7d948a]">
                  Forma de pago
                </p>
                <div
                  className="flex w-full max-w-xl gap-1 rounded-full bg-[rgb(20_30_27)] p-1 ring-1 ring-inset ring-[rgb(82_196_138/0.08)]"
                  role="group"
                  aria-label="Forma de pago"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-all ${
                        paymentMethod === method.id
                          ? 'bg-[rgb(82_196_138/0.22)] text-[#f0fdf4] shadow-[0_0_24px_rgba(82,196,138,0.18)]'
                          : 'text-[#7d948a] hover:bg-white/[0.06] hover:text-[#c4d4cc]'
                      }`}
                      onClick={() => setPaymentMethod(method.id)}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {isCashPayment && (
                <div className="mb-6 space-y-4">
                  <div>
                    <label
                      htmlFor="cash-received"
                      className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7d948a]"
                    >
                      Monto recibido
                    </label>
                    <div
                      className={`flex h-14 min-h-[3.5rem] max-w-xl items-center gap-2 rounded-2xl bg-[rgb(20_30_27)] px-4 shadow-[inset_0_2px_10px_rgba(0,0,0,0.45)] ring-1 ring-inset ${
                        hasEnoughCash
                          ? 'ring-[rgb(82_196_138/0.15)]'
                          : 'ring-[rgba(248,113,113,0.35)]'
                      }`}
                    >
                      <span className="text-lg font-semibold text-[#7d948a]">$</span>
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
                        className="min-w-0 flex-1 border-0 bg-transparent text-2xl font-bold tabular-nums text-[#e8ede9] caret-[#52c48a] outline-none placeholder:text-[#5c6f66] focus:ring-0"
                      />
                    </div>
                  </div>

                  <div className="flex max-w-xl flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={setExactCash}
                      className="rounded-full bg-[rgb(20_30_27)] px-3.5 py-1.5 text-xs font-semibold text-[#6ee7a8] ring-1 ring-inset ring-[rgb(82_196_138/0.25)] transition hover:bg-[rgb(82_196_138/0.12)] hover:ring-[rgb(82_196_138/0.4)]"
                    >
                      Exacto
                    </button>
                    {BILL_DENOMINATIONS_MXN.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => applyBillDenomination(amount)}
                        className="min-w-[3.25rem] rounded-full bg-[rgb(20_30_27)] px-3 py-1.5 text-xs font-semibold tabular-nums text-[#a8bdb2] ring-1 ring-inset ring-[rgb(82_196_138/0.1)] transition hover:bg-[rgb(82_196_138/0.1)] hover:text-[#6ee7a8] hover:ring-[rgb(82_196_138/0.25)]"
                      >
                        {`$${amount}`}
                      </button>
                    ))}
                  </div>

                  {showChange && (
                    <div className="max-w-xl rounded-2xl bg-gradient-to-br from-[rgb(82_196_138/0.14)] to-[rgb(82_196_138/0.04)] px-4 py-3.5">
                      <div className="flex items-end justify-between gap-3">
                        <span className="text-xs font-medium uppercase tracking-wider text-[#7d948a]">Cambio</span>
                        <span className="text-2xl font-bold tabular-nums text-[#6ee7a8] drop-shadow-[0_0_18px_rgba(82,196,138,0.4)]">
                          ${cashChange.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <p className="mb-4 max-w-xl rounded-xl bg-[rgba(248,113,113,0.08)] px-3 py-2 text-sm font-medium text-red-300 ring-1 ring-inset ring-red-500/25">
                  {error}
                </p>
              )}

              <div className="mt-auto flex flex-col gap-3 pt-4">
                <button
                  type="button"
                  className="w-full max-w-xl rounded-2xl bg-gradient-to-b from-[#5fd4a0] to-[#52c48a] py-4 text-base font-bold text-[#0a1f16] shadow-[0_0_28px_rgba(82,196,138,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                  onClick={handleConfirmPayment}
                  disabled={isProcessing || !hasEnoughCash}
                >
                  {isProcessing ? 'Procesando...' : 'Cobrar y continuar'}
                </button>
                <button
                  type="button"
                  className="w-full max-w-xl py-2 text-center text-sm font-medium text-[#7d948a] transition hover:text-[#c4d4cc] disabled:opacity-50 lg:text-left"
                  onClick={() => navigate('/')}
                  disabled={isProcessing}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default CheckoutPage
