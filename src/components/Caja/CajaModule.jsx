import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FaCashRegister, FaArrowsAltV, FaReceipt, FaHistory, FaMinusCircle, FaPlusCircle } from 'react-icons/fa'
import { useReportsStore } from '../../store/reportsStore'
import './CajaModule.css'

const DEFAULT_OPENING_KEY = 'caja:default-opening-amount'
const CASH_SESSIONS_KEY = 'finance:cash_sessions'
const HISTORY_CLARIFICATIONS_KEY = 'finance:cash_clarifications'

const ACTIONS = [
  {
    id: 'apertura',
    title: 'Abrir caja',
    description: 'Iniciar una nueva sesion de caja para comenzar a registrar ventas.',
    icon: FaCashRegister
  },
  {
    id: 'movimientos',
    title: 'Movimientos de caja',
    description: 'Registrar ingresos o retiros de efectivo manuales.',
    icon: FaArrowsAltV
  },
  {
    id: 'corte',
    title: 'Corte de caja',
    description: 'Contar el dinero fisico y cerrar la caja del dia.',
    icon: FaReceipt
  },
  {
    id: 'historial',
    title: 'Historial de cortes',
    description: 'Revisar cierres de caja anteriores.',
    icon: FaHistory
  },
  {
    id: 'gastos',
    title: 'Registro de gastos',
    description: 'Registrar gastos pagados en efectivo.',
    icon: FaMinusCircle
  },
  {
    id: 'ingresos',
    title: 'Registro de ingresos',
    description: 'Registrar ingresos adicionales no provenientes de ventas.',
    icon: FaPlusCircle
  }
]

const ACTION_ALIASES = {
  'cierre-caja': 'corte',
  'cierre-turno': 'corte',
  'cierre-dia': 'corte'
}

const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`
const formatTime = (isoValue) => {
  if (!isoValue) return '--:--'
  const date = new Date(isoValue)
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

const formatDateTime = (isoValue) => {
  if (!isoValue) return '-'
  const date = new Date(isoValue)
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatElapsed = (startIso, now) => {
  if (!startIso) return '--'
  const startMs = new Date(startIso).getTime()
  if (!Number.isFinite(startMs)) return '--'
  const diffMinutes = Math.max(0, Math.floor((now - startMs) / 60000))
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`
}

export default function CajaModule() {
  const navigate = useNavigate()
  const { action } = useParams()
  const normalizedAction = ACTION_ALIASES[action] || action || null

  const {
    cashSession,
    cashSessionsHistory,
    cashXCut,
    cashMovements,
    financialSummary,
    monthlySummary,
    loading,
    fetchCashSession,
    fetchCashSessionsHistory,
    fetchCashMovements,
    fetchXCut,
    fetchMonthlySummary,
    fetchFinancialSummary,
    openCashSession,
    closeCashSessionZ,
    registerCashMovement
  } = useReportsStore()

  const [openingAmount, setOpeningAmount] = useState('0')
  const [defaultOpeningAmount, setDefaultOpeningAmount] = useState('0')
  const [countedCash, setCountedCash] = useState('0')
  const [confirmCash, setConfirmCash] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showMovementForm, setShowMovementForm] = useState(false)
  const [movementType, setMovementType] = useState('income')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementDescription, setMovementDescription] = useState('')
  const [nowMs, setNowMs] = useState(Date.now())
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showClosingPanel, setShowClosingPanel] = useState(false)
  const [showOpeningInput, setShowOpeningInput] = useState(false)
  const [activeQuickPanel, setActiveQuickPanel] = useState(null)
  const [showDifferenceNote, setShowDifferenceNote] = useState(false)
  const [differenceNote, setDifferenceNote] = useState('')
  const [historyClarifications, setHistoryClarifications] = useState({})
  const [editingClarificationId, setEditingClarificationId] = useState(null)
  const [clarificationDraft, setClarificationDraft] = useState('')
  const expenseAmountInputRef = useRef(null)
  const incomeAmountInputRef = useRef(null)
  const closingAmountInputRef = useRef(null)

  const currentAction = ACTIONS.find((item) => item.id === normalizedAction) || null

  const closedSessions = useMemo(() => {
    return (cashSessionsHistory || [])
      .filter((session) => session.status === 'closed')
      .sort((a, b) => String(b.closed_at || '').localeCompare(String(a.closed_at || '')))
  }, [cashSessionsHistory])

  const paymentMethods = monthlySummary?.paymentMethods || []
  const cardTotal = paymentMethods.find((method) => /card|tarjeta/i.test(String(method.name || '')))?.value || 0
  const transferTotal = paymentMethods.find((method) => /transfer|transferencia/i.test(String(method.name || '')))?.value || 0
  const expectedCash = Number(cashXCut?.currentBalance || 0)
  const countedCashNumber = Number(countedCash || 0)
  const difference = countedCashNumber - expectedCash
  const latestClosedSession = closedSessions[0] || null
  const elapsedOpen = formatElapsed(cashSession?.opened_at, nowMs)
  const manualMovementsTotal = useMemo(() => {
    return (cashMovements || []).reduce((acc, movement) => {
      const amount = Number(movement.amount || 0)
      if (movement.type === 'expense') return acc - amount
      return acc + amount
    }, 0)
  }, [cashMovements])
  const primaryActions = ACTIONS.filter((item) => ['apertura', 'movimientos', 'corte'].includes(item.id))
  const secondaryActions = ACTIONS.filter((item) => ['historial', 'gastos', 'ingresos'].includes(item.id))

  useEffect(() => {
    const stored = localStorage.getItem(DEFAULT_OPENING_KEY)
    if (stored !== null) {
      setDefaultOpeningAmount(stored)
      setOpeningAmount(stored)
    }
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_CLARIFICATIONS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && typeof parsed === 'object') {
          setHistoryClarifications(parsed)
        }
      }
    } catch {
      setHistoryClarifications({})
    }
  }, [])

  useEffect(() => {
    fetchCashSession()
    fetchCashSessionsHistory()
    fetchFinancialSummary()
    fetchMonthlySummary()
  }, [fetchCashSession, fetchCashSessionsHistory, fetchFinancialSummary, fetchMonthlySummary])

  useEffect(() => {
    if (cashSession?.id) {
      fetchCashMovements(cashSession.id)
      fetchXCut()
      setCountedCash(String(Number(cashXCut?.currentBalance || 0).toFixed(2)))
    }
  }, [cashSession?.id, fetchCashMovements, fetchXCut])

  useEffect(() => {
    if (normalizedAction === 'gastos') {
      setMovementType('expense')
    } else if (normalizedAction === 'ingresos') {
      setMovementType('income')
    }
  }, [normalizedAction])

  useEffect(() => {
    if (normalizedAction === 'corte') {
      setCountedCash(String(Number(expectedCash).toFixed(2)))
    }
  }, [normalizedAction, expectedCash])

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (activeQuickPanel === 'expense') {
      setTimeout(() => expenseAmountInputRef.current?.focus(), 120)
    }
    if (activeQuickPanel === 'income') {
      setTimeout(() => incomeAmountInputRef.current?.focus(), 120)
    }
  }, [activeQuickPanel])

  useEffect(() => {
    if (showClosingPanel && cashSession?.id) {
      setTimeout(() => closingAmountInputRef.current?.focus(), 120)
    }
  }, [showClosingPanel, cashSession?.id])

  const canConfirmClosure = useMemo(() => {
    if (!cashSession?.id) return false
    if (!Number.isFinite(countedCashNumber) || countedCashNumber < 0) return false
    return confirmCash
  }, [cashSession?.id, countedCashNumber, confirmCash])

  const canSubmitMovement = useMemo(() => {
    const amount = Number(movementAmount || 0)
    return Boolean(cashSession?.id) && Number.isFinite(amount) && amount > 0 && movementDescription.trim().length > 1
  }, [cashSession?.id, movementAmount, movementDescription])

  const saveDefaultOpening = () => {
    localStorage.setItem(DEFAULT_OPENING_KEY, defaultOpeningAmount)
    setOpeningAmount(defaultOpeningAmount)
    setSuccess('Monto inicial predeterminado guardado.')
    setError('')
  }

  const handleOpenCash = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const amount = Number(openingAmount)
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Ingresa un monto inicial valido.')
      return
    }

    if (cashSession?.id) {
      setError('Ya existe una caja abierta. Cierra la sesion antes de abrir otra.')
      return
    }

    setSubmitting(true)
    try {
      await openCashSession(amount)
      await fetchCashSession()
      await fetchXCut()
      await fetchFinancialSummary()
      setSuccess('Caja abierta correctamente.')
    } catch {
      setError('No se pudo abrir la caja.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!cashSession?.id) {
      setError('No hay una caja abierta para cerrar.')
      return
    }

    if (!Number.isFinite(countedCashNumber) || countedCashNumber < 0) {
      setError('Ingresa un conteo de efectivo valido.')
      return
    }

    if (!confirmCash) {
      setError('Confirma que el efectivo fue contado manualmente.')
      return
    }

    setSubmitting(true)
    try {
      if (Math.abs(difference) >= 0.01) {
        const noteSuffix = differenceNote.trim() ? ` | Aclaracion: ${differenceNote.trim()}` : ''
        if (difference > 0) {
          await registerCashMovement({
            type: 'adjustment',
            description: `Ajuste detectado en corte de caja${noteSuffix}`,
            amount: Math.abs(difference)
          })
        } else {
          await registerCashMovement({
            type: 'expense',
            description: `Faltante detectado en ${action}${noteSuffix}`,
            amount: Math.abs(difference)
          })
        }
      }

      await closeCashSessionZ(countedCashNumber)
      await fetchCashSession()
      await fetchCashSessionsHistory()
      await fetchFinancialSummary()
      setSuccess('Caja cerrada correctamente')
      setConfirmCash(false)
      setShowClosingPanel(false)
      setShowDifferenceNote(false)
      setDifferenceNote('')
    } catch {
      setError('No se pudo registrar el cierre.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRegisterMovement = async (e) => {
    e.preventDefault()
    if (!canSubmitMovement) return

    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const amount = Number(movementAmount || 0)
      const mappedType = movementType === 'expense' ? 'expense' : 'adjustment'
      await registerCashMovement({
        type: mappedType,
        description: movementDescription.trim(),
        amount
      })
      await fetchCashMovements(cashSession?.id)
      await fetchXCut()
      await fetchFinancialSummary()
      setMovementAmount('')
      setMovementDescription('')
      setShowMovementForm(false)
      setSuccess('Movimiento registrado correctamente.')
    } catch {
      setError('No se pudo registrar el movimiento.')
    } finally {
      setSubmitting(false)
    }
  }

  const startClarificationEdit = (sessionId, currentNote = '') => {
    setEditingClarificationId(sessionId)
    setClarificationDraft(currentNote)
    setError('')
  }

  const cancelClarificationEdit = () => {
    setEditingClarificationId(null)
    setClarificationDraft('')
  }

  const saveClarificationNote = (sessionId) => {
    const nextNote = clarificationDraft.trim()
    const nextClarifications = {
      ...historyClarifications,
      [sessionId]: nextNote
    }

    if (!nextNote) {
      delete nextClarifications[sessionId]
    }

    setHistoryClarifications(nextClarifications)
    localStorage.setItem(HISTORY_CLARIFICATIONS_KEY, JSON.stringify(nextClarifications))
    setEditingClarificationId(null)
    setClarificationDraft('')
    setSuccess(nextNote ? 'Aclaracion guardada para este corte.' : 'Aclaracion eliminada.')
  }

  const renderStatusCard = () => (
    <section className="caja-module__status">
      <article className={`caja-module__status-card ${cashSession?.id ? 'is-open' : 'is-closed'}`}>
        <div className="caja-module__status-top">
          <div className="caja-module__status-main">
            <span className="caja-module__status-label">Caja actual</span>
            <strong className={cashSession?.id ? 'is-open' : 'is-closed'}>{cashSession?.id ? 'Caja abierta' : 'Caja cerrada'}</strong>

            <div className="caja-module__status-grid">
              <div><span>Estado</span><strong>{cashSession?.id ? 'Abierta' : 'Cerrada'}</strong></div>
              <div><span>Ventas del dia</span><strong>{formatMoney(financialSummary?.todayIncome || 0)}</strong></div>
              <div><span>Efectivo esperado</span><strong>{formatMoney(expectedCash)}</strong></div>
              <div><span>Tarjeta</span><strong>{formatMoney(cardTotal)}</strong></div>
              <div><span>Transferencias</span><strong>{formatMoney(transferTotal)}</strong></div>
              <div><span>Ultimo corte</span><strong>{formatDateTime(latestClosedSession?.closed_at)}</strong></div>
            </div>

            {cashSession?.id && (
              <div className="caja-module__session-info">
                <span>Caja abierta desde: <strong>{formatTime(cashSession.opened_at)}</strong></span>
                <span>Tiempo abierta: <strong>{elapsedOpen}</strong></span>
              </div>
            )}

            {!cashSession?.id ? (
              <form className="caja-module__inline-action" onSubmit={handleOpenCash}>
                <label>
                  Monto inicial
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                  />
                </label>
                <button type="submit" className="caja-module__primary-action caja-module__primary-action--open" disabled={submitting}>
                  {submitting ? 'Abriendo...' : 'Abrir caja'}
                </button>
              </form>
            ) : (
              <div className="caja-module__inline-action caja-module__inline-action--cut">
                <label>
                  Conteo efectivo para corte
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                  />
                </label>

                <div className="caja-module__inline-cut-info">
                  <span>Diferencia: <strong>{difference > 0 ? '+' : ''}{formatMoney(difference)}</strong></span>
                  <label className="caja-module__checkbox">
                    <input type="checkbox" checked={confirmCash} onChange={(e) => setConfirmCash(e.target.checked)} />
                    Confirmo conteo manual
                  </label>
                </div>

                <button
                  type="button"
                  className="caja-module__primary-action caja-module__primary-action--cut"
                  onClick={async () => {
                    await handleClose({ preventDefault: () => {} })
                  }}
                  disabled={submitting || !canConfirmClosure}
                >
                  {submitting ? 'Cerrando...' : 'Realizar corte de caja'}
                </button>
              </div>
            )}
          </div>
        </div>
      </article>
    </section>
  )

  const renderFinancialSummary = () => (
    <section className="caja-module__financial-summary">
      <article>
        <span>Ventas totales</span>
        <strong>{formatMoney(financialSummary?.todayIncome || 0)}</strong>
      </article>
      <article>
        <span>Efectivo</span>
        <strong>{formatMoney(expectedCash)}</strong>
      </article>
      <article>
        <span>Tarjeta</span>
        <strong>{formatMoney(cardTotal)}</strong>
      </article>
      <article>
        <span>Transferencias</span>
        <strong>{formatMoney(transferTotal)}</strong>
      </article>
      <article>
        <span>Movimientos manuales</span>
        <strong>{formatMoney(manualMovementsTotal)}</strong>
      </article>
    </section>
  )

  const renderActionCards = (list, variant) => (
    <section className={`caja-module__routes caja-module__routes--${variant}`}>
      {list.map((cfg) => {
        const Icon = cfg.icon
        const highlighted = (!cashSession?.id && cfg.id === 'apertura') || (cashSession?.id && cfg.id === 'corte')
        const shouldOpenInline = cfg.id === 'apertura' || cfg.id === 'corte'

        return (
          <button
            key={cfg.id}
            type="button"
            className={`caja-module__route-card ${variant === 'primary' ? 'is-primary' : 'is-secondary'} ${highlighted ? 'is-highlighted' : ''}`}
            onClick={() => {
              if (cfg.id === 'apertura' && !cashSession?.id) {
                document.querySelector('.caja-module__inline-action input')?.focus()
                return
              }
              if (cfg.id === 'corte' && cashSession?.id) {
                document.querySelector('.caja-module__inline-action--cut input')?.focus()
                return
              }
              if (shouldOpenInline) return
              navigate(`/cash-register/${cfg.id}`)
            }}
          >
            <Icon className="caja-module__route-icon" />
            <h3>{cfg.title}</h3>
            <p>{cfg.description}</p>
          </button>
        )
      })}
    </section>
  )

  const renderHome = () => (
    <div className="caja-dashboard">

      {/* ── 1. Status ── */}
      <section className="caja-stat-section">
        <div className="caja-stat-badge">
          <span className={`caja-stat-dot ${cashSession?.id ? 'caja-stat-dot--open' : 'caja-stat-dot--closed'}`} />
          <h2 className={`caja-stat-heading ${cashSession?.id ? 'caja-stat-heading--open' : 'caja-stat-heading--closed'}`}>
            {cashSession?.id ? 'Caja abierta' : 'Caja cerrada'}
          </h2>
        </div>

        <div className="caja-stat-meta">
          {cashSession?.id
            ? (
              <>
                <span>Desde: <strong>{formatTime(cashSession.opened_at)}</strong></span>
                <span>Tiempo abierta: <strong>{elapsedOpen}</strong></span>
              </>
            )
            : latestClosedSession && (
              <span>Último cierre: <strong>{formatDateTime(latestClosedSession.closed_at)}</strong></span>
            )}
        </div>

        {!cashSession?.id && !showOpeningInput && (
          <button type="button" className="caja-cta caja-cta--open" onClick={() => setShowOpeningInput(true)}>
            Abrir caja
          </button>
        )}

        {!cashSession?.id && showOpeningInput && (
          <form className="caja-open-form" onSubmit={handleOpenCash}>
            <label className="caja-open-form__label">
              Monto inicial
              <input
                type="number"
                min="0"
                step="0.01"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                className="caja-open-form__input"
              />
            </label>
            <div className="caja-open-form__actions">
              <button type="submit" className="caja-cta caja-cta--open" disabled={submitting}>
                {submitting ? 'Abriendo...' : 'Confirmar apertura'}
              </button>
              <button type="button" className="caja-ghost-btn" onClick={() => setShowOpeningInput(false)}>Cancelar</button>
            </div>
          </form>
        )}

        {cashSession?.id && !showClosingPanel && (
          <button
            type="button"
            className="caja-cta caja-cta--close"
            onClick={() => {
              setShowClosingPanel(true)
              setCountedCash(String(Number(expectedCash).toFixed(2)))
            }}
          >
            Cerrar caja
          </button>
        )}
      </section>

      {/* ── 2. Resumen del turno ── */}
      <section className="caja-summary-row">
        <article className="caja-summary-card">
          <span>Ventas del turno</span>
          <strong>{formatMoney(financialSummary?.todayIncome || 0)}</strong>
        </article>
        <article className="caja-summary-card">
          <span>Efectivo esperado</span>
          <strong>{formatMoney(expectedCash)}</strong>
        </article>
        <article className="caja-summary-card">
          <span>Tarjeta</span>
          <strong>{formatMoney(cardTotal)}</strong>
        </article>
        <article className="caja-summary-card">
          <span>Transferencias</span>
          <strong>{formatMoney(transferTotal)}</strong>
        </article>
      </section>

      {/* ── 3. Acciones rápidas ── */}
      <section className="caja-quick-actions">
        <button
          type="button"
          className={`caja-quick-btn ${activeQuickPanel === 'expense' ? 'is-active' : ''}`}
          onClick={() => {
            setActiveQuickPanel((current) => (current === 'expense' ? null : 'expense'))
            setMovementType('expense')
          }}
        >
          <FaMinusCircle className="caja-quick-btn__icon caja-quick-btn__icon--expense" />
          <span>Registrar gasto</span>
        </button>
        <button
          type="button"
          className={`caja-quick-btn ${activeQuickPanel === 'income' ? 'is-active' : ''}`}
          onClick={() => {
            setActiveQuickPanel((current) => (current === 'income' ? null : 'income'))
            setMovementType('income')
          }}
        >
          <FaPlusCircle className="caja-quick-btn__icon caja-quick-btn__icon--income" />
          <span>Registrar ingreso</span>
        </button>
        <button
          type="button"
          className={`caja-quick-btn ${activeQuickPanel === 'movements' ? 'is-active' : ''}`}
          onClick={() => {
            setActiveQuickPanel((current) => (current === 'movements' ? null : 'movements'))
            if (cashSession?.id) fetchCashMovements(cashSession.id)
          }}
        >
          <FaHistory className="caja-quick-btn__icon caja-quick-btn__icon--history" />
          <span>Ver movimientos</span>
        </button>
      </section>

      <section className="caja-quick-stack" aria-live="polite">
        <article className={`caja-quick-panel ${activeQuickPanel === 'expense' ? 'is-open' : ''}`}>
          <div className="caja-quick-panel__inner">
            <div className="caja-quick-panel__head">
              <h3>Registrar gasto</h3>
              <button type="button" className="caja-ghost-btn" onClick={() => setActiveQuickPanel(null)}>Cerrar</button>
            </div>
            <form className="caja-quick-form" onSubmit={handleRegisterMovement}>
              <label>
                Monto
                <input
                  ref={expenseAmountInputRef}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  disabled={!cashSession?.id}
                />
              </label>
              <label>
                Motivo
                <input
                  type="text"
                  placeholder="Describe el gasto"
                  value={movementDescription}
                  onChange={(e) => setMovementDescription(e.target.value)}
                  disabled={!cashSession?.id}
                />
              </label>
              <button type="submit" className="caja-cta caja-cta--confirm" disabled={submitting || !canSubmitMovement || !cashSession?.id}>
                {submitting ? 'Guardando...' : 'Guardar gasto'}
              </button>
              {!cashSession?.id && <p className="caja-module__message">Abre caja para registrar movimientos.</p>}
            </form>
          </div>
        </article>

        <article className={`caja-quick-panel ${activeQuickPanel === 'income' ? 'is-open' : ''}`}>
          <div className="caja-quick-panel__inner">
            <div className="caja-quick-panel__head">
              <h3>Registrar ingreso</h3>
              <button type="button" className="caja-ghost-btn" onClick={() => setActiveQuickPanel(null)}>Cerrar</button>
            </div>
            <form className="caja-quick-form" onSubmit={handleRegisterMovement}>
              <label>
                Monto
                <input
                  ref={incomeAmountInputRef}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  disabled={!cashSession?.id}
                />
              </label>
              <label>
                Motivo
                <input
                  type="text"
                  placeholder="Describe el ingreso"
                  value={movementDescription}
                  onChange={(e) => setMovementDescription(e.target.value)}
                  disabled={!cashSession?.id}
                />
              </label>
              <button type="submit" className="caja-cta caja-cta--confirm" disabled={submitting || !canSubmitMovement || !cashSession?.id}>
                {submitting ? 'Guardando...' : 'Guardar ingreso'}
              </button>
              {!cashSession?.id && <p className="caja-module__message">Abre caja para registrar movimientos.</p>}
            </form>
          </div>
        </article>

        <article className={`caja-quick-panel ${activeQuickPanel === 'movements' ? 'is-open' : ''}`}>
          <div className="caja-quick-panel__inner">
            <div className="caja-quick-panel__head">
              <h3>Movimientos recientes</h3>
              <button type="button" className="caja-ghost-btn" onClick={() => setActiveQuickPanel(null)}>Cerrar</button>
            </div>
            <div className="caja-quick-table-wrap">
              <table className="caja-quick-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Motivo</th>
                    <th>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {cashMovements.length === 0 && (
                    <tr>
                      <td colSpan={4} className="caja-module__empty">Sin movimientos registrados.</td>
                    </tr>
                  )}
                  {cashMovements.slice(0, 8).map((movement) => (
                    <tr key={movement.id}>
                      <td>{String(movement.created_at || '').replace('T', ' ').slice(0, 16)}</td>
                      <td>{movement.type === 'expense' ? 'Gasto' : 'Ingreso'}</td>
                      <td>{movement.description || '-'}</td>
                      <td>{formatMoney(movement.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </article>
      </section>

      {/* ── 4. Panel de cierre (colapsado por defecto) ── */}
      {showClosingPanel && cashSession?.id && (
        <section className="caja-closing-panel">
          <div className="caja-closing-panel__head">
            <h3>Cierre de caja</h3>
            <button
              type="button"
              className="caja-ghost-btn"
              onClick={() => {
                setShowClosingPanel(false)
                setConfirmCash(false)
                setShowDifferenceNote(false)
                setDifferenceNote('')
              }}
            >
              Cancelar
            </button>
          </div>

          <div className="caja-closing-row">
            <span>Efectivo esperado</span>
            <strong>{formatMoney(expectedCash)}</strong>
          </div>

          <label className="caja-closing-field">
            <span>Efectivo contado</span>
            <input
              ref={closingAmountInputRef}
              type="number"
              min="0"
              step="0.01"
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.value)}
              className="caja-closing-input"
            />
          </label>

          <div className={`caja-closing-row caja-closing-row--diff ${difference < 0 ? 'is-negative' : difference > 0 ? 'is-positive' : 'is-zero'}`}>
            <span>Diferencia</span>
            <strong>{difference > 0 ? '+' : ''}{formatMoney(difference)}</strong>
          </div>

          <div className="caja-difference-note">
            <button
              type="button"
              className="caja-ghost-btn"
              onClick={() => setShowDifferenceNote((current) => !current)}
            >
              {showDifferenceNote ? 'Ocultar aclaracion' : 'Aclarar diferencia'}
            </button>

            {Math.abs(difference) < 0.01 && (
              <p className="caja-module__message">Cuando haya diferencia, puedes agregar una aclaracion opcional.</p>
            )}

            {showDifferenceNote && (
              <label className="caja-closing-field">
                <span>Aclaracion</span>
                <input
                  type="text"
                  maxLength={140}
                  placeholder="Ej. faltante por cambio no registrado"
                  value={differenceNote}
                  onChange={(e) => setDifferenceNote(e.target.value)}
                  className="caja-closing-note-input"
                  disabled={Math.abs(difference) < 0.01}
                />
              </label>
            )}
          </div>

          <label className="caja-checkbox">
            <input type="checkbox" checked={confirmCash} onChange={(e) => setConfirmCash(e.target.checked)} />
            Confirmo que conté el efectivo manualmente
          </label>

          <button
            type="button"
            className="caja-cta caja-cta--confirm"
            disabled={submitting || !canConfirmClosure}
            onClick={async () => { await handleClose({ preventDefault: () => {} }) }}
          >
            {submitting ? 'Cerrando...' : 'Confirmar cierre de caja'}
          </button>
        </section>
      )}

    </div>
  )

  const renderOpening = () => (
    <form className="caja-module__form" onSubmit={handleOpenCash}>
      <label>
        Monto de inicio predeterminado (configurable)
        <input
          type="number"
          min="0"
          step="0.01"
          value={defaultOpeningAmount}
          onChange={(e) => setDefaultOpeningAmount(e.target.value)}
        />
      </label>
      <button type="button" onClick={saveDefaultOpening}>Guardar monto predeterminado</button>

      <label>
        Monto de inicio de caja
        <input
          type="number"
          min="0"
          step="0.01"
          value={openingAmount}
          onChange={(e) => setOpeningAmount(e.target.value)}
        />
      </label>

      <button type="submit" disabled={submitting || Boolean(cashSession?.id)}>
        {submitting ? 'Abriendo caja...' : 'Abrir caja'}
      </button>
    </form>
  )

  const renderMovements = () => (
    <section className="caja-module__panel">
      <div className="caja-module__panel-header">
        <h3>Movimientos de caja</h3>
        <button type="button" onClick={() => setShowMovementForm((value) => !value)}>
          {showMovementForm ? 'Cancelar' : 'Registrar movimiento'}
        </button>
      </div>

      {showMovementForm && (
        <form className="caja-module__movement-form" onSubmit={handleRegisterMovement}>
          <select value={movementType} onChange={(e) => setMovementType(e.target.value)}>
            <option value="income">Ingreso</option>
            <option value="expense">Retiro</option>
          </select>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Monto"
            value={movementAmount}
            onChange={(e) => setMovementAmount(e.target.value)}
          />
          <input
            type="text"
            placeholder="Descripcion"
            value={movementDescription}
            onChange={(e) => setMovementDescription(e.target.value)}
          />
          <button type="submit" disabled={submitting || !canSubmitMovement}>Confirmar</button>
        </form>
      )}

      <table className="caja-module__table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Motivo</th>
            <th>Monto</th>
            <th>Usuario</th>
          </tr>
        </thead>
        <tbody>
          {cashMovements.length === 0 && (
            <tr>
              <td colSpan={5} className="caja-module__empty">Sin movimientos registrados.</td>
            </tr>
          )}
          {cashMovements.map((movement) => (
            <tr key={movement.id}>
              <td>{String(movement.created_at || '').replace('T', ' ').slice(0, 16)}</td>
              <td>{movement.type === 'expense' ? 'Retiro' : 'Ingreso'}</td>
              <td>{movement.description || '-'}</td>
              <td>{formatMoney(movement.amount)}</td>
              <td>{movement.user_name || movement.user_id || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )

  const renderCorte = () => (
    <section className="caja-module__panel caja-module__panel--corte">
      <h3>Corte de caja</h3>

      <div className="caja-module__totals-grid">
        <div>
          <span>Ventas totales</span>
          <strong>{formatMoney(financialSummary?.todayIncome || 0)}</strong>
        </div>
        <div>
          <span>Efectivo esperado</span>
          <strong>{formatMoney(expectedCash)}</strong>
        </div>
        <div>
          <span>Tarjeta</span>
          <strong>{formatMoney(cardTotal)}</strong>
        </div>
        <div>
          <span>Transferencias</span>
          <strong>{formatMoney(transferTotal)}</strong>
        </div>
      </div>

      <form className="caja-module__form" onSubmit={handleClose}>
        <label>
          Billetes y monedas (conteo)
          <input
            type="number"
            min="0"
            step="0.01"
            value={countedCash}
            onChange={(e) => setCountedCash(e.target.value)}
          />
        </label>

        <div className="caja-module__summary-row">
          <span>Total contado</span>
          <strong>{formatMoney(countedCashNumber)}</strong>
        </div>
        <div className="caja-module__summary-row">
          <span>Diferencia</span>
          <strong>{difference > 0 ? '+' : ''}{formatMoney(difference)}</strong>
        </div>

        <label className="caja-module__checkbox">
          <input type="checkbox" checked={confirmCash} onChange={(e) => setConfirmCash(e.target.checked)} />
          Confirmo conteo de efectivo manual
        </label>

        <div className="caja-module__form-actions">
          <button type="submit" disabled={submitting || !canConfirmClosure}>
            {submitting ? 'Confirmando...' : 'Confirmar corte de caja'}
          </button>
          <button type="button" className="caja-module__ghost" onClick={() => navigate('/cash-register')}>Cancelar</button>
        </div>
      </form>
    </section>
  )

  const renderHistory = () => (
    <section className="caja-history">
      <header className="caja-history__header">
        <div>
          <h3>Historial de cortes</h3>
          <p>Consulta cierres anteriores con montos de apertura y cierre.</p>
        </div>
        <button type="button" className="caja-module__back" onClick={() => fetchCashSessionsHistory()}>
          Actualizar
        </button>
      </header>

      <div className="caja-history__stats">
        <article>
          <span>Cortes registrados</span>
          <strong>{closedSessions.length}</strong>
        </article>
        <article>
          <span>Último cierre</span>
          <strong>{latestClosedSession ? formatDateTime(latestClosedSession.closed_at) : 'Sin registros'}</strong>
        </article>
      </div>

      {closedSessions.length === 0 ? (
        <div className="caja-history__empty">Aún no hay cortes cerrados para mostrar.</div>
      ) : (
        <div className="caja-history__grid">
          {closedSessions.map((session) => {
            const opening = Number(session.opening_amount || 0)
            const closing = Number(session.closing_amount || 0)
            const delta = closing - opening
            const sessionNote = historyClarifications[session.id] || session.clarification_note || ''
            const isEditingSession = editingClarificationId === session.id

            return (
              <article key={session.id} className="caja-history-card">
                <div className="caja-history-card__head">
                  <strong>{formatDateTime(session.closed_at)}</strong>
                  <span className="caja-history-card__badge">Cerrada</span>
                </div>

                <div className="caja-history-card__row">
                  <span>Apertura</span>
                  <strong>{formatMoney(opening)}</strong>
                </div>
                <div className="caja-history-card__row">
                  <span>Cierre</span>
                  <strong>{formatMoney(closing)}</strong>
                </div>
                <div className={`caja-history-card__row ${delta < 0 ? 'is-negative' : delta > 0 ? 'is-positive' : 'is-neutral'}`}>
                  <span>Diferencia</span>
                  <strong>{delta > 0 ? '+' : ''}{formatMoney(delta)}</strong>
                </div>

                <button
                  type="button"
                  className="caja-ghost-btn caja-history-card__clarify-btn"
                  onClick={() => {
                    if (isEditingSession) {
                      cancelClarificationEdit()
                      return
                    }
                    startClarificationEdit(session.id, sessionNote)
                  }}
                >
                  {isEditingSession ? 'Cancelar aclaracion' : (sessionNote ? 'Editar aclaracion' : 'Aclarar diferencia')}
                </button>

                {isEditingSession && (
                  <div className="caja-history-card__clarify-form">
                    <input
                      type="text"
                      maxLength={160}
                      value={clarificationDraft}
                      placeholder="Ej. diferencia por ajuste manual pendiente"
                      onChange={(e) => setClarificationDraft(e.target.value)}
                    />
                    <button
                      type="button"
                      className="caja-cta caja-cta--confirm"
                      onClick={() => saveClarificationNote(session.id)}
                    >
                      Guardar
                    </button>
                  </div>
                )}

                {sessionNote && !isEditingSession && (
                  <p className="caja-history-card__note">Aclaracion: {sessionNote}</p>
                )}

                <p className="caja-history-card__meta">Abierta: {formatDateTime(session.opened_at)}</p>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )

  return (
    <div className="caja-module">
      <header className="caja-module__header">
        <div>
          <h1>{currentAction ? currentAction.title : 'Caja'}</h1>
          <p>Control de efectivo, movimientos y cortes de caja</p>
        </div>
        {currentAction && <button type="button" className="caja-module__back" onClick={() => navigate('/cash-register')}>Volver a Caja</button>}
      </header>

      {!currentAction && renderHome()}
      {normalizedAction === 'apertura' && renderOpening()}
      {(normalizedAction === 'movimientos' || normalizedAction === 'gastos' || normalizedAction === 'ingresos') && renderMovements()}
      {normalizedAction === 'corte' && renderCorte()}
      {normalizedAction === 'historial' && renderHistory()}

      {error && <p className="caja-module__message caja-module__message--error">{error}</p>}
      {success && <p className="caja-module__message caja-module__message--success">{success}</p>}
      {loading && <p className="caja-module__message">Actualizando datos...</p>}
    </div>
  )
}
