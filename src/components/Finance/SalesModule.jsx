import React, { useEffect, useState, useCallback } from 'react'
import { FaSearch, FaSync, FaUndo, FaBan, FaExclamationTriangle } from 'react-icons/fa'
import { getSales, cancelSale, refundSale } from '../../services/saleService'
import { useAuthStore } from '../../store/authStore'

const fmt = (v) => `$${Number(v || 0).toFixed(2)}`

const fmtDate = (v) => {
  if (!v) return '-'
  return new Date(v).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_CFG = {
  pending:   { label: 'Pendiente',  variant: 'pending' },
  completed: { label: 'Completada', variant: 'paid' },
  cancelled: { label: 'Cancelada',  variant: 'cancelled' },
}

const PAYMENT_LABEL = {
  cash:     'Efectivo',
  card:     'Tarjeta',
  transfer: 'Transferencia',
}

const FILTERS = [
  { id: 'all',       label: 'Todas' },
  { id: 'pending',   label: 'Pendientes' },
  { id: 'completed', label: 'Completadas' },
  { id: 'cancelled', label: 'Canceladas' },
]

const ConfirmModal = ({ confirm, onConfirm, onCancel, loading, error }) => {
  if (!confirm) return null
  const isRefund = confirm.type === 'refund'
  const { sale } = confirm

  return (
    <div className="fsales-overlay" role="dialog" aria-modal="true" aria-labelledby="fsales-modal-title">
      <div className="fsales-modal">
        <div className={`fsales-modal__icon ${isRefund ? 'fsales-modal__icon--refund' : 'fsales-modal__icon--cancel'}`}>
          <FaExclamationTriangle />
        </div>

        <h3 id="fsales-modal-title">
          {isRefund ? 'Confirmar reembolso' : 'Confirmar cancelación'}
        </h3>

        <p className="fsales-modal__desc">
          {isRefund ? (
            <>
              ¿Reembolsar la venta <strong>{sale.sale_number}</strong> por{' '}
              <strong>{fmt(sale.total)}</strong>?{' '}
              Se revertirá el inventario y se registrará una salida en caja si fue efectivo.
            </>
          ) : (
            <>
              ¿Cancelar la venta pendiente <strong>{sale.sale_number}</strong> por{' '}
              <strong>{fmt(sale.total)}</strong>?{' '}
              Esta acción no se puede deshacer.
            </>
          )}
        </p>

        {error && <p className="fsales-modal__error">{error}</p>}

        <div className="fsales-modal__actions">
          <button type="button" onClick={onCancel} disabled={loading} className="fsales-modal__back">
            Volver
          </button>
          <button
            type="button"
            className={`fsales-modal__confirm ${isRefund ? 'fsales-modal__confirm--refund' : 'fsales-modal__confirm--cancel'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Procesando...' : isRefund ? 'Sí, reembolsar' : 'Sí, cancelar'}
          </button>
        </div>
      </div>
    </div>
  )
}

const itemCount = (sale) => {
  const items = sale.sale_items || sale.items || []
  return items.reduce((sum, i) => sum + (i.quantity || 0), 0)
}

const SalesModule = () => {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState(null)

  const userId = useAuthStore.getState().user?.id ?? null

  const loadSales = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getSales(200)
      setSales(data || [])
    } catch (e) {
      setError(e?.message || 'Error al cargar ventas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSales()
  }, [loadSales])

  const counts = {
    all:       sales.length,
    pending:   sales.filter((s) => s.status === 'pending').length,
    completed: sales.filter((s) => s.status === 'completed').length,
    cancelled: sales.filter((s) => s.status === 'cancelled').length,
  }

  const filtered = sales.filter((s) => {
    if (filter !== 'all' && s.status !== filter) return false
    if (search.trim()) {
      return (s.sale_number || '').toLowerCase().includes(search.trim().toLowerCase())
    }
    return true
  })

  const handleAction = async () => {
    if (!confirm) return
    setActionLoading(true)
    setActionError(null)
    try {
      if (confirm.type === 'cancel') {
        await cancelSale({ saleId: confirm.sale.id, userId })
      } else {
        await refundSale({ saleId: confirm.sale.id, userId })
      }
      setConfirm(null)
      await loadSales()
    } catch (e) {
      setActionError(e?.message || 'Error al procesar la acción')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <section className="finance-receivables-section fsales" aria-label="Historial de ventas">
      <header className="finance-receivables-header">
        <div>
          <h2>Ventas</h2>
          <p>Historial de ventas, cancelaciones y reembolsos.</p>
        </div>
        <button
          type="button"
          className="fsales-refresh-btn"
          onClick={loadSales}
          disabled={loading}
          aria-label="Actualizar lista de ventas"
        >
          <FaSync className={loading ? 'fsales-spin' : ''} />
          Actualizar
        </button>
      </header>

      <div className="fsales-toolbar">
        <div className="finance-tabs">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={filter === f.id ? 'is-active' : ''}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              {counts[f.id] > 0 && (
                <span className="fsales-count-badge">{counts[f.id]}</span>
              )}
            </button>
          ))}
        </div>

        <div className="fsales-search">
          <FaSearch className="fsales-search__icon" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número de venta..."
            aria-label="Buscar venta"
          />
        </div>
      </div>

      {loading && (
        <div className="finance-loading">Cargando ventas...</div>
      )}

      {!loading && error && (
        <div className="finance-loading fsales-error">{error}</div>
      )}

      {!loading && !error && (
        <div className="finance-table-wrap">
          <table className="finance-table fsales-table">
            <thead>
              <tr>
                <th># Venta</th>
                <th>Fecha</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>Descuento</th>
                <th>Total</th>
                <th>Método de pago</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="finance-empty fsales-empty-cell">
                    Sin ventas que coincidan con el filtro.
                  </td>
                </tr>
              )}

              {filtered.map((sale) => {
                const cfg = STATUS_CFG[sale.status] ?? { label: sale.status, variant: 'pending' }
                const canCancel = sale.status === 'pending'
                const canRefund = sale.status === 'completed'

                return (
                  <tr key={sale.id} className={sale.status === 'cancelled' ? 'fsales-row--cancelled' : ''}>
                    <td className="fsales-sale-number">{sale.sale_number || `#${sale.id}`}</td>
                    <td className="fsales-date">{fmtDate(sale.created_at)}</td>
                    <td className="fsales-center">{itemCount(sale)}</td>
                    <td>{fmt(sale.subtotal)}</td>
                    <td className={sale.discount > 0 ? 'fsales-discount' : 'fsales-muted'}>
                      {sale.discount > 0 ? `-${fmt(sale.discount)}` : '—'}
                    </td>
                    <td className="fsales-total">{fmt(sale.total)}</td>
                    <td className="fsales-muted">{PAYMENT_LABEL[sale.payment_method] || sale.payment_method || '—'}</td>
                    <td>
                      <span className={`finance-status finance-status--${cfg.variant}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td>
                      <div className="fsales-action-btns">
                        {canCancel && (
                          <button
                            type="button"
                            className="fsales-btn fsales-btn--cancel"
                            onClick={() => setConfirm({ type: 'cancel', sale })}
                          >
                            <FaBan />
                            Cancelar
                          </button>
                        )}
                        {canRefund && (
                          <button
                            type="button"
                            className="fsales-btn fsales-btn--refund"
                            onClick={() => setConfirm({ type: 'refund', sale })}
                          >
                            <FaUndo />
                            Reembolsar
                          </button>
                        )}
                        {!canCancel && !canRefund && (
                          <span className="fsales-muted">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        confirm={confirm}
        onConfirm={handleAction}
        onCancel={() => {
          setConfirm(null)
          setActionError(null)
        }}
        loading={actionLoading}
        error={actionError}
      />
    </section>
  )
}

export default SalesModule
