import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FaChartLine, FaCashRegister, FaFileInvoiceDollar, FaChartBar, FaHistory, FaFileExport, FaSearch, FaArrowRight } from 'react-icons/fa'
import { useReportsStore } from '../../store/reportsStore'
import { useTenantStore } from '../../store/tenantStore'
import './Finance.css'

const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`

const formatShortDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

const isReceivableOverdue = (row) => {
  if (row?.status === 'paid' || !row?.due_date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(row.due_date)
  dueDate.setHours(0, 0, 0, 0)
  return dueDate < today
}

const HUB_CARDS = [
  {
    id: 'caja',
    title: 'Caja',
    description: 'Abrir caja, registrar movimientos y realizar cortes de caja.',
    icon: FaCashRegister,
    to: '/cash-register'
  },
  {
    id: 'receivables',
    title: 'Cuentas por cobrar',
    description: 'Gestionar ventas pendientes y pagos de clientes.',
    icon: FaFileInvoiceDollar,
    to: '/finance/receivables'
  },
  {
    id: 'reports',
    title: 'Reportes',
    description: 'Analizar ventas por día, producto o periodo.',
    icon: FaChartBar,
    to: '/finance/reports'
  },
  {
    id: 'cuts',
    title: 'Historial de cortes',
    description: 'Revisar cortes de caja anteriores.',
    icon: FaHistory,
    to: '/cash-register/historial'
  },
  {
    id: 'export',
    title: 'Exportar datos',
    description: 'Exportar reportes financieros a Excel o CSV.',
    icon: FaFileExport,
    to: '/finance/export'
  }
]

const Finance = () => {
  const navigate = useNavigate()
  const { sectionId } = useParams()
  const currentTenantId = useTenantStore((state) => state.currentTenantId)
  const activeSection = ({
    cxc: 'receivables',
    cortes: 'cuts',
    exportar: 'export',
    reportes: 'reports'
  }[sectionId] || sectionId || 'home')

  const {
    loading,
    financialSummary,
    receivables,
    cashSession,
    cashMovements,
    cashXCut,
    fetchFinancialSummary,
    fetchReceivables,
    fetchCashSession,
    fetchCashMovements,
    fetchXCut,
    openCashSession,
    closeCashSessionZ,
    registerCashMovement,
    registerReceivablePayment
  } = useReportsStore()

  const [quickSearch, setQuickSearch] = useState('')
  const [newMovement, setNewMovement] = useState({ type: 'adjustment', description: '', amount: '' })

  useEffect(() => {
    if (activeSection === 'home') return
    if (!currentTenantId) return
    fetchFinancialSummary()
    fetchReceivables()
    fetchCashSession()
  }, [
    activeSection,
    currentTenantId,
    fetchFinancialSummary,
    fetchReceivables,
    fetchCashSession
  ])

  useEffect(() => {
    if (activeSection === 'home') return
    if (cashSession?.id) {
      fetchCashMovements(cashSession.id)
      fetchXCut()
    }
  }, [activeSection, cashSession?.id, fetchCashMovements, fetchXCut])

  const openAmount = async () => {
    const raw = window.prompt('Monto de apertura de caja', '0')
    if (raw == null) return
    const amount = Number(raw)
    if (!Number.isFinite(amount) || amount < 0) return
    await openCashSession(amount)
    await fetchCashSession()
    await fetchFinancialSummary()
  }

  const handleCutZ = async () => {
    if (!cashSession?.id) return
    const raw = window.prompt('Monto final en caja para cierre Z', String(cashXCut?.currentBalance || 0))
    if (raw == null) return
    const amount = Number(raw)
    if (!Number.isFinite(amount) || amount < 0) return
    await closeCashSessionZ(amount)
    await fetchCashSession()
    await fetchFinancialSummary()
  }

  const handleRegisterMovement = async (e) => {
    e.preventDefault()
    const amount = Number(newMovement.amount)
    if (!cashSession?.id || !newMovement.description.trim() || !Number.isFinite(amount) || amount <= 0) return
    await registerCashMovement({
      type: newMovement.type,
      description: newMovement.description,
      amount
    })
    setNewMovement({ type: 'adjustment', description: '', amount: '' })
    await fetchCashMovements(cashSession.id)
    await fetchXCut()
    await fetchFinancialSummary()
  }

  const renderCxc = () => (
    <section className="finance-receivables-section" aria-label="Lista de cuentas por cobrar">
      <header className="finance-receivables-header">
        <div>
          <h2>Cuentas por cobrar</h2>
          <p>Gestiona deudas activas y pagos por cliente.</p>
        </div>
        <button type="button" onClick={() => navigate('/finance/new-receivable')}>+ Nueva deuda</button>
      </header>

      <div className="finance-receivables-list">
      {receivables.length === 0 && (
        <article className="finance-receivable-card finance-receivable-card--empty">
          <p className="finance-empty">Sin cuentas por cobrar.</p>
        </article>
      )}

      {receivables.map((row) => {
        const isPaid = row.status === 'paid'
        const isOverdue = isReceivableOverdue(row)
        const statusVariant = isPaid ? 'paid' : (isOverdue ? 'overdue' : 'pending')
        const statusLabel = isPaid ? 'Pagado' : (isOverdue ? 'Vencido' : 'Pendiente')
        const linkedClientId = row.client_id || row.finance_customers?.id || null
        const linkedClientName = row.finance_customers?.name || row.client_name || 'Cliente sin nombre'

        return (
          <article key={row.id} className="finance-receivable-card">
            <div className="finance-receivable-card__top">
              <div className="finance-receivable-card__meta">
                <h3>{linkedClientName}</h3>
                <p>{row.concept || 'Sin concepto'}</p>
                <span>Vence: {formatShortDate(row.due_date)}</span>
              </div>

              <div className="finance-receivable-card__amount-wrap">
                <p className="finance-receivable-card__amount">{formatMoney(row.amount)}</p>
                <span className={`finance-status finance-status--${statusVariant}`}>{statusLabel}</span>
              </div>
            </div>

            <div className="finance-receivable-card__actions">
              <button
                type="button"
                disabled={isPaid}
                onClick={async () => {
                  const total = Number(row.amount || 0)
                  const remaining = row.status === 'paid' ? 0 : total
                  const rawAmount = window.prompt('Monto a registrar', String(remaining.toFixed(2)))
                  if (rawAmount == null) return
                  const amount = Number(rawAmount)
                  if (!Number.isFinite(amount) || amount <= 0) return
                  const method = window.prompt('Metodo de pago (cash/card/transfer)', 'cash') || 'cash'
                  try {
                    await registerReceivablePayment(row.id, { amount, payment_method: method })
                    await fetchReceivables()
                    await fetchFinancialSummary()
                    await fetchCashSession()
                  } catch (error) {
                    window.alert(error?.message || 'No se pudo registrar el pago.')
                  }
                }}
              >
                Registrar pago
              </button>
              <button
                type="button"
                className="finance-receivable-card__detail-btn"
                onClick={() => navigate(`/finance/receivables/${row.id}`)}
              >
                Ver detalle
              </button>
              {linkedClientId && (
                <button
                  type="button"
                  className="finance-receivable-card__detail-btn"
                  onClick={() => navigate(`/clientes/${linkedClientId}`)}
                >
                  Ver cliente
                </button>
              )}
            </div>
          </article>
        )
      })}
      </div>
    </section>
  )

  const renderCaja = () => (
    <section className="finance-grid finance-grid--cash">
      <article className="finance-card finance-card--block">
        <h3>Estado de caja</h3>
        <p className="finance-subtle">{cashSession?.status === 'open' ? 'Caja abierta' : 'Caja cerrada'}</p>
        {cashSession?.status === 'open' ? (
          <div className="finance-inline-stats">
            <span>Apertura: {formatMoney(cashSession.opening_amount)}</span>
            <span>Actual: {formatMoney(cashXCut?.currentBalance)}</span>
          </div>
        ) : (
          <p className="finance-subtle">No hay una sesión activa.</p>
        )}
        <div className="finance-actions">
          <button type="button" onClick={openAmount} disabled={cashSession?.status === 'open'}>Abrir caja</button>
          <button type="button" onClick={fetchXCut} disabled={!cashSession?.id}>Ver corte X</button>
          <button type="button" onClick={handleCutZ} disabled={!cashSession?.id}>Realizar corte Z</button>
        </div>
      </article>

      <article className="finance-card finance-card--block">
        <h3>Registrar movimiento</h3>
        <form className="finance-form" onSubmit={handleRegisterMovement}>
          <select value={newMovement.type} onChange={(e) => setNewMovement((p) => ({ ...p, type: e.target.value }))}>
            <option value="sale">Venta</option>
            <option value="expense">Gasto</option>
            <option value="adjustment">Ajuste</option>
          </select>
          <input
            type="text"
            placeholder="Descripción"
            value={newMovement.description}
            onChange={(e) => setNewMovement((p) => ({ ...p, description: e.target.value }))}
          />
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Monto"
            value={newMovement.amount}
            onChange={(e) => setNewMovement((p) => ({ ...p, amount: e.target.value }))}
          />
          <button type="submit" disabled={!cashSession?.id}>Registrar movimiento</button>
        </form>
      </article>

      <article className="finance-card finance-card--block finance-card--wide">
        <h3>Movimientos de caja</h3>
        <table className="finance-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Monto</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {cashMovements.length === 0 && (
              <tr>
                <td colSpan={5} className="finance-empty">Sin movimientos en la sesión.</td>
              </tr>
            )}
            {cashMovements.map((m) => (
              <tr key={m.id}>
                <td>{String(m.created_at || '').replace('T', ' ').slice(0, 16)}</td>
                <td>{m.type}</td>
                <td>{m.description || '-'}</td>
                <td>{formatMoney(m.amount)}</td>
                <td>{m.user_name || m.user_id || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  )

  const renderCortes = () => (
    <section className="finance-card finance-card--block finance-card--wide">
      <h3>Historial de cortes</h3>
      <table className="finance-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Monto</th>
            <th>Descripción</th>
          </tr>
        </thead>
        <tbody>
          {cashMovements.length === 0 && (
            <tr>
              <td colSpan={4} className="finance-empty">Sin historial disponible.</td>
            </tr>
          )}
          {cashMovements.map((m) => (
            <tr key={m.id}>
              <td>{String(m.created_at || '').replace('T', ' ').slice(0, 16)}</td>
              <td>{m.type || 'corte'}</td>
              <td>{formatMoney(m.amount)}</td>
              <td>{m.description || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )

  const handleExportCsv = () => {
    const rows = [
      ['fecha', 'tipo', 'descripcion', 'monto'],
      ...(cashMovements || []).map((m) => [
        String(m.created_at || '').replace('T', ' ').slice(0, 16),
        m.type || '',
        m.description || '',
        String(Number(m.amount || 0).toFixed(2))
      ])
    ]

    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `finanzas_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const renderExportar = () => (
    <section className="finance-card finance-card--block">
      <h3>Exportar datos financieros</h3>
      <p className="finance-subtle">Descarga los movimientos financieros actuales en formato CSV.</p>
      <div className="finance-actions">
        <button type="button" onClick={handleExportCsv}>Exportar CSV</button>
      </div>
    </section>
  )

  const filteredCards = HUB_CARDS.filter((card) => {
    const q = quickSearch.trim().toLowerCase()
    if (!q) return true
    return card.title.toLowerCase().includes(q) || card.description.toLowerCase().includes(q)
  })

  const renderHub = () => (
    <>
      <div className="finance-quick-search">
        <FaSearch className="finance-quick-search__icon" />
        <input
          type="text"
          value={quickSearch}
          onChange={(e) => setQuickSearch(e.target.value)}
          placeholder="Buscar modulo o reporte financiero..."
          aria-label="Busqueda rapida financiera"
        />
      </div>

      <section className="finance-hub-grid">
        {filteredCards.map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.id}
              type="button"
              className="finance-hub-card"
              onClick={() => navigate(card.to)}
            >
              <Icon className="finance-hub-card__icon" />
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </button>
          )
        })}
      </section>

      <section className="finance-hub-actions">
        <button type="button" onClick={() => navigate('/cash-register/movimientos')}>
          Ver movimientos <FaArrowRight />
        </button>
        <button type="button" onClick={() => navigate('/cash-register/gastos')}>
          Registrar gasto <FaArrowRight />
        </button>
        <button type="button" onClick={() => navigate('/cash-register/ingresos')}>
          Registrar ingreso <FaArrowRight />
        </button>
      </section>
    </>
  )

  return (
    <div className="finance-page">
      <header className="finance-header">
        <div>
          <h1>Finanzas</h1>
          <p>Gestion financiera integral del negocio</p>
        </div>
        {activeSection !== 'home' && (
          <div className="finance-actions">
            <button type="button" onClick={() => navigate('/finance')}>Volver al hub</button>
          </div>
        )}
      </header>

      {loading && activeSection !== 'home' ? (
        <div className="finance-loading">Cargando datos financieros...</div>
      ) : (
        <>
          {activeSection === 'home' && renderHub()}
          {activeSection === 'receivables' && renderCxc()}
          {activeSection === 'cuts' && renderCortes()}
          {activeSection === 'export' && renderExportar()}
          {activeSection === 'reports' && (
            <section className="finance-card finance-card--block">
              <h3>Reportes</h3>
              <p className="finance-subtle">Seccion movida a la vista analitica completa.</p>
              <div className="finance-actions">
                <button type="button" onClick={() => navigate('/finance/reports')}>Abrir reportes</button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

export default Finance
