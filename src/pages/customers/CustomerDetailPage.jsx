import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useFinanceCustomersStore } from '../../store/financeCustomersStore'
import { useReportsStore } from '../../store/reportsStore'
import { useTenantStore } from '../../store/tenantStore'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import PrintModal from '../../components/PrintModal/PrintModal'
import './CustomerDetailPage.css'

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

const CustomerDetailPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const currentTenantId = useTenantStore((state) => state.currentTenantId)
  const { customers, fetchCustomers } = useFinanceCustomersStore()
  const {
    receivables,
    fetchReceivables,
    registerReceivablePayment,
    fetchFinancialSummary,
    fetchCashSession
  } = useReportsStore()
  const [paymentRows, setPaymentRows] = useState([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedReceivable, setSelectedReceivable] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paying, setPaying] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [lastPaymentSale, setLastPaymentSale] = useState(null)

  useEffect(() => {
    if (!currentTenantId) return
    fetchCustomers()
    fetchReceivables()
  }, [currentTenantId, fetchCustomers, fetchReceivables])

  const customer = useMemo(() => customers.find((item) => String(item.id) === String(id)), [customers, id])

  const customerReceivables = useMemo(() => {
    return receivables.filter((row) => {
      if (row.client_id && customer?.id) return String(row.client_id) === String(customer.id)
      if (row.finance_customers?.id && customer?.id) return String(row.finance_customers.id) === String(customer.id)
      if (!customer) return false
      return String(row.client_name || '').toLowerCase() === String(customer.name || '').toLowerCase()
    })
  }, [receivables, customer])

  useEffect(() => {
    const loadPayments = async () => {
      const receivableIds = customerReceivables.map((row) => row.id).filter(Boolean)
      if (!receivableIds.length) {
        setPaymentRows([])
        return
      }

      if (isSupabaseConfigured() && supabase) {
        const { data, error } = await supabase
          .from('payments')
          .select('id, receivable_id, amount, paid_at, payment_method')
          .in('receivable_id', receivableIds)
          .order('paid_at', { ascending: false })

        if (!error) {
          const byReceivable = new Map(customerReceivables.map((row) => [row.id, row]))
          const mapped = (data || []).map((payment) => ({
            id: payment.id,
            receivable_id: payment.receivable_id,
            concept: byReceivable.get(payment.receivable_id)?.concept || 'Pago de cuenta por cobrar',
            amount: payment.amount,
            date: payment.paid_at,
            method: payment.payment_method || 'cash'
          }))
          setPaymentRows(mapped)
          return
        }
      }

      const localPayments = (() => {
        try {
          const raw = localStorage.getItem('finance:payments')
          return raw ? JSON.parse(raw) : []
        } catch {
          return []
        }
      })()

      const byReceivable = new Map(customerReceivables.map((row) => [row.id, row]))
      const mapped = localPayments
        .filter((payment) => receivableIds.includes(payment.receivable_id))
        .map((payment) => ({
          id: payment.id,
          receivable_id: payment.receivable_id,
          concept: byReceivable.get(payment.receivable_id)?.concept || 'Pago de cuenta por cobrar',
          amount: payment.amount,
          date: payment.paid_at,
          method: payment.payment_method || 'cash'
        }))
      setPaymentRows(mapped)
    }

    loadPayments()
  }, [customerReceivables])

  const getPaidAmountForReceivable = (receivableId) => paymentRows
    .filter((payment) => String(payment.receivable_id || payment.receivableId || '') === String(receivableId))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)

  const openPaymentModal = (row) => {
    const paidAmount = getPaidAmountForReceivable(row.id)
    const remaining = Math.max(0, Number(row.amount || 0) - paidAmount)
    setSelectedReceivable(row)
    setPaymentAmount(remaining > 0 ? String(remaining.toFixed(2)) : '')
    setPaymentMethod('cash')
    setShowPaymentModal(true)
  }

  const handleConfirmPayment = async () => {
    if (!selectedReceivable) return
    const amount = Number(paymentAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert('Ingresa un monto válido mayor a 0.')
      return
    }

    setPaying(true)
    try {
      const result = await registerReceivablePayment(selectedReceivable.id, {
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
          product: { name: `Pago CxC ${customer.name}` }
        }]
      })

      setShowPaymentModal(false)
      setSelectedReceivable(null)
      setShowPrintModal(true)
    } catch (error) {
      window.alert(error?.message || 'No se pudo registrar el pago.')
    } finally {
      setPaying(false)
    }
  }

  if (!customer) {
    return (
      <div className="customer-detail-page">
        <div className="customer-detail-shell">
          <button type="button" className="customer-detail-back" onClick={() => navigate('/clientes')}>← Volver a clientes</button>
          <div className="customer-detail-empty">Cliente no encontrado.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="customer-detail-page">
      <div className="customer-detail-shell">
      <button type="button" className="customer-detail-back" onClick={() => navigate('/clientes')}>← Volver a clientes</button>

      <section className="customer-detail-panel">
        <h1 className="customer-detail-name">{customer.name}</h1>
        <div className="customer-detail-meta">
          <p>Teléfono: <strong>{customer.phone || 'Sin teléfono'}</strong></p>
          <p>Email: <strong>{customer.email || 'Sin email'}</strong></p>
          <p>Alta: <strong>{formatDate(customer.created_at)}</strong></p>
        </div>
        {customer.notes && <p className="customer-detail-notes">Notas: <strong>{customer.notes}</strong></p>}
      </section>

      <section className="customer-detail-section">
        <div className="customer-detail-section-head">
          <h2 className="customer-detail-heading">Historial de deudas</h2>
          <button
            type="button"
            onClick={() => navigate('/finance/new-receivable', { state: { preselectedClientId: customer.id } })}
            className="customer-detail-primary-btn"
          >
            + Nueva deuda
          </button>
        </div>
        <div className="customer-detail-payments">
          {customerReceivables.length === 0 && (
            <div className="customer-detail-empty">Este cliente aún no tiene deudas registradas.</div>
          )}
          {customerReceivables.map((row) => (
            <article key={row.id} className="customer-detail-card">
              {(() => {
                const paidAmount = getPaidAmountForReceivable(row.id)
                const remaining = Math.max(0, Number(row.amount || 0) - paidAmount)
                return (
                  <>
              <div className="customer-detail-row-head">
                <div>
                  <p className="customer-detail-concept">{row.concept}</p>
                  <p className="customer-detail-date">Vence: {formatDate(row.due_date)}</p>
                </div>
                <div className="text-right">
                  <p className="customer-detail-total">{formatMoney(row.amount)}</p>
                  <span className={`customer-detail-badge ${row.status === 'paid' ? 'customer-detail-badge--paid' : 'customer-detail-badge--pending'}`}>
                    {row.status === 'paid' ? 'Pagado' : 'Pendiente'}
                  </span>
                </div>
              </div>
              <div className="customer-detail-stats">
                <div className="customer-detail-stat">
                  <p className="customer-detail-stat-label">Abonado</p>
                  <p className="customer-detail-stat-value customer-detail-stat-value--paid">{formatMoney(paidAmount)}</p>
                </div>
                <div className="customer-detail-stat">
                  <p className="customer-detail-stat-label">Pendiente</p>
                  <p className={`customer-detail-stat-value ${remaining > 0 ? 'customer-detail-stat-value--pending' : 'customer-detail-stat-value--paid'}`}>{formatMoney(remaining)}</p>
                </div>
              </div>
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={() => openPaymentModal(row)}
                  className="customer-detail-pay-btn"
                  style={{ marginTop: '12px' }}
                >
                  Registrar pago
                </button>
              )}
                  </>
                )
              })()}
            </article>
          ))}
        </div>
      </section>

      <section className="customer-detail-section">
        <h2 className="customer-detail-heading" style={{ marginBottom: '12px' }}>Pagos registrados</h2>
        <div className="customer-detail-payments">
          {paymentRows.length === 0 && (
            <div className="customer-detail-empty">Sin pagos registrados.</div>
          )}
          {paymentRows.map((payment) => (
            <div key={payment.id} className="customer-detail-payment-item">
              <div>
                <p className="customer-detail-payment-name">{payment.concept}</p>
                <p className="customer-detail-method">{formatDateTime(payment.date)} · {payment.method}</p>
              </div>
              <p className="customer-detail-payment-amount">{formatMoney(payment.amount)}</p>
            </div>
          ))}
        </div>
      </section>

      {showPaymentModal && selectedReceivable && (
        <section className="customer-detail-modal-overlay" onClick={() => !paying && setShowPaymentModal(false)}>
          <article className="customer-detail-modal" onClick={(event) => event.stopPropagation()}>
            <h3 className="customer-detail-heading" style={{ fontSize: '1.35rem' }}>Registrar abono</h3>
            <p className="customer-detail-muted" style={{ marginTop: '4px' }}>{selectedReceivable.concept}</p>

            <label className="mt-4 block">
              <span className="customer-detail-label">Monto a abonar</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                className="customer-detail-input"
              />
            </label>

            <div className="mt-4">
              <p className="customer-detail-label">Método de pago</p>
              <div className="customer-detail-method-grid">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`customer-detail-method-btn ${paymentMethod === method.id ? 'customer-detail-method-btn--active' : ''}`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="customer-detail-modal-actions">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                disabled={paying}
                className="customer-detail-secondary-btn"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={paying}
                className="customer-detail-primary-btn"
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
    </div>
  )
}

export default CustomerDetailPage
