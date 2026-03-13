import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaEdit, FaPhoneAlt, FaPlus } from 'react-icons/fa'
import { useSubscriptionStore } from '../../store/subscriptionStore'
import PrintModal from '../PrintModal/PrintModal'
import './Subscriptions.css'

const statusClasses = {
  cancelled: 'bg-gray-500/20 text-gray-300 border-gray-400/30',
  expired: 'bg-red-500/15 text-red-300 border-red-500/35',
  dueSoon: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
  active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
}

const dateFormatter = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

const getStatusMeta = (customer) => {
  if (customer.status === 'cancelled') return { label: 'Cancelada', tone: 'cancelled' }
  if (customer.daysLeft < 0) return { label: 'Vencida', tone: 'expired' }
  if (customer.daysLeft <= 7) return { label: 'Por vencer', tone: 'dueSoon' }
  return { label: 'Activa', tone: 'active' }
}

const formatRenewalLine = (customer) => {
  if (customer.status === 'cancelled') return 'Suscripción cancelada'
  if (customer.daysLeft < 0) return `Vencida hace ${Math.abs(customer.daysLeft)} día(s)`
  if (customer.daysLeft === 0) return `Renueva: ${formatRenewalDate(customer.endDate)} • Vence hoy`
  if (customer.daysLeft <= 7) return `Renueva: ${formatRenewalDate(customer.endDate)} • Vence en ${customer.daysLeft} día(s)`
  return `Renueva: ${formatRenewalDate(customer.endDate)} • Renueva en ${customer.daysLeft} día(s)`
}

const formatMoney = (value) => {
  const amount = Number(value || 0)
  return `$${amount.toFixed(2)}`
}

const formatRenewalDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : dateFormatter.format(date)
}

const parsePlansInput = (raw) => raw
  .split(',')
  .map((part) => Number(part.trim()))
  .filter((value) => Number.isFinite(value) && value > 0)

const sanitizeName = (value) => value
  .replace(/[^a-zA-Z0-9\s.'-]/g, '')
  .replace(/\s+/g, ' ')
  .slice(0, 80)

const sanitizePhone = (value) => value.replace(/\D/g, '').slice(0, 15)

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

const SORT_OPTIONS = [
  { id: 'renewalDate', label: 'Próxima renovación' },
  { id: 'name', label: 'Nombre' },
  { id: 'price', label: 'Precio' }
]

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'card', label: 'Tarjeta' },
  { id: 'transfer', label: 'Transferencia' }
]

const Subscriptions = () => {
  const navigate = useNavigate()
  const {
    customers,
    subscriptionPlans,
    loading,
    addCustomer,
    renewCustomer,
    loadCustomers,
    loadSubscriptionPlans,
    saveSubscriptionPlans
  } = useSubscriptionStore()

  const [formData, setFormData] = useState({ name: '', phone: '', monthlyFee: '', months: '1' })
  const [selectedId, setSelectedId] = useState(null)
  const [monthsToAdd, setMonthsToAdd] = useState(1)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState('cash')
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [lastSubscriptionSale, setLastSubscriptionSale] = useState(null)
  const [showPlanEditor, setShowPlanEditor] = useState(false)
  const [plansRaw, setPlansRaw] = useState('')
  const [plansSaving, setPlansSaving] = useState(false)
  const [plansError, setPlansError] = useState('')
  const [plansMessage, setPlansMessage] = useState('')
  const [subscribersSearch, setSubscribersSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [listSort, setListSort] = useState({ key: 'renewalDate', direction: 'asc' })
  const [renewPaymentMethod, setRenewPaymentMethod] = useState('cash')
  const [renewSubmitting, setRenewSubmitting] = useState(false)
  const [renewType, setRenewType] = useState('add_months')

  useEffect(() => {
    loadCustomers()
    loadSubscriptionPlans()
  }, [loadCustomers, loadSubscriptionPlans])

  useEffect(() => {
    if (!subscriptionPlans.length) return
    const hasSelectedPlan = subscriptionPlans.some((plan) => Number(plan) === Number(formData.monthlyFee))
    if (!hasSelectedPlan) {
      setFormData((prev) => ({ ...prev, monthlyFee: String(subscriptionPlans[0]) }))
    }
  }, [subscriptionPlans, formData.monthlyFee])

  useEffect(() => {
    setPlansRaw(subscriptionPlans.join(', '))
  }, [subscriptionPlans])

  const summary = useMemo(() => {
    const activeCustomers = customers.filter((customer) => customer.status === 'active' && customer.daysLeft >= 0)
    const active = activeCustomers.filter((customer) => customer.daysLeft > 7).length
    const dueSoon = activeCustomers.filter((customer) => customer.daysLeft <= 7).length
    const expired = customers.filter((customer) => customer.status === 'active' && customer.daysLeft < 0).length
    const estimatedRevenue = activeCustomers.reduce((sum, customer) => sum + Number(customer.monthlyFee || 0), 0)
    return { active, dueSoon, expired, estimatedRevenue }
  }, [customers])

  const parsedInitialMonths = useMemo(() => {
    const raw = Number(formData.months)
    if (!formData.months || Number.isNaN(raw)) return 1
    return Math.max(1, Math.floor(raw))
  }, [formData.months])

  const initialCharge = useMemo(() => Number(formData.monthlyFee || 0) * parsedInitialMonths, [formData.monthlyFee, parsedInitialMonths])

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!formData.name.trim() || formData.name.trim().length < 3) return
    if (formData.phone && formData.phone.length !== 10) return
    setShowCheckoutModal(true)
  }

  const handleConfirmCreate = async () => {
    if (!formData.name.trim()) return
    setCheckoutSubmitting(true)
    try {
      await addCustomer({
        name: formData.name,
        phone: formData.phone,
        monthlyFee: formData.monthlyFee,
        months: parsedInitialMonths,
        paymentMethod: checkoutPaymentMethod
      })

      setLastSubscriptionSale({
        id: `sub-sale-${Date.now()}`,
        sale_number: `SUB-${Date.now()}`,
        created_at: new Date().toISOString(),
        subtotal: initialCharge,
        total: initialCharge,
        payment_method: checkoutPaymentMethod,
        items: [{
          id: `sub-item-${Date.now()}`,
          quantity: parsedInitialMonths,
          unitPrice: Number(formData.monthlyFee || 0),
          subtotal: initialCharge,
          product: { name: `Suscripción ${formData.name}` }
        }]
      })

      setFormData({ name: '', phone: '', monthlyFee: subscriptionPlans.length ? String(subscriptionPlans[0]) : '', months: '1' })
      setShowCreateModal(false)
      setShowCheckoutModal(false)
      setShowPrintModal(true)
    } finally {
      setCheckoutSubmitting(false)
    }
  }

  const handleSavePlans = async () => {
    setPlansError('')
    setPlansMessage('')
    const parsedPlans = parsePlansInput(plansRaw)
    if (!parsedPlans.length) {
      setPlansError('Ingresa al menos una mensualidad válida. Ejemplo: 199, 299, 399')
      return
    }

    setPlansSaving(true)
    try {
      const savedPlans = await saveSubscriptionPlans(parsedPlans)
      setPlansRaw(savedPlans.join(', '))
      setPlansMessage('Mensualidades guardadas.')
      setFormData((prev) => ({ ...prev, monthlyFee: savedPlans.includes(Number(prev.monthlyFee)) ? prev.monthlyFee : String(savedPlans[0]) }))
    } catch (error) {
      setPlansError(error?.message || 'No se pudieron guardar las mensualidades.')
    } finally {
      setPlansSaving(false)
    }
  }

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
      if (listSort.key === 'name') {
        aValue = (a.name || '').toLowerCase()
        bValue = (b.name || '').toLowerCase()
      } else if (listSort.key === 'price') {
        aValue = Number(a.monthlyFee || 0)
        bValue = Number(b.monthlyFee || 0)
      } else {
        aValue = new Date(a.endDate || 0).getTime()
        bValue = new Date(b.endDate || 0).getTime()
      }

      if (aValue < bValue) return listSort.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return listSort.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [customers, listSort.direction, listSort.key, statusFilter, subscribersSearch])

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

  const selectedSortLabel = SORT_OPTIONS.find((option) => option.id === listSort.key)?.label || 'Próxima renovación'

  return (
    <div className="subscriptions-page min-h-screen flex flex-col h-full text-[var(--text)]">
      <header className="subscriptions-page__header">
        <h1 className="subscriptions-page__title">Suscripciones</h1>
      </header>

      <section className="subscriptions-compact-kpis hidden md:flex" aria-label="Resumen de suscripciones">
        <span>Activas <strong>{summary.active}</strong></span>
        <span>Por vencer <strong>{summary.dueSoon}</strong></span>
        <span>Vencidas <strong>{summary.expired}</strong></span>
        <span>Ingreso <strong>{formatMoney(summary.estimatedRevenue)}</strong></span>
      </section>

      <section className="subscriptions-page__content">
        <article className="subscriptions-panel subscriptions-panel--list subscriptions-panel--dashboard">
          <div className="subscriptions-panel__header subscriptions-panel__header--list hidden md:flex">
            <h2 className="subscriptions-panel__title">Lista de suscriptores</h2>
            <span className="subscriptions-panel__counter">{visibleCustomers.length} / {customers.length} cliente(s)</span>
          </div>

          <div className="subscriptions-list-search-wrap subscriptions-list-search-wrap--desktop">
            <input type="text" value={subscribersSearch} onChange={(e) => setSubscribersSearch(e.target.value)} className="subscriptions-list-search" placeholder="Buscar suscriptor..." />
          </div>

          <div className="subscriptions-mobile-sort md:hidden" aria-label="Ordenar suscriptores en móvil">
            <div className="subscriptions-sort-group" role="tablist" aria-label="Orden por campo">
              <button
                type="button"
                className={`subscriptions-sort-btn ${listSort.key === 'name' ? 'subscriptions-sort-btn--active' : ''}`}
                onClick={() => setListSort((prev) => ({ ...prev, key: 'name' }))}
              >
                A-Z
              </button>
              <button
                type="button"
                className={`subscriptions-sort-btn ${listSort.key === 'renewalDate' ? 'subscriptions-sort-btn--active' : ''}`}
                onClick={() => setListSort((prev) => ({ ...prev, key: 'renewalDate' }))}
              >
                Fecha
              </button>
              <button
                type="button"
                className={`subscriptions-sort-btn ${listSort.key === 'price' ? 'subscriptions-sort-btn--active' : ''}`}
                onClick={() => setListSort((prev) => ({ ...prev, key: 'price' }))}
              >
                Monto
              </button>
            </div>
            <button
              type="button"
              className="subscriptions-sort-btn subscriptions-sort-btn--active"
              onClick={() => setListSort((prev) => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}
              aria-label="Cambiar dirección de orden"
            >
              {listSort.direction === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          <div className="subscriptions-list-toolbar subscriptions-list-advanced hidden md:grid">
            <div className="subscriptions-filter-group" role="tablist" aria-label="Filtrar suscripciones">
              {FILTERS.map((filter) => (
                <button key={filter.id} type="button" className={`subscriptions-filter-btn ${statusFilter === filter.id ? 'subscriptions-filter-btn--active' : ''}`} onClick={() => setStatusFilter(filter.id)}>
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="subscriptions-sort-controls">
              <label className="subscriptions-sort-label">
                <span>Orden</span>
                <select value={listSort.key} className="subscriptions-sort-select" onChange={(e) => setListSort((prev) => ({ ...prev, key: e.target.value }))}>
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="subscriptions-sort-btn subscriptions-sort-btn--active" onClick={() => setListSort((prev) => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}>
                {listSort.direction === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="subscriptions-state-box">Cargando suscripciones...</div>
          ) : visibleCustomers.length === 0 ? (
            <div className="subscriptions-state-box subscriptions-state-box--empty">No se encontraron suscriptores con esos filtros.</div>
          ) : (
            <div className="subscriptions-cards-grid">
              {visibleCustomers.map((customer) => {
                const status = getStatusMeta(customer)
                const isSelected = selectedId === customer.id
                const daysLabel = customer.daysLeft < 0
                  ? `Vencida ${Math.abs(customer.daysLeft)}d`
                  : `${customer.daysLeft} días`

                return (
                  <article
                    key={customer.id}
                    className={`subscriptions-customer ${isSelected ? 'subscriptions-customer--selected' : ''} cursor-pointer`}
                    onClick={() => navigate(`/suscripciones/${customer.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(`/suscripciones/${customer.id}`)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <span className={`subscriptions-customer__dot subscriptions-customer__dot--${status.tone}`} title={status.label} aria-label={status.label} />

                    <div className="subscriptions-customer__identity">
                      <p className="subscriptions-customer__name" title={customer.name}>{customer.name}</p>
                      <p className="subscriptions-customer__phone"><FaPhoneAlt /><span title={customer.phone || 'Sin teléfono'}>{customer.phone || 'Sin teléfono'}</span></p>
                    </div>

                    <p className="subscriptions-customer__price">{formatMoney(customer.monthlyFee)} <span>/ mes</span></p>

                    <p className="subscriptions-customer__days" title={status.label}>{daysLabel}</p>

                    <p className="subscriptions-customer__renewal" title={formatRenewalDate(customer.endDate)}>{formatRenewalDate(customer.endDate)}</p>

                    <div className="subscriptions-customer__actions">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          openRenewModal(customer, 'renewal')
                        }}
                        className="subscriptions-action subscriptions-action--renew"
                        title="Cobrar mensualidad"
                        aria-label="Cobrar mensualidad"
                      >
                        $
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          navigate(`/suscripciones/${customer.id}`)
                        }}
                        className="subscriptions-action subscriptions-action--edit"
                        title="Ver detalle y editar"
                        aria-label="Ver detalle y editar"
                      >
                        <FaEdit aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </article>
      </section>

      <button
        type="button"
        className="subscriptions-fab"
        onClick={() => {
          setShowCreateModal(true)
          setShowPlanEditor(false)
          setPlansMessage('')
          setPlansError('')
        }}
      >
        <FaPlus />
        <span>Nueva suscripción</span>
      </button>

      {showCreateModal && (
        <section className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm grid place-items-center p-4" onClick={() => !checkoutSubmitting && setShowCreateModal(false)}>
          <article className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Alta de cliente</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Registra una nueva suscripción y cobra el primer periodo.</p>

            <form className="subscriptions-form mt-4" onSubmit={handleCreate}>
              <div className="subscriptions-field subscriptions-field--full">
                <label className="subscriptions-field__label">Nombre del cliente</label>
                <input value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: sanitizeName(e.target.value) }))} className="subscriptions-input subscriptions-input--full" placeholder="Ej. Juan Pérez" minLength={3} maxLength={80} required />
              </div>

              <div className="subscriptions-field">
                <label className="subscriptions-field__label">Teléfono</label>
                <input value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: sanitizePhone(e.target.value) }))} className="subscriptions-input" placeholder="Opcional (10 dígitos)" inputMode="numeric" pattern="[0-9]{10}" minLength={10} maxLength={10} />
              </div>

              <div className="subscriptions-field">
                <label className="subscriptions-field__label">Mensualidad</label>
                <select value={formData.monthlyFee} onChange={(e) => setFormData((prev) => ({ ...prev, monthlyFee: e.target.value }))} className="subscriptions-input" required>
                  {subscriptionPlans.map((plan) => (
                    <option key={plan} value={String(plan)}>{formatMoney(plan)} / mes</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="subscriptions-link-btn"
                  onClick={() => {
                    setShowPlanEditor((prev) => !prev)
                    setPlansMessage('')
                    setPlansError('')
                  }}
                >
                  {showPlanEditor ? 'Ocultar configuración' : 'Configurar mensualidades'}
                </button>
              </div>

              {showPlanEditor && (
                <div className="subscriptions-field subscriptions-field--full subscriptions-plans-editor">
                  <label className="subscriptions-field__label">Opciones de mensualidad</label>
                  <input type="text" value={plansRaw} onChange={(e) => setPlansRaw(e.target.value)} className="subscriptions-input subscriptions-input--full" placeholder="199, 299, 399" disabled={plansSaving} />
                  <p className="subscriptions-field__hint">Separa importes por coma. Ejemplo: 199, 299, 399.</p>
                  {plansError && <p className="subscriptions-inline-error">{plansError}</p>}
                  {plansMessage && <p className="subscriptions-inline-success">{plansMessage}</p>}
                  <div className="subscriptions-plans-editor__actions">
                    <button type="button" onClick={handleSavePlans} disabled={plansSaving} className="subscriptions-action-btn">
                      {plansSaving ? 'Guardando...' : 'Guardar mensualidades'}
                    </button>
                  </div>
                </div>
              )}

              <div className="subscriptions-field subscriptions-field--full">
                <label className="subscriptions-field__label">Meses iniciales de suscripción</label>
                <div className="subscriptions-stepper">
                  <button type="button" className="subscriptions-stepper__btn" onClick={() => setFormData((prev) => ({ ...prev, months: String(Math.max(1, parsedInitialMonths - 1)) }))} aria-label="Restar meses">-</button>
                  <input
                    type="number"
                    min="1"
                    value={formData.months}
                    onChange={(e) => setFormData((prev) => ({ ...prev, months: e.target.value }))}
                    onBlur={() => {
                      const parsedMonths = Number(formData.months)
                      if (!formData.months || Number.isNaN(parsedMonths) || parsedMonths < 1) {
                        setFormData((prev) => ({ ...prev, months: '1' }))
                      }
                    }}
                    className="subscriptions-stepper__input"
                    placeholder="1"
                  />
                  <button type="button" className="subscriptions-stepper__btn" onClick={() => setFormData((prev) => ({ ...prev, months: String(parsedInitialMonths + 1) }))} aria-label="Sumar meses">+</button>
                </div>
                <p className="subscriptions-field__hint">Cuántos meses paga al dar de alta. Normalmente 1.</p>
                <p className="subscriptions-field__hint subscriptions-field__hint--strong">Cobro inicial a registrar: {formatMoney(initialCharge)}</p>
              </div>

              <div className="subscriptions-modal-actions">
                <button type="button" className="subscriptions-modal-btn" onClick={() => setShowCreateModal(false)} disabled={checkoutSubmitting}>Cancelar</button>
                <button type="submit" className="subscriptions-submit" disabled={checkoutSubmitting}>Continuar</button>
              </div>
            </form>
          </article>
        </section>
      )}

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

      {showCheckoutModal && (
        <section className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm grid place-items-center p-4" onClick={() => !checkoutSubmitting && setShowCheckoutModal(false)}>
          <article className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Confirmar cobro inicial</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Cliente: {formData.name}</p>

            <div className="mt-4 rounded-lg border border-[var(--border)] p-3 text-sm space-y-1">
              <p>Mensualidad: {formatMoney(formData.monthlyFee)}</p>
              <p>Meses iniciales: {parsedInitialMonths}</p>
              <p className="font-semibold">Total a cobrar: {formatMoney(initialCharge)}</p>
            </div>

            <div className="mt-4">
              <label className="text-sm block mb-1">Método de pago</label>
              <div className="subscriptions-payment-options">
                {PAYMENT_METHODS.map((method) => (
                  <button key={method.id} type="button" className={`subscriptions-payment-option ${checkoutPaymentMethod === method.id ? 'subscriptions-payment-option--active' : ''}`} onClick={() => setCheckoutPaymentMethod(method.id)} disabled={checkoutSubmitting}>
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <button type="button" className="subscriptions-modal-btn" onClick={() => setShowCheckoutModal(false)} disabled={checkoutSubmitting}>Cancelar</button>
              <button type="button" className="subscriptions-modal-btn subscriptions-modal-btn--primary" onClick={handleConfirmCreate} disabled={checkoutSubmitting}>
                {checkoutSubmitting ? 'Procesando...' : 'Cobrar y guardar'}
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
