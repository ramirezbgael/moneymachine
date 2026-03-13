import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFinanceCustomersStore } from '../../store/financeCustomersStore'
import { useSubscriptionStore } from '../../store/subscriptionStore'
import './Customers.css'

const normalizePhone = (value) => String(value || '').replace(/\D/g, '')

const Customers = () => {
  const navigate = useNavigate()
  const {
    customers: financeCustomers,
    loading: financeLoading,
    fetchCustomers,
    addCustomer
  } = useFinanceCustomersStore()
  const {
    customers: subscriptionCustomers,
    loading: subscriptionLoading,
    loadCustomers: loadSubscriptionCustomers
  } = useSubscriptionStore()

  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCustomers()
    loadSubscriptionCustomers()
  }, [fetchCustomers, loadSubscriptionCustomers])

  const combinedCustomers = useMemo(() => {
    const financeList = (financeCustomers || []).map((c) => ({
      id: c.id,
      financeId: c.id,
      subscriptionId: null,
      key: `fin-${c.id}`,
      name: c.name,
      phone: c.phone,
      email: c.email,
      source: 'finance',
      onOpen: () => navigate(`/clientes/${c.id}`)
    }))

    const subscriptionList = (subscriptionCustomers || []).map((c) => ({
      id: c.id,
      financeId: null,
      subscriptionId: c.id,
      key: `sub-${c.id}`,
      name: c.name,
      phone: c.phone,
      email: '',
      source: 'subscription',
      onOpen: () => navigate(`/suscripciones/${c.id}`)
    }))

    const merged = []
    const byPhone = new Map()

    const pushEntry = (entry) => {
      const phoneKey = normalizePhone(entry.phone)

      // If no usable phone, keep as standalone card.
      if (!phoneKey) {
        merged.push({
          ...entry,
          badgeLabel: entry.source === 'subscription' ? 'Suscriptor mensual' : 'Cliente CxC',
          badgeClass: entry.source === 'subscription' ? 'customers-badge--subscription' : 'customers-badge--finance'
        })
        return
      }

      if (!byPhone.has(phoneKey)) {
        byPhone.set(phoneKey, {
          ...entry,
          phone: phoneKey,
          hasSubscription: entry.source === 'subscription',
          hasFinance: entry.source === 'finance',
          financeId: entry.financeId || null,
          subscriptionId: entry.subscriptionId || null
        })
        return
      }

      const current = byPhone.get(phoneKey)
      const next = {
        ...current,
        hasSubscription: current.hasSubscription || entry.source === 'subscription',
        hasFinance: current.hasFinance || entry.source === 'finance',
        financeId: current.financeId || entry.financeId || null,
        subscriptionId: current.subscriptionId || entry.subscriptionId || null
      }

      // Prefer navigating to subscription detail when both exist.
      if (entry.source === 'subscription') {
        next.id = entry.id
        next.key = entry.key
        next.name = entry.name || current.name
        next.email = entry.email || current.email
        next.source = 'subscription'
        next.onOpen = entry.onOpen
      }

      byPhone.set(phoneKey, next)
    }

    ;[...subscriptionList, ...financeList].forEach(pushEntry)

    byPhone.forEach((item) => {
      let badgeLabel = 'Cliente CxC'
      let badgeClass = 'customers-badge--finance'
      let onOpen = item.onOpen

      if (item.hasSubscription && item.hasFinance) {
        badgeLabel = 'Suscriptor + Cliente CxC'
        badgeClass = 'customers-badge--hybrid'
        if (item.financeId) {
          onOpen = () => navigate(`/clientes/${item.financeId}`)
        }
      } else if (item.hasSubscription) {
        badgeLabel = 'Suscriptor mensual'
        badgeClass = 'customers-badge--subscription'
        if (item.subscriptionId) {
          onOpen = () => navigate(`/suscripciones/${item.subscriptionId}`)
        }
      } else if (item.financeId) {
        onOpen = () => navigate(`/clientes/${item.financeId}`)
      }

      merged.push({
        ...item,
        badgeLabel,
        badgeClass,
        onOpen
      })
    })

    return merged
  }, [financeCustomers, navigate, subscriptionCustomers])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return combinedCustomers
    return combinedCustomers.filter((c) => {
      return [c.name, c.phone, c.email, c.badgeLabel].some((field) => String(field || '').toLowerCase().includes(q))
    })
  }, [combinedCustomers, query])

  const summary = useMemo(() => {
    const totals = {
      total: combinedCustomers.length,
      subscribers: 0,
      cxc: 0,
      hybrid: 0
    }

    combinedCustomers.forEach((customer) => {
      const label = String(customer.badgeLabel || '').toLowerCase()
      if (label.includes('suscriptor + cliente')) {
        totals.hybrid += 1
        return
      }
      if (label.includes('suscriptor')) {
        totals.subscribers += 1
        return
      }
      totals.cxc += 1
    })

    return totals
  }, [combinedCustomers])

  const handleCreateCustomer = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const created = await addCustomer(form)
      setForm({ name: '', phone: '', email: '', notes: '' })
      setShowForm(false)
      if (created?.id) navigate(`/clientes/${created.id}`)
    } catch (error) {
      window.alert(error?.message || 'No se pudo guardar el cliente')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="customers-page">
      <div className="customers-shell">
      <header className="customers-header">
        <div>
          <h1 className="customers-title">Clientes</h1>
          <p className="customers-subtitle">Administra clientes y sus cuentas por cobrar.</p>
        </div>
      </header>

      <section className="customers-compact-kpis hidden md:flex" aria-label="Resumen de clientes">
        <span>Total <strong>{summary.total}</strong></span>
        <span>Suscriptores <strong>{summary.subscribers}</strong></span>
        <span>CxC <strong>{summary.cxc}</strong></span>
        <span>Mixtos <strong>{summary.hybrid}</strong></span>
      </section>

      {showForm && (
        <section className="customers-form-panel">
          <h2 className="customers-form-title">Nuevo cliente</h2>
          <form className="customers-form-grid" onSubmit={handleCreateCustomer}>
            <input
              type="text"
              required
              placeholder="Nombre"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="customers-input"
            />
            <input
              type="text"
              placeholder="Teléfono"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className="customers-input"
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="customers-input"
            />
            <input
              type="text"
              placeholder="Notas"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="customers-input"
            />
            <div className="customers-form-actions">
              <button
                type="submit"
                disabled={saving}
                className="customers-btn-primary"
              >
                {saving ? 'Guardando...' : 'Guardar cliente'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="customers-btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="customers-page__content">
        <article className="customers-panel customers-panel--list">
          <div className="customers-panel__header hidden md:flex">
            <h2 className="customers-panel__title">Lista de clientes</h2>
            <span className="customers-panel__counter">{filtered.length} / {combinedCustomers.length} cliente(s)</span>
          </div>

          <div className="customers-list-search-wrap">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente por nombre, teléfono o email"
              className="customers-search"
            />
          </div>

          {financeLoading || subscriptionLoading ? (
            <div className="customers-empty">Cargando clientes...</div>
          ) : (
            <div className="customers-list">
              {filtered.length === 0 && (
                <div className="customers-empty">No hay clientes registrados.</div>
              )}
              {filtered.map((cliente) => (
                <button
                  key={cliente.key}
                  type="button"
                  onClick={cliente.onOpen}
                  className="customers-card"
                >
                  <div className="customers-card-head">
                    <div className="customers-card-main">
                      <p className="customers-card-name">{cliente.name}</p>
                      <p className="customers-card-phone">{cliente.phone || 'Sin teléfono'}</p>
                      {cliente.email && <p className="customers-card-email">{cliente.email}</p>}
                    </div>
                    <span className={`customers-badge ${cliente.badgeClass}`}>
                      {cliente.badgeLabel}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </article>
      </section>

      <div className="customers-spacer" aria-hidden="true" />

      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="customers-fab"
      >
        + Nuevo cliente
      </button>
      </div>
    </div>
  )
}

export default Customers
