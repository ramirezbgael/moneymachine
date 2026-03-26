import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FaArrowLeft, FaCalendarAlt, FaCashRegister, FaFileInvoiceDollar, FaUser } from 'react-icons/fa'
import { useReportsStore } from '../../store/reportsStore'
import { useTenantStore } from '../../store/tenantStore'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import PrintModal from '../../components/PrintModal/PrintModal'

const formatMoney = (value) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value || 0))

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'card', label: 'Tarjeta' },
  { id: 'transfer', label: 'Transferencia' }
]

const isOverdue = (row) => {
  if (!row?.due_date || row?.status === 'paid') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(row.due_date)
  due.setHours(0, 0, 0, 0)
  return due < today
}

const getStatusMeta = (row) => {
  if (row?.status === 'paid') {
    return { label: 'Pagado', className: 'mm-status mm-status--paid' }
  }
  if (isOverdue(row)) {
    return { label: 'Vencido', className: 'mm-status mm-status--overdue' }
  }
  return { label: 'Pendiente', className: 'mm-status mm-status--pending' }
}

export default function ReceivableDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const currentTenantId = useTenantStore((state) => state.currentTenantId)

  const {
    receivables,
    fetchReceivables,
    registerReceivablePayment,
    fetchFinancialSummary,
    fetchCashSession
  } = useReportsStore()

  const [paymentHistory, setPaymentHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paying, setPaying] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [lastPaymentSale, setLastPaymentSale] = useState(null)

  useEffect(() => {
    if (!currentTenantId) return
    fetchReceivables()
  }, [currentTenantId, fetchReceivables])

  const receivable = useMemo(() => {
    return receivables.find((item) => String(item.id) === String(id)) || null
  }, [receivables, id])

  useEffect(() => {
    let cancelled = false

    const loadPayments = async () => {
      if (!receivable?.id) {
        if (!cancelled) setPaymentHistory([])
        return
      }

      if (!cancelled) setHistoryLoading(true)
      try {
        if (isSupabaseConfigured() && supabase) {
          const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('receivable_id', receivable.id)
            .order('paid_at', { ascending: false })

          if (error) throw error
          if (!cancelled) setPaymentHistory(data || [])
          return
        }

        const localPayments = (() => {
          try {
            const raw = localStorage.getItem('finance:payments')
            return raw ? JSON.parse(raw) : []
          } catch {
            return []
          }
        })()

        const mapped = localPayments
          .filter((entry) => String(entry.receivable_id) === String(receivable.id))
          .sort((a, b) => String(b.paid_at || '').localeCompare(String(a.paid_at || '')))
        if (!cancelled) setPaymentHistory(mapped)
      } catch (error) {
        console.warn('Error loading receivable payments:', error.message)
        if (!cancelled) setPaymentHistory([])
      } finally {
        if (!cancelled) setHistoryLoading(false)
      }
    }

    loadPayments()
    return () => {
      cancelled = true
    }
  }, [receivable?.id])

  const statusMeta = getStatusMeta(receivable)
  const linkedClientId = receivable?.client_id || receivable?.finance_customers?.id || null
  const linkedClientName = receivable?.finance_customers?.name || receivable?.client_name || 'Cliente sin nombre'
  const totalAmount = Number(receivable?.amount || 0)
  const paidAmount = paymentHistory.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const remainingAmount = Math.max(0, totalAmount - paidAmount)
  const canRegisterPayment = remainingAmount > 0

  useEffect(() => {
    if (!showPaymentModal) return
    setPaymentAmount(remainingAmount > 0 ? String(remainingAmount.toFixed(2)) : '')
  }, [remainingAmount, showPaymentModal])

  const handleConfirmPayment = async () => {
    if (!receivable || !canRegisterPayment) return
    const amount = Number(paymentAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert('Ingresa un monto válido mayor a 0.')
      return
    }

    setPaying(true)
    try {
      const result = await registerReceivablePayment(receivable.id, {
        amount,
        payment_method: paymentMethod
      })

      await fetchReceivables()
      await fetchFinancialSummary()
      await fetchCashSession()

      setLastPaymentSale({
        id: `cxc-pay-${Date.now()}`,
        sale_number: `CXC-${Date.now()}`,
        created_at: new Date().toISOString(),
        subtotal: Number(result?.appliedAmount || amount),
        total: Number(result?.appliedAmount || amount),
        payment_method: paymentMethod,
        items: [{
          id: `cxc-item-${Date.now()}`,
          quantity: 1,
          unitPrice: Number(result?.appliedAmount || amount),
          subtotal: Number(result?.appliedAmount || amount),
          product: { name: `Pago CxC ${linkedClientName}` }
        }]
      })

      setShowPaymentModal(false)
      setShowPrintModal(true)
    } catch (error) {
      window.alert(error?.message || 'No se pudo registrar el pago.')
    } finally {
      setPaying(false)
    }
  }

  const modalInputClass = 'mm-input rounded-2xl'

  if (!receivable) {
    return (
      <div className="mm-page mm-page--flush">
        <div className="mm-shell mm-shell--md mm-stack">
          <article className="mm-card mm-card--pad-lg">
            <button type="button" onClick={() => navigate('/finance/receivables')} className="mm-back mb-6">
              <FaArrowLeft />
              Volver a cuentas por cobrar
            </button>
            <h1 className="text-2xl font-semibold text-[var(--text)]">Detalle no encontrado</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">No se encontró la deuda solicitada.</p>
          </article>
        </div>
      </div>
    )
  }

  return (
    <div className="mm-page mm-page--flush">
      <div className="mm-shell mm-shell--md mm-stack">
        <div className="mm-topbar">
          <button type="button" onClick={() => navigate('/finance/receivables')} className="mm-back">
            <FaArrowLeft />
            Volver
          </button>
          <h1 className="mm-topbar-title">Detalle de cuenta por cobrar</h1>
          <span className={statusMeta.className}>{statusMeta.label}</span>
        </div>

        <div className="mm-grid-detail">
          <section className="mm-stack">
            <article className="mm-card mm-card--hero overflow-hidden">
              <p className="mm-overline tracking-[0.3em]">Cliente</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text)]">{linkedClientName}</h2>

              <div className="mt-5 mm-grid-2">
                <div className="mm-tile">
                  <p className="mm-overline">Monto</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--accent)]">{formatMoney(receivable.amount)}</p>
                </div>
                <div className="mm-tile">
                  <p className="mm-overline">Concepto</p>
                  <p className="mt-2 text-sm text-[var(--text)]">{receivable.concept || 'Sin concepto'}</p>
                </div>
              </div>

              <div className="mt-4 mm-grid-2">
                <div className="mm-tile">
                  <p className="mm-overline">Abonado</p>
                  <p className="mt-2 text-sm text-[var(--text)]">{formatMoney(paidAmount)}</p>
                </div>
                <div className="mm-tile">
                  <p className="mm-overline">Saldo pendiente</p>
                  <p
                    className={`mt-2 text-sm font-semibold ${
                      remainingAmount > 0 ? 'text-amber-600' : 'text-[var(--accent)]'
                    }`}
                  >
                    {formatMoney(remainingAmount)}
                  </p>
                </div>
                <div className="mm-tile">
                  <p className="mm-overline">Fecha</p>
                  <p className="mt-2 text-sm text-[var(--text)]">{formatDate(receivable.issue_date || receivable.created_at)}</p>
                </div>
                <div className="mm-tile">
                  <p className="mm-overline">Vencimiento</p>
                  <p
                    className={`mt-2 text-sm ${isOverdue(receivable) ? 'text-[var(--danger)]' : 'text-[var(--text)]'}`}
                  >
                    {formatDate(receivable.due_date)}
                  </p>
                </div>
              </div>

              {receivable.notes && (
                <div className="mm-tile mt-4">
                  <p className="mm-overline">Notas</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{receivable.notes}</p>
                </div>
              )}
            </article>
          </section>

          <aside className="mm-stack">
            <article className="mm-card">
              <p className="mm-overline">Acciones</p>
              <div className="mt-4 grid gap-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  disabled={!canRegisterPayment}
                  className="mm-btn mm-btn--primary w-full rounded-2xl py-3 font-medium disabled:cursor-not-allowed disabled:opacity-45 disabled:bg-[var(--panel-2)] disabled:text-[var(--muted)]"
                >
                  <FaCashRegister />
                  {canRegisterPayment ? 'Registrar pago' : 'Cuenta liquidada'}
                </button>

                {linkedClientId && (
                  <button
                    type="button"
                    onClick={() => navigate(`/clientes/${linkedClientId}`)}
                    className="mm-btn mm-btn--ghost w-full rounded-2xl py-3 font-medium"
                  >
                    <FaUser />
                    Ver cliente
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => navigate('/finance/receivables')}
                  className="mm-btn mm-btn--ghost w-full rounded-2xl py-3 font-medium"
                >
                  <FaFileInvoiceDollar />
                  Volver a CxC
                </button>
              </div>
            </article>

            <article className="mm-card">
              <div className="space-y-2 text-sm text-[var(--muted)]">
                <p className="inline-flex items-center gap-2 text-[var(--text)]">
                  <FaCalendarAlt className="text-[var(--muted)]" aria-hidden />
                  Última actualización: {formatDate(receivable.updated_at || receivable.created_at)}
                </p>
                <p className="text-xs text-[var(--muted)]">ID: {receivable.id}</p>
              </div>
            </article>

            <article className="mm-card">
              <p className="mm-overline">Historial de pagos</p>
              <div className="mt-3 space-y-2">
                {historyLoading && <p className="mm-dashed-empty">Cargando pagos...</p>}

                {!historyLoading && paymentHistory.length === 0 && (
                  <p className="mm-dashed-empty">Aún no hay pagos registrados.</p>
                )}

                {!historyLoading &&
                  paymentHistory.map((entry) => (
                    <div key={entry.id} className="mm-list-row">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[var(--text)]">{formatMoney(entry.amount)}</p>
                        <span className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                          {entry.payment_method || 'cash'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--muted)]">{formatDateTime(entry.paid_at)}</p>
                    </div>
                  ))}
              </div>
            </article>
          </aside>
        </div>
      </div>

      {showPaymentModal && (
        <section
          className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => !paying && setShowPaymentModal(false)}
        >
          <article
            className="mm-card mm-card--pad-lg w-full max-w-md shadow-[var(--shadow-lg)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--text)]">Registrar abono</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">Saldo pendiente: {formatMoney(remainingAmount)}</p>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm text-[var(--muted)]">Monto a abonar</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                className={modalInputClass}
              />
            </label>

            <div className="mt-4">
              <p className="mb-2 text-sm text-[var(--muted)]">Método de pago</p>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                      paymentMethod === method.id
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--text)] hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]'
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowPaymentModal(false)} disabled={paying} className="mm-btn mm-btn--ghost text-sm py-2">
                Cancelar
              </button>
              <button type="button" onClick={handleConfirmPayment} disabled={paying} className="mm-btn mm-btn--primary text-sm py-2">
                {paying ? 'Registrando...' : 'Cobrar y guardar'}
              </button>
            </div>
          </article>
        </section>
      )}

      {showPrintModal && lastPaymentSale && (
        <PrintModal
          sale={lastPaymentSale}
          onConfirm={() => {
            setShowPrintModal(false)
            setLastPaymentSale(null)
          }}
          onCancel={() => {
            setShowPrintModal(false)
            setLastPaymentSale(null)
          }}
        />
      )}
    </div>
  )
}
