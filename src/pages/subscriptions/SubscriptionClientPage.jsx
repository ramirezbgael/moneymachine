import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { FaArrowLeft, FaDownload, FaEdit, FaPhoneAlt, FaPrint, FaSave, FaSignInAlt, FaSignOutAlt, FaTimes, FaWhatsapp } from 'react-icons/fa'
import { useSubscriptionStore } from '../../store/subscriptionStore'
import { isSupabaseConfigured } from '../../lib/supabase'
import { fetchAccessRowsForMember, memberTimelineFromRows } from '../../services/subscriptionAccessService'
const dateFormatter = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
const dateTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})

const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`

const formatRenewalDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : dateFormatter.format(date)
}

const formatDateTime = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Sin registro' : dateTimeFormatter.format(date)
}

const sanitizeName = (value) => value
  .replace(/[^a-zA-Z0-9\s.'-]/g, '')
  .replace(/\s+/g, ' ')
  .slice(0, 80)

const sanitizePhone = (value) => value.replace(/\D/g, '').slice(0, 15)

const normalizeWhatsAppPhone = (value) => {
  const digits = sanitizePhone(value)
  if (!digits) return ''
  if (digits.length === 10) return `52${digits}`
  if (digits.length === 12 && digits.startsWith('52')) return digits
  return digits
}

const getStatusMeta = (customer) => {
  if (customer.status === 'cancelled') return { label: 'Cancelada', tone: 'mm-status mm-status--neutral' }
  if (customer.daysLeft < 0) return { label: 'Vencida', tone: 'mm-status mm-status--danger' }
  if (customer.daysLeft <= 7) return { label: 'Por vencer', tone: 'mm-status mm-status--warn' }
  return { label: 'Activa', tone: 'mm-status mm-status--ok' }
}

const getAppBaseUrl = () => {
  const configuredUrl = String(import.meta.env.VITE_PUBLIC_APP_URL || '').trim()
  if (configuredUrl) return configuredUrl.replace(/\/$/, '')
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin
  return 'https://moneymachinepos.netlify.app'
}

const SubscriptionClientPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const qrWrapperRef = useRef(null)
  const {
    customers,
    subscriptionPlans,
    loading,
    loadCustomers,
    loadSubscriptionPlans,
    updateCustomer
  } = useSubscriptionStore()

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [editForm, setEditForm] = useState({ name: '', phone: '', monthlyFee: '' })
  const [accessRows, setAccessRows] = useState([])
  const [accessLoading, setAccessLoading] = useState(false)
  const [accessError, setAccessError] = useState('')

  const accessTimeline = useMemo(() => memberTimelineFromRows(accessRows), [accessRows])
  const lastAccessKind = accessTimeline.length > 0 ? accessTimeline[0].kind : null

  useEffect(() => {
    loadCustomers()
    loadSubscriptionPlans()
  }, [loadCustomers, loadSubscriptionPlans])

  const customer = useMemo(() => customers.find((entry) => String(entry.id) === String(id)) || null, [customers, id])
  const status = customer ? getStatusMeta(customer) : null
  const appBaseUrl = useMemo(() => getAppBaseUrl(), [])
  const qrValue = customer ? `${appBaseUrl}/check/${customer.id}` : ''
  const phone = sanitizePhone(customer?.phone || '')
  const whatsappPhone = normalizeWhatsAppPhone(customer?.phone || '')
  const availablePlans = useMemo(() => {
    const currentFee = Number(customer?.monthlyFee || 0)
    const planSet = new Set([...(subscriptionPlans || []), ...(currentFee > 0 ? [currentFee] : [])].map((plan) => Number(plan)))
    return Array.from(planSet).filter((plan) => Number.isFinite(plan) && plan > 0).sort((a, b) => a - b)
  }, [customer?.monthlyFee, subscriptionPlans])

  useEffect(() => {
    if (!customer) return
    setEditForm({
      name: customer.name || '',
      phone: customer.phone || '',
      monthlyFee: String(customer.monthlyFee || availablePlans[0] || '')
    })
  }, [availablePlans, customer])

  useEffect(() => {
    let cancelled = false

    const loadAccess = async () => {
      if (!customer?.id || !isSupabaseConfigured()) {
        if (!cancelled) {
          setAccessRows([])
          setAccessError('')
        }
        return
      }

      if (!cancelled) {
        setAccessLoading(true)
        setAccessError('')
      }

      try {
        const rows = await fetchAccessRowsForMember(customer.id, 100)
        if (!cancelled) setAccessRows(rows || [])
      } catch (error) {
        console.error('Error loading access events:', error)
        if (!cancelled) {
          setAccessRows([])
          setAccessError('No se pudo cargar el historial de accesos.')
        }
      } finally {
        if (!cancelled) setAccessLoading(false)
      }
    }

    loadAccess()
    return () => {
      cancelled = true
    }
  }, [customer?.id])

  const getQrCanvas = () => qrWrapperRef.current?.querySelector('canvas') || null

  const handleDownloadQr = () => {
    const canvas = getQrCanvas()
    if (!canvas || !customer) return

    const anchor = document.createElement('a')
    anchor.href = canvas.toDataURL('image/png')
    anchor.download = `moneymachine-qr-${customer.id}.png`
    anchor.click()
  }

  const handlePrintQr = () => {
    const canvas = getQrCanvas()
    if (!canvas || !customer) return

    const image = canvas.toDataURL('image/png')
    const printWindow = window.open('', '_blank', 'width=480,height=640')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>QR ${customer.name}</title>
          <style>
            body { background: #050816; color: #f4f4f5; font-family: Arial, sans-serif; margin: 0; padding: 32px; }
            .sheet { border: 1px solid #27272a; border-radius: 24px; padding: 24px; text-align: center; background: #09090b; }
            img { width: 260px; height: 260px; display: block; margin: 24px auto; }
            h1 { margin: 0 0 8px; font-size: 22px; }
            p { margin: 6px 0; color: #a1a1aa; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <h1>${customer.name}</h1>
            <p>${phone || 'Sin teléfono registrado'}</p>
            <img src="${image}" alt="QR de ${customer.name}" />
            <p>${qrValue}</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const handleSendWhatsapp = () => {
    if (!whatsappPhone || !customer) {
      setFeedback('Agrega un teléfono válido para enviar por WhatsApp.')
      return
    }
    const message = encodeURIComponent(`Hola ${customer.name}, aqui esta tu codigo QR de acceso a tu suscripcion de MoneyMachine: ${qrValue}`)
    window.open(`https://wa.me/${whatsappPhone}?text=${message}`, '_blank', 'noopener,noreferrer')
  }

  const handleSave = async () => {
    const normalizedName = editForm.name.trim()
    const normalizedPhone = sanitizePhone(editForm.phone)
    if (normalizedName.length < 3) {
      setFeedback('El nombre debe tener al menos 3 caracteres.')
      return
    }

    if (normalizedPhone && normalizedPhone.length !== 10) {
      setFeedback('El teléfono debe tener 10 dígitos.')
      return
    }

    setIsSaving(true)
    setFeedback('')
    try {
      await updateCustomer(customer.id, {
        name: normalizedName,
        phone: normalizedPhone,
        monthlyFee: editForm.monthlyFee
      })
      setIsEditing(false)
      setFeedback('Datos del cliente actualizados.')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading && !customer) {
    return (
      <div className="mm-page mm-page--flush flex items-center justify-center text-[var(--muted)]">
        Cargando cliente...
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="mm-page mm-page--flush">
        <div className="mm-shell mm-shell--lg mm-stack">
          <article className="mm-card mm-card--pad-lg">
            <button type="button" onClick={() => navigate('/subscriptions')} className="mm-back mb-6">
              <FaArrowLeft />
              Volver a suscripciones
            </button>
            <h1 className="text-2xl font-bold text-[var(--text)]">Cliente no encontrado</h1>
            <p className="mm-note mt-2">No existe un suscriptor con ese identificador o aún no se ha cargado en este tenant.</p>
          </article>
        </div>
      </div>
    )
  }

  return (
    <div className="mm-page mm-page--flush">
      <div className="mm-shell mm-shell--lg mm-stack">
        <div className="mm-topbar">
          <button type="button" onClick={() => navigate(-1)} className="mm-back">
            <FaArrowLeft />
            Regresar
          </button>
          <h1 className="mm-topbar-title">Cliente</h1>
          <span className={status.tone}>{status.label}</span>
        </div>

        <div className="mm-grid-detail">
          <section className="mm-stack">
            <article className="mm-card mm-card--hero mm-card--pad-lg overflow-hidden">
              <div className="mm-panel-head">
                <div>
                  <p className="mm-overline tracking-[0.24em]">Suscriptor</p>
                  <h2 className="mm-hero-title">{customer.name}</h2>
                  <p className="mm-customer-phone">
                    <FaPhoneAlt className="mm-phone-icon" />
                    {customer.phone || 'Sin teléfono registrado'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing((current) => !current)
                    setFeedback('')
                  }}
                  className="mm-btn mm-btn--ghost shrink-0"
                >
                  {isEditing ? <FaTimes /> : <FaEdit />}
                  {isEditing ? 'Cerrar edición' : 'Editar cliente'}
                </button>
              </div>

              <div className="mm-metrics-grid">
                <div className="mm-tile">
                  <p className="mm-overline">Mensualidad</p>
                  <p className="mm-metric-value mm-metric-value--accent">{formatMoney(customer.monthlyFee)}</p>
                </div>
                <div className="mm-tile">
                  <p className="mm-overline">Próxima renovación</p>
                  <p className="mm-metric-value text-xl">{formatRenewalDate(customer.endDate)}</p>
                  <p className="mm-mini-copy">{customer.daysLeft >= 0 ? `${customer.daysLeft} día(s) restantes` : `Vencida hace ${Math.abs(customer.daysLeft)} día(s)`}</p>
                </div>
              </div>

              <div className="mm-stats-grid">
                <div className="mm-tile">
                  <p className="mm-overline">Inicio</p>
                  <p className="mm-stat-value">{formatRenewalDate(customer.startDate)}</p>
                </div>
                <div className="mm-tile">
                  <p className="mm-overline">Meses pagados</p>
                  <p className="mm-stat-value">{Number(customer.monthsPurchased || 0)}</p>
                </div>
                <div className="mm-tile">
                  <p className="mm-overline">Total pagado</p>
                  <p className="mm-stat-value">{formatMoney(customer.totalPaid)}</p>
                </div>
              </div>
            </article>

            <article className="mm-card mm-card--pad-lg">
              <div className="mm-panel-head">
                <div>
                  <p className="mm-overline">Acciones del QR</p>
                  <h3 className="mm-stat-value mt-1 text-lg">Código QR de acceso</h3>
                </div>
                <span className="mm-pill shrink-0">Único por suscriptor</span>
              </div>

              <div className="mm-actions-grid mt-4">
                <button type="button" onClick={handleSendWhatsapp} disabled={!whatsappPhone} className="mm-btn mm-btn--accent-gradient inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <FaWhatsapp />
                  Enviar por WhatsApp
                </button>
                <button type="button" onClick={handleDownloadQr} className="mm-btn mm-btn--ghost inline-flex items-center justify-center gap-2">
                  <FaDownload />
                  Descargar QR
                </button>
                <button type="button" onClick={handlePrintQr} className="mm-btn mm-btn--ghost inline-flex items-center justify-center gap-2">
                  <FaPrint />
                  Imprimir QR
                </button>
                <button type="button" onClick={() => setIsEditing(true)} className="mm-btn mm-btn--ghost inline-flex items-center justify-center gap-2">
                  <FaEdit />
                  Editar cliente
                </button>
              </div>

              {!whatsappPhone && <p className="mm-note mt-3">Agrega un teléfono válido para habilitar WhatsApp.</p>}
            </article>

            {isEditing && (
              <article className="mm-card mm-card--pad-lg">
                <div className="mm-panel-head">
                  <div>
                    <p className="mm-overline">Edición</p>
                    <h3 className="mm-stat-value mt-1 text-lg">Modificar datos del cliente</h3>
                  </div>
                </div>

                <div className="mm-form-grid mt-4">
                  <label className="block">
                    <span className="mm-note block mb-2">Nombre</span>
                    <input type="text" value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: sanitizeName(event.target.value) }))} className="mm-input" minLength={3} maxLength={80} />
                  </label>
                  <label className="block">
                    <span className="mm-note block mb-2">Teléfono</span>
                    <input type="text" value={editForm.phone} onChange={(event) => setEditForm((current) => ({ ...current, phone: sanitizePhone(event.target.value) }))} className="mm-input" inputMode="numeric" placeholder="10 dígitos" maxLength={10} />
                  </label>
                  <label className="block mm-form-span">
                    <span className="mm-note block mb-2">Mensualidad</span>
                    <select value={editForm.monthlyFee} onChange={(event) => setEditForm((current) => ({ ...current, monthlyFee: event.target.value }))} className="mm-select">
                      {availablePlans.map((plan) => (
                        <option key={plan} value={String(plan)}>{formatMoney(plan)} / mes</option>
                      ))}
                    </select>
                  </label>
                </div>

                {feedback && <p className="mm-feedback">{feedback}</p>}

                <div className="mm-actions-grid mt-5">
                  <button type="button" onClick={handleSave} disabled={isSaving} className="mm-btn mm-btn--accent-gradient inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <FaSave />
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  <button type="button" onClick={() => setIsEditing(false)} disabled={isSaving} className="mm-btn mm-btn--ghost inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <FaTimes />
                    Cancelar
                  </button>
                </div>
              </article>
            )}
          </section>

          <aside className="mm-stack">
            <article className="mm-card mm-card--pad-lg">
              <div className="mm-qr-center">
                <p className="mm-overline">Código QR de acceso</p>
                <h3 className="mm-stat-value mt-2 text-lg">Escanéalo en Check-In</h3>
              </div>

              <div className="mm-qr-surface">
                <div ref={qrWrapperRef} className="mm-qr-box">
                  <QRCodeCanvas value={qrValue} size={220} includeMargin bgColor="#ffffff" fgColor="#000000" level="H" />
                </div>
                <p className="mm-note mt-4 text-center">Identificador único listo para check-in automático.</p>
                <a href={qrValue} target="_blank" rel="noopener noreferrer" className="mm-link-break">{qrValue}</a>
              </div>
            </article>

            <article className="mm-card mm-card--pad-lg">
              <h3 className="mm-stat-value text-base">Historial de accesos</h3>
              {lastAccessKind === 'entry' && accessTimeline.length > 0 && (
                <p className="mm-note mt-2">
                  <span className="mm-pill">Posiblemente en sitio</span>
                  {' '}Último registro: entrada (sin salida posterior en los datos cargados).
                </p>
              )}

              {accessLoading && <p className="mm-dashed-empty mt-3">Cargando accesos...</p>}

              {!accessLoading && accessError && <p className="mm-error-box">{accessError}</p>}

              {!accessLoading && !accessError && accessTimeline.length === 0 && (
                <p className="mm-dashed-empty mt-3">Aún no hay entradas/salidas registradas para este suscriptor (o la tabla usa columnas distintas).</p>
              )}

              {!accessLoading && accessTimeline.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {accessTimeline.map((ev) => {
                    const isEntry = ev.kind === 'entry'
                    return (
                      <div key={ev.rowId} className="mm-list-row">
                        <div className="flex items-start gap-2">
                          {isEntry ? (
                            <FaSignInAlt className="mt-0.5 text-emerald-500 shrink-0" aria-hidden />
                          ) : (
                            <FaSignOutAlt className="mt-0.5 text-amber-500 shrink-0" aria-hidden />
                          )}
                          <div>
                            <p className="mm-list-title">{isEntry ? 'Entrada' : 'Salida'}</p>
                            <p className="mm-list-copy text-xs">{formatDateTime(ev.at)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </article>

            <article className="mm-card mm-card--pad-lg">
              <p className="mm-overline">Últimos movimientos</p>
              <div className="mt-4 grid gap-3">
                {(customer.paymentHistory || []).slice(0, 4).map((entry) => (
                  <div key={entry.id} className="mm-list-row mm-list-row--split">
                    <div>
                      <p className="mm-list-title">{entry.kind === 'new_subscription' ? 'Alta inicial' : 'Renovación'}</p>
                      <p className="mm-list-copy text-xs">{formatRenewalDate(entry.date)} • {entry.months} mes(es)</p>
                    </div>
                    <div className="text-right">
                      <p className="mm-money">{formatMoney(entry.amount)}</p>
                      <p className="mm-payment-meta">{entry.paymentMethod}</p>
                    </div>
                  </div>
                ))}
                {(!customer.paymentHistory || customer.paymentHistory.length === 0) && (
                  <p className="mm-dashed-empty">Aún no hay historial de pagos registrado para este suscriptor.</p>
                )}
              </div>
            </article>
          </aside>
        </div>

        <div className="h-12 md:h-16 shrink-0" aria-hidden="true" />
      </div>
    </div>
  )
}

export default SubscriptionClientPage