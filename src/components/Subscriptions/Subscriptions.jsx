import React, { useEffect, useMemo, useState } from 'react'
import { useSubscriptionStore } from '../../store/subscriptionStore'
import PrintModal from '../PrintModal/PrintModal'
import './Subscriptions.css'

const statusClasses = {
  cancelled: 'bg-gray-500/20 text-gray-300 border-gray-400/30',
  expired: 'bg-red-500/15 text-red-300 border-red-500/35',
  dueSoon: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
  active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
}

const getStatusMeta = (customer) => {
  if (customer.status === 'cancelled') return { label: 'Cancelada', tone: 'cancelled' }
  if (customer.daysLeft < 0) return { label: 'Vencida', tone: 'expired' }
  if (customer.daysLeft <= 7) return { label: 'Por vencer', tone: 'dueSoon' }
  return { label: 'Activa', tone: 'active' }
}

const formatDays = (customer) => {
  if (customer.status === 'cancelled') return 'Cancelada'
  if (customer.daysLeft < 0) return `Vencida hace ${Math.abs(customer.daysLeft)} día(s)`
  if (customer.daysLeft === 0) return 'Vence hoy'
  return `${customer.daysLeft} día(s) restantes`
}

const formatMoney = (value) => {
  const amount = Number(value || 0)
  return `$${amount.toFixed(2)}`
}

const parsePlansInput = (raw) => {
  return raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
}

const sanitizeName = (value) => {
  return value
    .replace(/[^a-zA-Z0-9\s.'-]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 80)
}

const sanitizePhone = (value) => {
  return value.replace(/\D/g, '').slice(0, 15)
}

const Subscriptions = () => {
  const {
    customers,
    subscriptionPlans,
    loading,
    addCustomer,
    updateCustomer,
    renewCustomer,
    cancelCustomer,
    loadCustomers,
    loadSubscriptionPlans,
    saveSubscriptionPlans
  } = useSubscriptionStore()

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    monthlyFee: '',
    months: '1'
  })
  const [selectedId, setSelectedId] = useState(null)
  const [monthsToAdd, setMonthsToAdd] = useState(1)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
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
  const [listSort, setListSort] = useState({ key: null, direction: null })
  const [editingCustomerId, setEditingCustomerId] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    monthlyFee: ''
  })
  const [editSaving, setEditSaving] = useState(false)
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
      setFormData((prev) => ({
        ...prev,
        monthlyFee: String(subscriptionPlans[0])
      }))
    }
  }, [subscriptionPlans, formData.monthlyFee])

  useEffect(() => {
    setPlansRaw(subscriptionPlans.join(', '))
  }, [subscriptionPlans])

  const summary = useMemo(() => {
    const active = customers.filter(c => c.status === 'active' && c.daysLeft >= 0).length
    const dueSoon = customers.filter(c => c.status === 'active' && c.daysLeft >= 0 && c.daysLeft <= 7).length
    const expired = customers.filter(c => c.status === 'active' && c.daysLeft < 0).length
    return { active, dueSoon, expired }
  }, [customers])

  const parsedInitialMonths = useMemo(() => {
    const raw = Number(formData.months)
    if (!formData.months || Number.isNaN(raw)) return 1
    return Math.max(1, Math.floor(raw))
  }, [formData.months])

  const initialCharge = useMemo(() => {
    const monthly = Number(formData.monthlyFee || 0)
    return monthly * parsedInitialMonths
  }, [formData.monthlyFee, parsedInitialMonths])

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
        items: [
          {
            id: `sub-item-${Date.now()}`,
            quantity: parsedInitialMonths,
            unitPrice: Number(formData.monthlyFee || 0),
            subtotal: initialCharge,
            product: {
              name: `Suscripcion ${formData.name}`
            }
          }
        ]
      })

      setFormData({
        name: '',
        phone: '',
        monthlyFee: subscriptionPlans.length ? String(subscriptionPlans[0]) : '',
        months: '1'
      })

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
      setPlansError('Ingresa al menos una mensualidad valida. Ejemplo: 199, 299, 399')
      return
    }

    setPlansSaving(true)
    try {
      const savedPlans = await saveSubscriptionPlans(parsedPlans)
      setPlansRaw(savedPlans.join(', '))
      setPlansMessage('Mensualidades guardadas.')
      setFormData((prev) => ({
        ...prev,
        monthlyFee: savedPlans.includes(Number(prev.monthlyFee)) ? prev.monthlyFee : String(savedPlans[0])
      }))
    } catch (error) {
      setPlansError(error?.message || 'No se pudieron guardar las mensualidades.')
    } finally {
      setPlansSaving(false)
    }
  }

  const selectedCustomer = customers.find(c => c.id === selectedId)

  const visibleCustomers = useMemo(() => {
    const query = subscribersSearch.trim().toLowerCase()

    const filteredCustomers = customers.filter((customer) => {
      if (!query) return true
      return (
        (customer.name || '').toLowerCase().includes(query) ||
        String(customer.phone || '').toLowerCase().includes(query)
      )
    })

    if (!listSort.key || !listSort.direction) {
      return filteredCustomers
    }

    return [...filteredCustomers].sort((a, b) => {
      let aValue = 0
      let bValue = 0

      if (listSort.key === 'alpha') {
        aValue = (a.name || '').toLowerCase()
        bValue = (b.name || '').toLowerCase()
      }

      if (listSort.key === 'price') {
        aValue = Number(a.monthlyFee || 0)
        bValue = Number(b.monthlyFee || 0)
      }

      if (listSort.key === 'date') {
        aValue = new Date(a.createdAt || a.startDate || 0).getTime()
        bValue = new Date(b.createdAt || b.startDate || 0).getTime()
      }

      if (aValue < bValue) return listSort.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return listSort.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [customers, subscribersSearch, listSort.key, listSort.direction])

  const cycleListSort = (key) => {
    setListSort((prev) => {
      if (prev.key !== key) {
        return { key, direction: 'asc' }
      }

      if (prev.direction === 'asc') {
        return { key, direction: 'desc' }
      }

      return { key: null, direction: null }
    })
  }

  const openEditModal = (customer) => {
    setEditingCustomerId(customer.id)
    setEditForm({
      name: customer.name || '',
      phone: customer.phone || '',
      monthlyFee: String(customer.monthlyFee || subscriptionPlans[0] || '')
    })
  }

  const closeEditModal = () => {
    if (editSaving) return
    setEditingCustomerId(null)
  }

  const handleSaveEdit = async () => {
    if (!editingCustomerId) return

    const normalizedName = editForm.name.trim()
    if (normalizedName.length < 3) return
    if (editForm.phone && editForm.phone.length !== 10) return

    setEditSaving(true)
    try {
      await updateCustomer(editingCustomerId, {
        name: normalizedName,
        phone: editForm.phone,
        monthlyFee: editForm.monthlyFee
      })
      setEditingCustomerId(null)
    } finally {
      setEditSaving(false)
    }
  }

  const editingCustomer = customers.find((customer) => customer.id === editingCustomerId)

  const handleConfirmRenew = async () => {
    if (!selectedCustomer) return
    setRenewSubmitting(true)
    try {
      await renewCustomer(selectedCustomer.id, monthsToAdd, renewType, renewPaymentMethod)
      const amount = (selectedCustomer.monthlyFee || 0) * monthsToAdd
      setLastSubscriptionSale({
        id: `sub-renew-${Date.now()}`,
        sale_number: `SUB-${Date.now()}`,
        created_at: new Date().toISOString(),
        subtotal: amount,
        total: amount,
        payment_method: renewPaymentMethod,
        items: [
          {
            id: `sub-item-${Date.now()}`,
            quantity: monthsToAdd,
            unitPrice: Number(selectedCustomer.monthlyFee || 0),
            subtotal: amount,
            product: { name: renewType === 'renewal' ? `Renovacion ${selectedCustomer.name}` : `Meses adicionales ${selectedCustomer.name}` }
          }
        ]
      })
      setSelectedId(null)
      setShowPrintModal(true)
    } finally {
      setRenewSubmitting(false)
    }
  }

  return (
    <div className="subscriptions-page text-[var(--text)]">
      <header className="subscriptions-page__header">
        <h1 className="subscriptions-page__title">Suscripciones</h1>
        <p className="subscriptions-page__subtitle">
          Administra clientes, mensualidades, renovaciones y ventas de suscripción.
        </p>
      </header>

      <section className="subscriptions-page__metrics">
        <article className="subscriptions-metric subscriptions-metric--active">
          <p className="subscriptions-metric__label">Activas</p>
          <p className="subscriptions-metric__value">{summary.active}</p>
        </article>
        <article className="subscriptions-metric subscriptions-metric--due">
          <p className="subscriptions-metric__label">Por vencer (7 dias)</p>
          <p className="subscriptions-metric__value">{summary.dueSoon}</p>
        </article>
        <article className="subscriptions-metric subscriptions-metric--expired">
          <p className="subscriptions-metric__label">Vencidas</p>
          <p className="subscriptions-metric__value">{summary.expired}</p>
        </article>
      </section>

      <section className="subscriptions-page__content">
        <article className="subscriptions-panel subscriptions-panel--form">
          <h2 className="subscriptions-panel__title">Alta de cliente</h2>
          <form className="subscriptions-form" onSubmit={handleCreate}>
            <div className="subscriptions-field subscriptions-field--full">
              <label className="subscriptions-field__label">Nombre del cliente</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: sanitizeName(e.target.value) }))}
                className="subscriptions-input subscriptions-input--full"
                placeholder="Ej. Juan Perez"
                minLength={3}
                maxLength={80}
                required
              />
            </div>

            <div className="subscriptions-field">
              <label className="subscriptions-field__label">Telefono</label>
              <input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: sanitizePhone(e.target.value) }))}
                className="subscriptions-input"
                placeholder="Opcional (10 digitos)"
                inputMode="numeric"
                pattern="[0-9]{10}"
                minLength={10}
                maxLength={10}
              />
            </div>

            <div className="subscriptions-field">
              <label className="subscriptions-field__label">Mensualidad</label>
              <select
                value={formData.monthlyFee}
                onChange={(e) => setFormData(prev => ({ ...prev, monthlyFee: e.target.value }))}
                className="subscriptions-input"
                required
              >
                {subscriptionPlans.map((plan) => (
                  <option key={plan} value={String(plan)}>
                    {formatMoney(plan)} / mes
                  </option>
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
                {showPlanEditor ? 'Ocultar configuracion' : 'Configurar mensualidades'}
              </button>
            </div>

            {showPlanEditor && (
              <div className="subscriptions-field subscriptions-field--full subscriptions-plans-editor">
                <label className="subscriptions-field__label">Opciones de mensualidad</label>
                <input
                  type="text"
                  value={plansRaw}
                  onChange={(e) => setPlansRaw(e.target.value)}
                  className="subscriptions-input subscriptions-input--full"
                  placeholder="199, 299, 399"
                  disabled={plansSaving}
                />
                <p className="subscriptions-field__hint">Separa importes por coma. Ejemplo: 199, 299, 399.</p>
                {plansError && <p className="subscriptions-inline-error">{plansError}</p>}
                {plansMessage && <p className="subscriptions-inline-success">{plansMessage}</p>}
                <div className="subscriptions-plans-editor__actions">
                  <button
                    type="button"
                    onClick={handleSavePlans}
                    disabled={plansSaving}
                    className="subscriptions-action-btn"
                  >
                    {plansSaving ? 'Guardando...' : 'Guardar mensualidades'}
                  </button>
                </div>
              </div>
            )}

            <div className="subscriptions-field subscriptions-field--full">
              <label className="subscriptions-field__label">Meses iniciales de suscripcion</label>
              <div className="subscriptions-stepper">
                <button
                  type="button"
                  className="subscriptions-stepper__btn"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      months: String(Math.max(1, parsedInitialMonths - 1))
                    }))
                  }}
                  aria-label="Restar meses"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={formData.months}
                  onChange={(e) => setFormData(prev => ({ ...prev, months: e.target.value }))}
                  onBlur={() => {
                    const parsedMonths = Number(formData.months)
                    if (!formData.months || Number.isNaN(parsedMonths) || parsedMonths < 1) {
                      setFormData(prev => ({ ...prev, months: '1' }))
                    }
                  }}
                  className="subscriptions-stepper__input"
                  placeholder="1"
                />
                <button
                  type="button"
                  className="subscriptions-stepper__btn"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      months: String(parsedInitialMonths + 1)
                    }))
                  }}
                  aria-label="Sumar meses"
                >
                  +
                </button>
              </div>
              <p className="subscriptions-field__hint">Cuantos meses paga al dar de alta. Normalmente 1.</p>
              <p className="subscriptions-field__hint subscriptions-field__hint--strong">
                Cobro inicial a registrar: {formatMoney(initialCharge)}
              </p>
            </div>

            <button
              type="submit"
              className="subscriptions-submit"
            >
              Guardar cliente
            </button>
          </form>
        </article>

        <article className="subscriptions-panel subscriptions-panel--list">
          <div className="subscriptions-panel__header">
            <h2 className="subscriptions-panel__title">Clientes con suscripcion</h2>
            <span className="subscriptions-panel__counter">{visibleCustomers.length} / {customers.length} cliente(s)</span>
          </div>

          <div className="subscriptions-list-toolbar">
            <input
              type="text"
              value={subscribersSearch}
              onChange={(e) => setSubscribersSearch(e.target.value)}
              className="subscriptions-list-search"
              placeholder="Buscar suscriptor por nombre o telefono"
            />
            <div className="subscriptions-sort-group">
              <button
                type="button"
                className={`subscriptions-sort-btn ${listSort.key === 'alpha' ? 'subscriptions-sort-btn--active' : ''}`}
                onClick={() => cycleListSort('alpha')}
              >
                ABC {listSort.key === 'alpha' && listSort.direction === 'asc' ? '↑' : ''}{listSort.key === 'alpha' && listSort.direction === 'desc' ? '↓' : ''}
              </button>
              <button
                type="button"
                className={`subscriptions-sort-btn ${listSort.key === 'date' ? 'subscriptions-sort-btn--active' : ''}`}
                onClick={() => cycleListSort('date')}
              >
                Fecha {listSort.key === 'date' && listSort.direction === 'asc' ? '↑' : ''}{listSort.key === 'date' && listSort.direction === 'desc' ? '↓' : ''}
              </button>
              <button
                type="button"
                className={`subscriptions-sort-btn ${listSort.key === 'price' ? 'subscriptions-sort-btn--active' : ''}`}
                onClick={() => cycleListSort('price')}
              >
                Precio {listSort.key === 'price' && listSort.direction === 'asc' ? '↑' : ''}{listSort.key === 'price' && listSort.direction === 'desc' ? '↓' : ''}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="subscriptions-state-box">
              Cargando suscripciones...
            </div>
          ) : visibleCustomers.length === 0 ? (
            <div className="subscriptions-state-box subscriptions-state-box--empty">
              No se encontraron suscriptores con esos filtros.
            </div>
          ) : (
            <div className="subscriptions-list-scroll">
              {visibleCustomers.map((customer) => {
                const status = getStatusMeta(customer)
                const isSelected = selectedId === customer.id

                return (
                  <div
                    key={customer.id}
                    className={`subscriptions-customer ${
                      isSelected ? 'subscriptions-customer--selected' : ''
                    }`}
                  >
                    <div className="subscriptions-customer__top">
                      <div className="subscriptions-customer__identity">
                        <p className="subscriptions-customer__name">{customer.name}</p>
                        <p className="subscriptions-customer__phone">{customer.phone || 'Sin telefono'}</p>
                        <p className="subscriptions-customer__meta">Mensualidad: {formatMoney(customer.monthlyFee)}</p>
                        <p className="subscriptions-customer__meta subscriptions-customer__meta--secondary">{formatDays(customer)}</p>
                      </div>
                      <span className={`subscriptions-status text-xs px-2 py-1 rounded-full border ${statusClasses[status.tone]}`}>
                        {status.label}
                      </span>
                    </div>

                    <div className="subscriptions-customer__actions">
                      <button
                        type="button"
                        onClick={() => openEditModal(customer)}
                        className="subscriptions-action subscriptions-action--edit"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(customer.id)
                          setMonthsToAdd(1)
                          setRenewType('add_months')
                          setRenewPaymentMethod('cash')
                        }}
                        className="subscriptions-action subscriptions-action--add"
                      >
                        Agregar meses
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('¿Cancelar esta suscripción?')) {
                            cancelCustomer(customer.id)
                          }
                        }}
                        className="subscriptions-action subscriptions-action--cancel"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </article>
      </section>

      {selectedCustomer && (
        <section className="fixed inset-0 z-40 bg-black/50 grid place-items-center p-4" onClick={() => !renewSubmitting && setSelectedId(null)}>
          <article className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Agregar meses</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Cliente: {selectedCustomer.name}
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <p className="subscriptions-modal-label-text">Meses a agregar</p>
                <div className="subscriptions-stepper">
                  <button
                    type="button"
                    className="subscriptions-stepper__btn"
                    onClick={() => setMonthsToAdd((prev) => Math.max(1, prev - 1))}
                    disabled={renewSubmitting || monthsToAdd <= 1}
                    aria-label="Restar mes"
                  >
                    -
                  </button>
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
                  <button
                    type="button"
                    className="subscriptions-stepper__btn"
                    onClick={() => setMonthsToAdd((prev) => (Number(prev) || 1) + 1)}
                    disabled={renewSubmitting}
                    aria-label="Sumar mes"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="subscriptions-modal-summary">
                <span>Mensualidad:</span>
                <span>{formatMoney(selectedCustomer.monthlyFee)}</span>
                <span>Meses:</span>
                <span>{monthsToAdd}</span>
                <span className="font-semibold">Total a cobrar:</span>
                <span className="font-semibold">{formatMoney((selectedCustomer.monthlyFee || 0) * monthsToAdd)}</span>
              </div>

              <div>
                <p className="subscriptions-modal-label-text">Metodo de pago</p>
                <div className="subscriptions-payment-options">
                  {[
                    { id: 'cash', label: 'Efectivo' },
                    { id: 'card', label: 'Tarjeta' },
                    { id: 'transfer', label: 'Transferencia' }
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      className={`subscriptions-payment-option ${renewPaymentMethod === method.id ? 'subscriptions-payment-option--active' : ''}`}
                      onClick={() => setRenewPaymentMethod(method.id)}
                      disabled={renewSubmitting}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                className="subscriptions-modal-btn"
                onClick={() => setSelectedId(null)}
                disabled={renewSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="subscriptions-modal-btn subscriptions-modal-btn--primary"
                onClick={handleConfirmRenew}
                disabled={renewSubmitting}
              >
                {renewSubmitting ? 'Procesando...' : 'Cobrar y guardar'}
              </button>
            </div>
          </article>
        </section>
      )}

      {editingCustomer && (
        <section className="fixed inset-0 z-40 bg-black/50 grid place-items-center p-4" onClick={closeEditModal}>
          <article className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Editar suscriptor</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Modifica nombre, telefono o mensualidad.
            </p>

            <div className="mt-4 space-y-3">
              <label className="subscriptions-modal-label">
                Nombre
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: sanitizeName(e.target.value) }))}
                  className="subscriptions-modal-input"
                  minLength={3}
                  maxLength={80}
                />
              </label>

              <label className="subscriptions-modal-label">
                Telefono
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, phone: sanitizePhone(e.target.value) }))}
                  className="subscriptions-modal-input"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  minLength={10}
                  maxLength={10}
                  placeholder="Opcional (10 digitos)"
                />
              </label>

              <label className="subscriptions-modal-label">
                Mensualidad
                <select
                  value={editForm.monthlyFee}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, monthlyFee: e.target.value }))}
                  className="subscriptions-modal-input"
                >
                  {subscriptionPlans.map((plan) => (
                    <option key={plan} value={String(plan)}>
                      {formatMoney(plan)} / mes
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                className="subscriptions-modal-btn"
                onClick={closeEditModal}
                disabled={editSaving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="subscriptions-modal-btn subscriptions-modal-btn--primary"
                onClick={handleSaveEdit}
                disabled={editSaving}
              >
                {editSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </article>
        </section>
      )}

      {showCheckoutModal && (
        <section className="fixed inset-0 z-40 bg-black/50 grid place-items-center p-4" onClick={() => !checkoutSubmitting && setShowCheckoutModal(false)}>
          <article className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Confirmar cobro inicial</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Cliente: {formData.name}
            </p>

            <div className="mt-4 rounded-lg border border-[var(--border)] p-3 text-sm space-y-1">
              <p>Mensualidad: {formatMoney(formData.monthlyFee)}</p>
              <p>Meses iniciales: {parsedInitialMonths}</p>
              <p className="font-semibold">Total a cobrar: {formatMoney(initialCharge)}</p>
            </div>

            <div className="mt-4">
              <label className="text-sm block mb-1">Metodo de pago</label>
              <div className="subscriptions-payment-options">
                {[
                  { id: 'cash', label: 'Efectivo' },
                  { id: 'card', label: 'Tarjeta' },
                  { id: 'transfer', label: 'Transferencia' }
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    className={`subscriptions-payment-option ${checkoutPaymentMethod === method.id ? 'subscriptions-payment-option--active' : ''}`}
                    onClick={() => setCheckoutPaymentMethod(method.id)}
                    disabled={checkoutSubmitting}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                className="rounded-lg border border-[var(--border)] px-3 py-2"
                onClick={() => setShowCheckoutModal(false)}
                disabled={checkoutSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-lg bg-[var(--accent)] text-black font-semibold px-3 py-2"
                onClick={handleConfirmCreate}
                disabled={checkoutSubmitting}
              >
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
