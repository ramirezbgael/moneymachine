import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useReportsStore } from '../../store/reportsStore'
import './Finance.css'

const SECTIONS = [
  { id: 'resumen', label: 'Resumen financiero' },
  { id: 'cxc', label: 'Cuentas por cobrar' },
  { id: 'caja', label: 'Caja' },
  { id: 'reportes', label: 'Reportes' }
]

const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`

const Finance = () => {
  const navigate = useNavigate()
  const { sectionId } = useParams()
  const activeSection = sectionId || 'resumen'

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
    registerReceivablePayment,
    markReceivableAsPaid
  } = useReportsStore()

  const [newMovement, setNewMovement] = useState({ type: 'adjustment', description: '', amount: '' })

  useEffect(() => {
    fetchFinancialSummary()
    fetchReceivables()
    fetchCashSession()
  }, [
    fetchFinancialSummary,
    fetchReceivables,
    fetchCashSession
  ])

  useEffect(() => {
    if (cashSession?.id) {
      fetchCashMovements(cashSession.id)
      fetchXCut()
    }
  }, [cashSession?.id, fetchCashMovements, fetchXCut])

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

  const renderResumen = () => (
    <section className="finance-grid finance-grid--summary">
      <article className="finance-card">
        <h3>Ingresos hoy</h3>
        <p>{formatMoney(financialSummary?.todayIncome)}</p>
      </article>
      <article className="finance-card">
        <h3>Ingresos del mes</h3>
        <p>{formatMoney(financialSummary?.monthIncome)}</p>
      </article>
      <article className="finance-card">
        <h3>Cuentas por cobrar</h3>
        <p>{formatMoney(financialSummary?.receivablesTotal)}</p>
      </article>
      <article className="finance-card">
        <h3>Caja actual</h3>
        <p>{formatMoney(financialSummary?.currentCash)}</p>
      </article>
    </section>
  )

  const renderCxc = () => (
    <section className="finance-table-wrap">
      <table className="finance-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Concepto</th>
            <th>Monto</th>
            <th>Fecha</th>
            <th>Fecha de vencimiento</th>
            <th>Estado</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {receivables.length === 0 && (
            <tr>
              <td colSpan={7} className="finance-empty">Sin cuentas por cobrar.</td>
            </tr>
          )}
          {receivables.map((row) => (
            <tr key={row.id}>
              <td>{row.client_name}</td>
              <td>{row.concept}</td>
              <td>{formatMoney(row.amount)}</td>
              <td>{String(row.created_at || '').slice(0, 10)}</td>
              <td>{String(row.due_date || '').slice(0, 10)}</td>
              <td>
                <span className={`finance-status finance-status--${row.status === 'paid' ? 'paid' : 'pending'}`}>
                  {row.status === 'paid' ? 'Pagado' : 'Pendiente'}
                </span>
              </td>
              <td>
                <div className="finance-actions">
                  <button type="button" onClick={() => markReceivableAsPaid(row.id)} disabled={row.status === 'paid'}>
                    Marcar pagado
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      window.alert(
                        `Cliente: ${row.client_name}\nConcepto: ${row.concept}\nMonto: ${formatMoney(row.amount)}\nVence: ${String(row.due_date || '').slice(0, 10)}`
                      )
                    }}
                  >
                    Ver detalle
                  </button>
                  <button
                    type="button"
                    disabled={row.status === 'paid'}
                    onClick={async () => {
                      const rawAmount = window.prompt('Monto a registrar', String(row.amount || 0))
                      if (rawAmount == null) return
                      const amount = Number(rawAmount)
                      if (!Number.isFinite(amount) || amount <= 0) return
                      const method = window.prompt('Metodo de pago (cash/card/transfer)', 'cash') || 'cash'
                      await registerReceivablePayment(row.id, { amount, payment_method: method })
                      await fetchReceivables()
                      await fetchFinancialSummary()
                      await fetchCashSession()
                    }}
                  >
                    Registrar pago
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

  return (
    <div className="finance-page">
      <header className="finance-header">
        <div>
          <h1>Finanzas</h1>
          <p>Gestion financiera integral: resumen, cuentas por cobrar, caja y reportes.</p>
        </div>
      </header>

      <nav className="finance-tabs">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className={activeSection === section.id ? 'is-active' : ''}
            onClick={() => navigate(section.id === 'reportes' ? '/finanzas/reportes' : `/finanzas/${section.id}`)}
          >
            {section.label}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="finance-loading">Cargando datos financieros...</div>
      ) : (
        <>
          {activeSection === 'resumen' && renderResumen()}
          {activeSection === 'cxc' && renderCxc()}
          {activeSection === 'caja' && renderCaja()}
          {activeSection === 'reportes' && (
            <section className="finance-card finance-card--block">
              <h3>Reportes</h3>
              <p className="finance-subtle">Seccion movida a la vista analitica completa.</p>
              <div className="finance-actions">
                <button type="button" onClick={() => navigate('/finanzas/reportes')}>Abrir reportes</button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

export default Finance
