import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FaArrowDown, FaArrowUp, FaClock, FaDollarSign, FaPlus, FaUserClock } from 'react-icons/fa'
import { useSubscriptionStore } from '../../store/subscriptionStore'
import { useTenantStore } from '../../store/tenantStore'
import { LiquidButton } from '../Inventory/LiquidButton'
import PrintModal from '../PrintModal/PrintModal'
import { SubscriptionAttendanceInsights } from './SubscriptionAttendanceInsights'
import './Subscriptions.css'

const ITEMS_PER_PAGE = 10

const dateFormatter = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

const getStatusMeta = (customer) => {
  if (customer.status === 'cancelled') return { label: 'Cancelada', tone: 'cancelled' }
  if (customer.daysLeft < 0) return { label: 'Vencida', tone: 'expired' }
  if (customer.daysLeft <= 7) return { label: 'Por vencer', tone: 'dueSoon' }
  return { label: 'Activa', tone: 'active' }
}

const formatMoney = (value) => {
  const amount = Number(value || 0)
  return `$${amount.toFixed(2)}`
}

const formatRenewalDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : dateFormatter.format(date)
}

const getFilterKey = (customer) => {
  if (customer.status === 'cancelled') return 'cancelled'
  if (customer.daysLeft < 0) return 'expired'
  if (customer.daysLeft <= 7) return 'dueSoon'
  return 'active'
}

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Activos' },
  { id: 'dueSoon', label: 'Por vencer' },
  { id: 'expired', label: 'Vencidos' }
]

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'card', label: 'Tarjeta' },
  { id: 'transfer', label: 'Transferencia' }
]

const Subscriptions = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    customers,
    loading,
    renewCustomer,
    loadCustomers
  } = useSubscriptionStore()

  const currentTenantId = useTenantStore((state) => state.currentTenantId)
  const attendanceBusinessId =
    currentTenantId && currentTenantId !== 'global' ? currentTenantId : null

  const [selectedId, setSelectedId] = useState(null)
  const [monthsToAdd, setMonthsToAdd] = useState(1)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [lastSubscriptionSale, setLastSubscriptionSale] = useState(null)
  const [subscribersSearch, setSubscribersSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortState, setSortState] = useState({ key: 'renewalDate', direction: 'asc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [renewPaymentMethod, setRenewPaymentMethod] = useState('cash')
  const [renewSubmitting, setRenewSubmitting] = useState(false)
  const [renewType, setRenewType] = useState('add_months')

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  useEffect(() => {
    const receipt = location.state?.subscriptionSaleReceipt
    if (!receipt) return
    setLastSubscriptionSale(receipt)
    setShowPrintModal(true)
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    setOpenMenuId(null)
  }, [currentPage, subscribersSearch, statusFilter, sortState.key, sortState.direction])

  const cycleSort = (key) => {
    setSortState((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' }
      if (prev.direction === 'asc') return { key, direction: 'desc' }
      return { key: 'renewalDate', direction: 'asc' }
    })
  }

  const summary = useMemo(() => {
    const activeCustomers = customers.filter((customer) => customer.status === 'active' && customer.daysLeft >= 0)
    const active = activeCustomers.filter((customer) => customer.daysLeft > 7).length
    const dueSoon = activeCustomers.filter((customer) => customer.daysLeft <= 7).length
    const expired = customers.filter((customer) => customer.status === 'active' && customer.daysLeft < 0).length
    const estimatedRevenue = activeCustomers.reduce((sum, customer) => sum + Number(customer.monthlyFee || 0), 0)
    return { active, dueSoon, expired, estimatedRevenue }
  }, [customers])

  const visibleCustomers = useMemo(() => {
    const query = subscribersSearch.trim().toLowerCase()
    const filteredCustomers = customers.filter((customer) => {
      const matchesQuery = !query || (customer.name || '').toLowerCase().includes(query) || String(customer.phone || '').toLowerCase().includes(query)
      if (!matchesQuery) return false
      if (statusFilter === 'all') return true
      return getFilterKey(customer) === statusFilter
    })

    return [...filteredCustomers].sort((a, b) => {
      let aValue
      let bValue
      if (sortState.key === 'name') {
        aValue = (a.name || '').toLowerCase()
        bValue = (b.name || '').toLowerCase()
      } else if (sortState.key === 'price') {
        aValue = Number(a.monthlyFee || 0)
        bValue = Number(b.monthlyFee || 0)
      } else {
        aValue = new Date(a.endDate || 0).getTime()
        bValue = new Date(b.endDate || 0).getTime()
      }

      if (aValue < bValue) return sortState.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortState.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [customers, sortState.direction, sortState.key, statusFilter, subscribersSearch])

  const totalPages = Math.max(1, Math.ceil(visibleCustomers.length / ITEMS_PER_PAGE))
  const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedCustomers = visibleCustomers.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE)
  const showingFrom = visibleCustomers.length === 0 ? 0 : pageStartIndex + 1
  const showingTo = Math.min(pageStartIndex + ITEMS_PER_PAGE, visibleCustomers.length)

  useEffect(() => {
    setCurrentPage(1)
  }, [subscribersSearch, statusFilter, sortState.key, sortState.direction])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const visiblePageEnd = Math.min(totalPages, currentPage + 2)
  const visiblePageStart = Math.max(1, visiblePageEnd - 4)
  const visiblePages = Array.from(
    { length: visiblePageEnd - visiblePageStart + 1 },
    (_, idx) => visiblePageStart + idx
  )

  const selectedCustomer = customers.find((customer) => customer.id === selectedId)
  const renewConfig = renewType === 'renewal'
    ? { title: 'Cobrar mensualidad', subtitle: 'Registra el cobro y extiende la próxima renovación un mes.', actionLabel: 'Cobrar mensualidad', totalMonths: 1 }
    : { title: 'Agregar meses', subtitle: 'Suma meses pagados a la suscripción actual.', actionLabel: 'Cobrar y agregar meses', totalMonths: Number(monthsToAdd) || 1 }

  const openRenewModal = (customer, mode) => {
    setSelectedId(customer.id)
    setRenewType(mode)
    setMonthsToAdd(1)
    setRenewPaymentMethod('cash')
  }

  const handleConfirmRenew = async () => {
    if (!selectedCustomer) return
    const months = renewType === 'renewal' ? 1 : Math.max(1, Number(monthsToAdd) || 1)
    setRenewSubmitting(true)
    try {
      await renewCustomer(selectedCustomer.id, months, renewType, renewPaymentMethod)
      const amount = (selectedCustomer.monthlyFee || 0) * months
      setLastSubscriptionSale({
        id: `sub-renew-${Date.now()}`,
        sale_number: `SUB-${Date.now()}`,
        created_at: new Date().toISOString(),
        subtotal: amount,
        total: amount,
        payment_method: renewPaymentMethod,
        items: [{
          id: `sub-item-${Date.now()}`,
          quantity: months,
          unitPrice: Number(selectedCustomer.monthlyFee || 0),
          subtotal: amount,
          product: { name: renewType === 'renewal' ? `Renovación ${selectedCustomer.name}` : `Meses adicionales ${selectedCustomer.name}` }
        }]
      })
      setSelectedId(null)
      setShowPrintModal(true)
    } finally {
      setRenewSubmitting(false)
    }
  }

  return (
    <div className="mm-page mm-page--flush flex flex-col subscriptions-page--inventory">
      <div className="mm-shell mm-shell--wide w-full flex flex-col flex-1 min-h-0">
        <h1 className="text-2xl font-bold text-[var(--text)] mb-3">Suscripciones</h1>

        <section
          className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[var(--border)]/60 bg-[var(--panel)]/55 px-3 py-2"
          aria-label="Resumen y asistencia"
        >
          <div className="flex flex-wrap items-center gap-2 min-w-0" aria-label="Resumen de suscripciones">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)]/70 px-2.5 py-1 text-[11px] text-[var(--muted)]">
              Activas <strong className="text-[var(--text)] text-xs">{summary.active}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)]/70 px-2.5 py-1 text-[11px] text-[var(--muted)]">
              Por vencer <strong className="text-[var(--text)] text-xs">{summary.dueSoon}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)]/70 px-2.5 py-1 text-[11px] text-[var(--muted)]">
              Vencidas <strong className="text-[var(--text)] text-xs">{summary.expired}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)]/70 px-2.5 py-1 text-[11px] text-[var(--muted)]">
              Ingreso <strong className="text-[var(--text)] text-xs tabular-nums">{formatMoney(summary.estimatedRevenue)}</strong>
            </span>
            <span className="text-[11px] text-[var(--muted)] tabular-nums whitespace-nowrap md:ml-1">
              {visibleCustomers.length} / {customers.length} cliente(s)
            </span>
          </div>
          {attendanceBusinessId ? (
            <>
              <span className="hidden md:block h-6 w-px shrink-0 bg-[var(--border)]/50" aria-hidden />
              <SubscriptionAttendanceInsights businessId={attendanceBusinessId} />
            </>
          ) : null}
        </section>

        <div className="mb-4 grid gap-3 lg:grid-cols-[auto,1fr] lg:items-end">
          <div className="space-y-2">
            <nav
              className="inline-flex gap-0.5 rounded-lg bg-[var(--panel)]/60 p-0.5 border border-[var(--border)]/40"
              aria-label="Filtros de estado"
            >
              {FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setStatusFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                    statusFilter === filter.id
                      ? 'bg-[var(--accent-soft)]/80 text-[var(--accent)] shadow-md'
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)]/40'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 lg:justify-end">
            <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)]/40 bg-[var(--panel)]/55 p-1 shrink-0">
              <button
                type="button"
                onClick={() => cycleSort('name')}
                className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                  sortState.key === 'name'
                    ? 'bg-[var(--accent-soft)]/80 text-[var(--accent)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)]/50'
                }`}
                title="Orden alfabético"
              >
                <span>A</span>
                {sortState.key === 'name' && sortState.direction === 'asc' ? <FaArrowUp className="w-3 h-3" /> : null}
                {sortState.key === 'name' && sortState.direction === 'desc' ? <FaArrowDown className="w-3 h-3" /> : null}
              </button>
              <button
                type="button"
                onClick={() => cycleSort('renewalDate')}
                className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                  sortState.key === 'renewalDate'
                    ? 'bg-[var(--accent-soft)]/80 text-[var(--accent)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)]/50'
                }`}
                title="Orden por fecha de renovación"
              >
                <FaClock className="w-3 h-3" />
                {sortState.key === 'renewalDate' && sortState.direction === 'asc' ? <FaArrowUp className="w-3 h-3" /> : null}
                {sortState.key === 'renewalDate' && sortState.direction === 'desc' ? <FaArrowDown className="w-3 h-3" /> : null}
              </button>
              <button
                type="button"
                onClick={() => cycleSort('price')}
                className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                  sortState.key === 'price'
                    ? 'bg-[var(--accent-soft)]/80 text-[var(--accent)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)]/50'
                }`}
                title="Orden por mensualidad"
              >
                <FaDollarSign className="w-3 h-3" />
                {sortState.key === 'price' && sortState.direction === 'asc' ? <FaArrowUp className="w-3 h-3" /> : null}
                {sortState.key === 'price' && sortState.direction === 'desc' ? <FaArrowDown className="w-3 h-3" /> : null}
              </button>
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={subscribersSearch}
              onChange={(e) => setSubscribersSearch(e.target.value)}
              autoComplete="off"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] px-4 py-2.5 text-sm font-medium text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 min-w-[12rem] flex-1 lg:max-w-xs transition-all"
              aria-label="Buscar suscriptor"
            />
            <LiquidButton size="sm" onClick={() => navigate('/subscriptions/new')}>
              <span className="whitespace-nowrap">+ Nueva suscripción</span>
            </LiquidButton>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-[var(--panel)]/40 py-16 text-center text-sm text-[var(--muted)]">
            Cargando suscripciones...
          </div>
        ) : visibleCustomers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel)]/30 py-16 text-center text-sm text-[var(--muted)]">
            No se encontraron suscriptores con esos filtros.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 content-start">
            {paginatedCustomers.map((customer) => {
              const status = getStatusMeta(customer)
              const isSelected = selectedId === customer.id
              const daysShort =
                customer.daysLeft < 0 ? `${Math.abs(customer.daysLeft)}d` : `${customer.daysLeft}d`
              const dotClass =
                status.tone === 'active'
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                  : status.tone === 'dueSoon'
                    ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]'
                    : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]'

              return (
                <div
                  key={customer.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setOpenMenuId(null)
                    navigate(`/suscripciones/${customer.id}`)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setOpenMenuId(null)
                      navigate(`/suscripciones/${customer.id}`)
                    }
                  }}
                  className={`flex items-center gap-2 rounded-xl bg-[var(--panel)]/35 py-2 px-2.5 transition-all duration-200 hover:bg-[var(--panel)]/60 hover:shadow-lg hover:shadow-[var(--accent)]/10 backdrop-blur-sm cursor-pointer min-w-0 ${
                    isSelected ? 'ring-1 ring-[var(--accent)]/50' : ''
                  } ${openMenuId === customer.id ? 'relative z-[40]' : ''}`}
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[var(--panel)]/60 flex-shrink-0 flex items-center justify-center">
                    <FaUserClock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--accent)]" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[var(--text)] truncate text-sm leading-tight" title={customer.name}>
                      {customer.name}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-[var(--muted)] truncate leading-tight tabular-nums">
                      {customer.phone || 'Sin teléfono'} · {formatRenewalDate(customer.endDate)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right min-w-[3.25rem]">
                    <span className="text-xs sm:text-sm font-semibold text-[var(--text)] tabular-nums leading-tight block">
                      {formatMoney(customer.monthlyFee)}
                    </span>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    <span className="text-[10px] sm:text-xs text-[var(--muted)] tabular-nums w-7 text-right">{daysShort}</span>
                    <span
                      className={`inline-block h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full ${dotClass}`}
                      title={status.label}
                      aria-label={status.label}
                    />
                  </div>
                  <div className="shrink-0">
                    <LiquidButton
                      size="sm"
                      className="!px-2 !py-1.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        openRenewModal(customer, 'renewal')
                      }}
                      aria-label="Cobrar mensualidad"
                      title="Cobrar mensualidad"
                    >
                      <FaDollarSign className="w-3 h-3" />
                    </LiquidButton>
                  </div>
                  <div className="relative shrink-0 w-7 flex justify-end" data-subscription-row-menu>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuId((id) => (id === customer.id ? null : customer.id))
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-lg text-[var(--muted)] hover:bg-[var(--panel)]/80 hover:text-[var(--accent)] transition-all"
                      aria-label="Más opciones"
                      aria-expanded={openMenuId === customer.id}
                    >
                      ⋯
                    </button>
                    {openMenuId === customer.id && (
                      <div className="absolute right-0 top-full mt-1 py-1.5 min-w-[168px] rounded-xl bg-[var(--panel)] shadow-2xl shadow-black/60 z-[50] border border-[var(--border)]">
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(null)
                            navigate(`/suscripciones/${customer.id}`)
                          }}
                        >
                          Ver detalle
                        </button>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(null)
                            openRenewModal(customer, 'renewal')
                          }}
                        >
                          Cobrar mensualidad
                        </button>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(null)
                            openRenewModal(customer, 'add_months')
                          }}
                        >
                          Agregar meses
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && visibleCustomers.length > 0 && (
          <div className="mt-6 mb-8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 py-2 pb-4 md:pb-6">
            <p className="text-xs text-[var(--muted)] order-2 sm:order-1">
              Mostrando {showingFrom}-{showingTo} de {visibleCustomers.length} suscriptor(es)
            </p>
            {visibleCustomers.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-center gap-1.5 order-1 sm:order-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded-md text-xs border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)]/40 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                {visiblePages.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-8 px-2 py-1 rounded-md text-xs border transition-colors ${
                      page === currentPage
                        ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)]/40'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded-md text-xs border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)]/40 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <button type="button" className="subscriptions-fab" onClick={() => navigate('/subscriptions/new')}>
        <FaPlus />
        <span>Nueva suscripción</span>
      </button>

      {selectedCustomer && (
        <section className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm grid place-items-center p-4" onClick={() => !renewSubmitting && setSelectedId(null)}>
          <article className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">{renewConfig.title}</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Cliente: {selectedCustomer.name}</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{renewConfig.subtitle}</p>

            <div className="mt-4 space-y-3">
              {renewType !== 'renewal' && (
                <div>
                  <p className="subscriptions-modal-label-text">Meses a agregar</p>
                  <div className="subscriptions-stepper">
                    <button type="button" className="subscriptions-stepper__btn" onClick={() => setMonthsToAdd((prev) => Math.max(1, Number(prev) - 1))} disabled={renewSubmitting || Number(monthsToAdd) <= 1} aria-label="Restar mes">-</button>
                    <input
                      type="number"
                      min="1"
                      value={monthsToAdd}
                      onChange={(e) => setMonthsToAdd(e.target.value === '' ? '' : Math.max(1, Number(e.target.value) || 1))}
                      onBlur={() => {
                        if (monthsToAdd === '' || Number(monthsToAdd) < 1) setMonthsToAdd(1)
                      }}
                      className="subscriptions-stepper__input"
                      disabled={renewSubmitting}
                    />
                    <button type="button" className="subscriptions-stepper__btn" onClick={() => setMonthsToAdd((prev) => (Number(prev) || 1) + 1)} disabled={renewSubmitting} aria-label="Sumar mes">+</button>
                  </div>
                </div>
              )}

              <div className="subscriptions-modal-summary">
                <span>Mensualidad:</span>
                <span>{formatMoney(selectedCustomer.monthlyFee)}</span>
                <span>Meses:</span>
                <span>{renewConfig.totalMonths}</span>
                <span className="font-semibold">Total a cobrar:</span>
                <span className="font-semibold">{formatMoney((selectedCustomer.monthlyFee || 0) * renewConfig.totalMonths)}</span>
              </div>

              <div>
                <p className="subscriptions-modal-label-text">Método de pago</p>
                <div className="subscriptions-payment-options">
                  {PAYMENT_METHODS.map((method) => (
                    <button key={method.id} type="button" className={`subscriptions-payment-option ${renewPaymentMethod === method.id ? 'subscriptions-payment-option--active' : ''}`} onClick={() => setRenewPaymentMethod(method.id)} disabled={renewSubmitting}>
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <button type="button" className="subscriptions-modal-btn" onClick={() => setSelectedId(null)} disabled={renewSubmitting}>Cancelar</button>
              <button type="button" className="subscriptions-modal-btn subscriptions-modal-btn--primary" onClick={handleConfirmRenew} disabled={renewSubmitting}>
                {renewSubmitting ? 'Procesando...' : renewConfig.actionLabel}
              </button>
            </div>
          </article>
        </section>
      )}

      {showPrintModal && lastSubscriptionSale && (
        <PrintModal
          sale={lastSubscriptionSale}
          onConfirm={() => {
            setShowPrintModal(false)
            setLastSubscriptionSale(null)
          }}
          onCancel={() => {
            setShowPrintModal(false)
            setLastSubscriptionSale(null)
          }}
        />
      )}
    </div>
  )
}

export default Subscriptions
