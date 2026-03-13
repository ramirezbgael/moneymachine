import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FaArrowLeft, FaCalendarAlt, FaCashRegister, FaFileInvoiceDollar, FaUser } from 'react-icons/fa'
import { useReportsStore } from '../../store/reportsStore'
import { useTenantStore } from '../../store/tenantStore'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import PrintModal from '../../components/PrintModal/PrintModal'

const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`

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
    return { label: 'Pagado', className: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40' }
  }
  if (isOverdue(row)) {
    return { label: 'Vencido', className: 'bg-red-900/35 text-red-300 border-red-700/40' }
  }
  return { label: 'Pendiente', className: 'bg-orange-900/35 text-orange-300 border-orange-700/40' }
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

  if (!receivable) {
    return (
      <div className="min-h-full bg-[#050816] px-4 py-6 pb-24 text-zinc-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-zinc-800 bg-zinc-950/85 p-6">
          <button type="button" onClick={() => navigate('/finance/receivables')} className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white">
            <FaArrowLeft />
            Volver a cuentas por cobrar
          </button>
          <h1 className="text-2xl font-semibold text-white">Detalle no encontrado</h1>
          <p className="mt-2 text-sm text-zinc-400">No se encontró la deuda solicitada.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-[#050816] px-4 py-6 pb-24 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-center justify-between rounded-[28px] border border-zinc-800 bg-zinc-950/85 px-4 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur">
          <button type="button" onClick={() => navigate('/finance/receivables')} className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white">
            <FaArrowLeft />
            Volver
          </button>
          <h1 className="text-lg font-semibold text-emerald-400">Detalle de cuenta por cobrar</h1>
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusMeta.className}`}>{statusMeta.label}</span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-5">
            <article className="overflow-hidden rounded-[28px] border border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_45%),linear-gradient(180deg,_rgba(24,24,27,0.98),_rgba(9,9,11,0.98))] p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Cliente</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{linkedClientName}</h2>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Monto</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-400">{formatMoney(receivable.amount)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Concepto</p>
                  <p className="mt-2 text-sm text-zinc-200">{receivable.concept || 'Sin concepto'}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Abonado</p>
                  <p className="mt-2 text-sm text-zinc-200">{formatMoney(paidAmount)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Saldo pendiente</p>
                  <p className={`mt-2 text-sm font-semibold ${remainingAmount > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                    {formatMoney(remainingAmount)}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Fecha</p>
                  <p className="mt-2 text-sm text-zinc-200">{formatDate(receivable.issue_date || receivable.created_at)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Vencimiento</p>
                  <p className={`mt-2 text-sm ${isOverdue(receivable) ? 'text-red-300' : 'text-zinc-200'}`}>
                    {formatDate(receivable.due_date)}
                  </p>
                </div>
              </div>

              {receivable.notes && (
                <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Notas</p>
                  <p className="mt-2 text-sm text-zinc-300">{receivable.notes}</p>
                </div>
              )}
            </article>
          </section>

          <aside className="space-y-5">
            <article className="rounded-[28px] border border-zinc-800 bg-zinc-950/90 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Acciones</p>
              <div className="mt-4 grid gap-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  disabled={!canRegisterPayment}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 font-medium text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  <FaCashRegister />
                  {canRegisterPayment ? 'Registrar pago' : 'Cuenta liquidada'}
                </button>

                {linkedClientId && (
                  <button
                    type="button"
                    onClick={() => navigate(`/clientes/${linkedClientId}`)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800"
                  >
                    <FaUser />
                    Ver cliente
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => navigate('/finance/receivables')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800"
                >
                  <FaFileInvoiceDollar />
                  Volver a CxC
                </button>
              </div>
            </article>

            <article className="rounded-[28px] border border-zinc-800 bg-zinc-950/90 p-5">
              <div className="space-y-2 text-sm text-zinc-300">
                <p className="inline-flex items-center gap-2"><FaCalendarAlt className="text-zinc-500" /> Última actualización: {formatDate(receivable.updated_at || receivable.created_at)}</p>
                <p className="text-xs text-zinc-500">ID: {receivable.id}</p>
              </div>
            </article>

            <article className="rounded-[28px] border border-zinc-800 bg-zinc-950/90 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Historial de pagos</p>
              <div className="mt-3 space-y-2">
                {historyLoading && (
                  <p className="rounded-2xl border border-dashed border-zinc-800 px-4 py-4 text-center text-sm text-zinc-500">Cargando pagos...</p>
                )}

                {!historyLoading && paymentHistory.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-zinc-800 px-4 py-4 text-center text-sm text-zinc-500">Aún no hay pagos registrados.</p>
                )}

                {!historyLoading && paymentHistory.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-zinc-100">{formatMoney(entry.amount)}</p>
                      <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-zinc-300">
                        {entry.payment_method || 'cash'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{formatDateTime(entry.paid_at)}</p>
                  </div>
                ))}
              </div>
            </article>
          </aside>
        </div>
      </div>

      {showPaymentModal && (
        <section className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => !paying && setShowPaymentModal(false)}>
          <article className="w-full max-w-md rounded-[26px] border border-zinc-800 bg-zinc-950 p-5" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white">Registrar abono</h3>
            <p className="mt-1 text-sm text-zinc-400">Saldo pendiente: {formatMoney(remainingAmount)}</p>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm text-zinc-400">Monto a abonar</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-500"
              />
            </label>

            <div className="mt-4">
              <p className="mb-2 text-sm text-zinc-400">Método de pago</p>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                      paymentMethod === method.id
                        ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500'
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                disabled={paying}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={paying}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-60"
              >
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
