import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaArrowDown, FaArrowUp, FaClipboardList, FaSearch, FaUser, FaUserFriends, FaUserPlus } from 'react-icons/fa'
import { useFinanceCustomersStore } from '../../store/financeCustomersStore'
import { useSubscriptionStore } from '../../store/subscriptionStore'
import { LiquidButton } from '../Inventory/LiquidButton'
import '../common/hub-cards.css'
import './Customers.css'

const ITEMS_PER_PAGE = 10

const normalizePhone = (value) => String(value || '').replace(/\D/g, '')

const getClientKind = (c) => {
  const label = String(c.badgeLabel || '')
  if (label.includes('Suscriptor + Cliente')) return 'hybrid'
  if (label.includes('Suscriptor')) return 'subscription'
  return 'finance'
}

const shortBadge = (kind) => {
  if (kind === 'hybrid') return 'Mixto'
  if (kind === 'subscription') return 'Sub'
  return 'CxC'
}

const badgePillClass = (kind) => {
  if (kind === 'hybrid') {
    return 'border-[var(--accent)]/40 bg-[var(--accent)]/12 text-[var(--accent)]'
  }
  if (kind === 'subscription') {
    return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
  }
  return 'border-[var(--border)] bg-[var(--panel)]/80 text-[var(--muted)]'
}

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

  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('empty')
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [filterKind, setFilterKind] = useState('all')
  const [nameSortDir, setNameSortDir] = useState('asc')
  const [currentPage, setCurrentPage] = useState(1)

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

  const autocompleteItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return combinedCustomers
      .filter((c) =>
        [c.name, c.phone, c.email, c.badgeLabel].some((field) =>
          String(field || '').toLowerCase().includes(q)
        )
      )
      .slice(0, 6)
  }, [combinedCustomers, search])

  useEffect(() => {
    if (!showAutocomplete || !search.trim()) {
      setHighlightedIndex(-1)
      return
    }
    const totalOptions = autocompleteItems.length > 0 ? autocompleteItems.length + 1 : 0
    if (totalOptions === 0) {
      setHighlightedIndex(-1)
      return
    }
    if (highlightedIndex >= totalOptions) setHighlightedIndex(totalOptions - 1)
  }, [showAutocomplete, search, autocompleteItems.length, highlightedIndex])

  const filteredForResults = useMemo(() => {
    let list = combinedCustomers
    if (filterKind !== 'all') {
      list = list.filter((c) => getClientKind(c) === filterKind)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((c) =>
        [c.name, c.phone, c.email, c.badgeLabel].some((field) =>
          String(field || '').toLowerCase().includes(q)
        )
      )
    }
    return [...list].sort((a, b) => {
      const av = (a.name || '').toLowerCase()
      const bv = (b.name || '').toLowerCase()
      if (av < bv) return nameSortDir === 'asc' ? -1 : 1
      if (av > bv) return nameSortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [combinedCustomers, filterKind, search, nameSortDir])

  const totalPages = Math.max(1, Math.ceil(filteredForResults.length / ITEMS_PER_PAGE))
  const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedClients = filteredForResults.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE)
  const showingFrom = filteredForResults.length === 0 ? 0 : pageStartIndex + 1
  const showingTo = Math.min(pageStartIndex + ITEMS_PER_PAGE, filteredForResults.length)

  useEffect(() => {
    setCurrentPage(1)
  }, [search, filterKind, nameSortDir, viewMode])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const visiblePageEnd = Math.min(totalPages, currentPage + 2)
  const visiblePageStart = Math.max(1, visiblePageEnd - 4)
  const visiblePages = Array.from(
    { length: visiblePageEnd - visiblePageStart + 1 },
    (_, idx) => visiblePageStart + idx
  )

  const summary = useMemo(() => {
    const totals = {
      total: combinedCustomers.length,
      subscribers: 0,
      cxc: 0,
      hybrid: 0
    }
    combinedCustomers.forEach((customer) => {
      const k = getClientKind(customer)
      if (k === 'hybrid') totals.hybrid += 1
      else if (k === 'subscription') totals.subscribers += 1
      else totals.cxc += 1
    })
    return totals
  }, [combinedCustomers])

  const loading = financeLoading || subscriptionLoading

  const cycleSort = () => {
    setNameSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
  }

  const handleSearchSubmit = () => {
    setShowAutocomplete(false)
    setHighlightedIndex(-1)
    setViewMode('results')
  }

  const handleSelectCliente = (cliente) => {
    setShowAutocomplete(false)
    setHighlightedIndex(-1)
    cliente.onOpen()
  }

  const handleLoadAll = () => {
    setViewMode('results')
  }

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

  const FILTER_TABS = [
    { id: 'all', label: 'Todos' },
    { id: 'subscription', label: 'Suscriptores' },
    { id: 'finance', label: 'CxC' },
    { id: 'hybrid', label: 'Mixtos' }
  ]

  return (
    <div className="mm-page mm-page--flush flex flex-col">
      <div className="mm-shell mm-shell--wide w-full flex-1 flex flex-col min-h-0">
        <h1 className="text-2xl font-bold text-[var(--text)] mb-1">Clientes</h1>
        <p className="text-sm text-[var(--muted)] mb-4">Administra clientes y sus cuentas por cobrar.</p>

        {viewMode === 'empty' ? (
          <div className="max-w-3xl mx-auto flex-1 flex flex-col justify-start md:justify-center pt-2 md:pt-0 pb-10 md:pb-0 w-full">
            <div className="mb-6">
              <div className="relative">
                <div className="hub-search">
                  <FaSearch className="hub-search__icon" aria-hidden />
                  <input
                    type="text"
                    placeholder="Buscar cliente por nombre, teléfono o email..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setHighlightedIndex(-1)
                    }}
                    onFocus={() => setShowAutocomplete(true)}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setShowAutocomplete(false)
                        setHighlightedIndex(-1)
                      }, 120)
                    }}
                    onKeyDown={(e) => {
                      if (!search.trim()) return

                      if (e.key === 'Escape') {
                        e.preventDefault()
                        setShowAutocomplete(false)
                        setHighlightedIndex(-1)
                        return
                      }

                      const totalOptions = autocompleteItems.length > 0 ? autocompleteItems.length + 1 : 0

                      if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        setShowAutocomplete(true)
                        if (totalOptions > 0) {
                          setHighlightedIndex((prev) => (prev + 1 + totalOptions) % totalOptions)
                        }
                        return
                      }

                      if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        setShowAutocomplete(true)
                        if (totalOptions > 0) {
                          setHighlightedIndex((prev) => (prev - 1 + totalOptions) % totalOptions)
                        }
                        return
                      }

                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (
                          showAutocomplete &&
                          autocompleteItems.length > 0 &&
                          highlightedIndex >= 0 &&
                          highlightedIndex < autocompleteItems.length
                        ) {
                          handleSelectCliente(autocompleteItems[highlightedIndex])
                          return
                        }
                        if (
                          showAutocomplete &&
                          autocompleteItems.length > 0 &&
                          highlightedIndex === autocompleteItems.length
                        ) {
                          handleSearchSubmit()
                          return
                        }
                        handleSearchSubmit()
                      }
                    }}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    autoCapitalize="off"
                    autoFocus
                    aria-label="Buscar clientes"
                  />
                </div>

                {showAutocomplete && search.trim() && (
                  <div className="absolute left-0 right-0 top-[calc(100%+10px)] rounded-2xl bg-[var(--panel)] border border-[var(--border)]/50 shadow-2xl shadow-black/20 z-40 overflow-hidden">
                    {loading && combinedCustomers.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-[var(--muted)]">Cargando clientes...</div>
                    ) : autocompleteItems.length > 0 ? (
                      <>
                        {autocompleteItems.map((c, idx) => (
                          <button
                            key={c.key}
                            type="button"
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            onMouseDown={() => handleSelectCliente(c)}
                            className={`w-full text-left px-4 py-3 border-b border-[var(--border)]/20 last:border-b-0 transition-colors ${
                              highlightedIndex === idx
                                ? 'bg-[var(--accent)]/14 border-l-2 border-l-[var(--accent)] shadow-[inset_0_0_0_1px_rgba(0,255,136,0.22)]'
                                : 'hover:bg-[var(--panel-2)]'
                            }`}
                          >
                            <div
                              className={`text-sm font-semibold ${
                                highlightedIndex === idx ? 'text-white' : 'text-[var(--text)]'
                              }`}
                            >
                              {c.name}
                            </div>
                            <div className="text-xs text-[var(--muted)]">
                              {c.phone || 'Sin teléfono'}
                              {c.email ? ` · ${c.email}` : ''}
                            </div>
                          </button>
                        ))}
                        <button
                          type="button"
                          onMouseEnter={() => setHighlightedIndex(autocompleteItems.length)}
                          onMouseDown={() => handleSearchSubmit()}
                          className={`w-full text-left px-4 py-3 text-sm font-semibold text-[var(--accent)] transition-colors ${
                            highlightedIndex === autocompleteItems.length
                              ? 'bg-[var(--accent)]/14 border-l-2 border-l-[var(--accent)] text-white'
                              : 'hover:bg-[var(--accent)]/10'
                          }`}
                        >
                          Ver todos los resultados
                        </button>
                      </>
                    ) : (
                      <div className="px-4 py-3 text-sm text-[var(--muted)]">No se encontraron coincidencias</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <section className="hub-card-grid hub-card-grid--always-three mb-6" aria-label="Acciones rápidas de clientes">
              <button type="button" className="hub-card" onClick={() => setShowForm(true)}>
                <FaUserPlus className="hub-card__icon" aria-hidden />
                <h3>Nuevo cliente</h3>
                <p>Registra un cliente para CxC y seguimiento</p>
              </button>

              <button
                type="button"
                className="hub-card"
                disabled={!search.trim()}
                onClick={() => {
                  if (!search.trim()) return
                  handleSearchSubmit()
                }}
              >
                <FaSearch className="hub-card__icon" aria-hidden />
                <h3>Buscar</h3>
                <p>Ir a resultados con el texto actual</p>
              </button>

              <button type="button" className="hub-card" onClick={handleLoadAll}>
                <FaClipboardList className="hub-card__icon" aria-hidden />
                <h3>Ver todos</h3>
                <p>Lista completa en dos columnas</p>
              </button>
            </section>

            <div className="text-center py-6">
              <p className="text-[var(--muted)] text-sm">Busca un cliente o elige una acción rápida para comenzar.</p>
            </div>

            <section
              className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)]/60 bg-[var(--panel)]/55 px-3 py-2 justify-center md:justify-start"
              aria-label="Resumen de clientes"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)]/70 px-2.5 py-1 text-[11px] text-[var(--muted)]">
                Total <strong className="text-[var(--text)] text-xs">{summary.total}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)]/70 px-2.5 py-1 text-[11px] text-[var(--muted)]">
                Sub <strong className="text-[var(--text)] text-xs">{summary.subscribers}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)]/70 px-2.5 py-1 text-[11px] text-[var(--muted)]">
                CxC <strong className="text-[var(--text)] text-xs">{summary.cxc}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)]/70 px-2.5 py-1 text-[11px] text-[var(--muted)]">
                Mixtos <strong className="text-[var(--text)] text-xs">{summary.hybrid}</strong>
              </span>
            </section>
          </div>
        ) : (
          <>
            <section
              className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)]/60 bg-[var(--panel)]/55 px-3 py-2"
              aria-label="Resumen de clientes"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)]/70 px-2.5 py-1 text-[11px] text-[var(--muted)]">
                Total <strong className="text-[var(--text)] text-xs">{summary.total}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)]/70 px-2.5 py-1 text-[11px] text-[var(--muted)]">
                Sub <strong className="text-[var(--text)] text-xs">{summary.subscribers}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)]/70 px-2.5 py-1 text-[11px] text-[var(--muted)]">
                CxC <strong className="text-[var(--text)] text-xs">{summary.cxc}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)]/70 px-2.5 py-1 text-[11px] text-[var(--muted)]">
                Mixtos <strong className="text-[var(--text)] text-xs">{summary.hybrid}</strong>
              </span>
              <span className="ml-auto text-[11px] text-[var(--muted)] tabular-nums">
                {filteredForResults.length} / {combinedCustomers.length} cliente(s)
              </span>
            </section>

            <div className="mb-4 grid gap-3 lg:grid-cols-[auto,1fr] lg:items-end">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setViewMode('empty')}
                  className="block text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                >
                  ← Volver al inicio
                </button>
                <nav
                  className="inline-flex flex-wrap gap-0.5 rounded-lg bg-[var(--panel)]/60 p-0.5 border border-[var(--border)]/40"
                  aria-label="Tipo de cliente"
                >
                  {FILTER_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilterKind(tab.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                        filterKind === tab.id
                          ? 'bg-[var(--accent-soft)]/80 text-[var(--accent)] shadow-md'
                          : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)]/40'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
              <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 lg:justify-end">
                <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)]/40 bg-[var(--panel)]/55 p-1 shrink-0">
                  <button
                    type="button"
                    onClick={cycleSort}
                    className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors bg-[var(--accent-soft)]/80 text-[var(--accent)]"
                    title="Orden alfabético"
                  >
                    <span>A</span>
                    {nameSortDir === 'asc' ? <FaArrowUp className="w-3 h-3" /> : null}
                    {nameSortDir === 'desc' ? <FaArrowDown className="w-3 h-3" /> : null}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Buscar por nombre, teléfono o email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] px-4 py-2.5 text-sm font-medium text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 min-w-[12rem] flex-1 lg:max-w-xs transition-all"
                  aria-label="Buscar cliente"
                />
                <LiquidButton size="sm" onClick={() => setShowForm(true)}>
                  <span className="whitespace-nowrap">+ Nuevo cliente</span>
                </LiquidButton>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl bg-[var(--panel)]/40 py-16 text-center text-sm text-[var(--muted)]">
                Cargando clientes...
              </div>
            ) : filteredForResults.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel)]/30 py-16 text-center text-sm text-[var(--muted)]">
                No hay clientes con estos filtros.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 flex-1 min-h-0 content-start">
                {paginatedClients.map((cliente) => {
                  const kind = getClientKind(cliente)
                  return (
                    <button
                      key={cliente.key}
                      type="button"
                      onClick={() => cliente.onOpen()}
                      className="flex items-center gap-2 rounded-xl bg-[var(--panel)]/35 py-2 px-2.5 text-left transition-all duration-200 hover:bg-[var(--panel)]/60 hover:shadow-lg hover:shadow-[var(--accent)]/10 backdrop-blur-sm cursor-pointer min-w-0 w-full border border-transparent hover:border-[var(--accent)]/20"
                    >
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[var(--panel)]/60 flex-shrink-0 flex items-center justify-center">
                        {kind === 'hybrid' ? (
                          <FaUserFriends className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--accent)]" aria-hidden />
                        ) : (
                          <FaUser className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--accent)]" aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[var(--text)] truncate text-sm leading-tight">{cliente.name}</div>
                        <div className="text-[10px] sm:text-[11px] text-[var(--muted)] truncate leading-tight">
                          {cliente.phone || 'Sin teléfono'}
                          {cliente.email ? ` · ${cliente.email}` : ''}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border tabular-nums ${badgePillClass(kind)}`}
                      >
                        {shortBadge(kind)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {!loading && filteredForResults.length > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 py-2 pb-8 md:pb-2">
                <p className="text-xs text-[var(--muted)] order-2 sm:order-1">
                  Mostrando {showingFrom}-{showingTo} de {filteredForResults.length} cliente(s)
                </p>
                {filteredForResults.length > ITEMS_PER_PAGE && (
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
          </>
        )}
      </div>

      <button type="button" onClick={() => setShowForm(true)} className="customers-fab md:hidden" aria-label="Nuevo cliente">
        + Nuevo cliente
      </button>

      {showForm && (
        <section
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => !saving && setShowForm(false)}
        >
          <article
            className="customers-form-panel w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
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
                <button type="submit" disabled={saving} className="customers-btn-primary">
                  {saving ? 'Guardando...' : 'Guardar cliente'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="customers-btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </article>
        </section>
      )}
    </div>
  )
}

export default Customers
