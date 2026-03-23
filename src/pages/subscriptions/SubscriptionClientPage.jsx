import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { FaArrowLeft, FaDownload, FaEdit, FaPhoneAlt, FaPrint, FaSave, FaSignInAlt, FaSignOutAlt, FaTimes, FaWhatsapp } from 'react-icons/fa'
import { useSubscriptionStore } from '../../store/subscriptionStore'
import { isSupabaseConfigured } from '../../lib/supabase'
import { fetchAccessRowsForMember, memberTimelineFromRows } from '../../services/subscriptionAccessService'
import './SubscriptionClientPage.css'

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
  if (customer.status === 'cancelled') return { label: 'Cancelada', tone: 'subscription-status--neutral' }
  if (customer.daysLeft < 0) return { label: 'Vencida', tone: 'subscription-status--danger' }
  if (customer.daysLeft <= 7) return { label: 'Por vencer', tone: 'subscription-status--warn' }
  return { label: 'Activa', tone: 'subscription-status--ok' }
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
    return <div className="subscription-client-page">Cargando cliente...</div>
  }

  if (!customer) {
    return (
      <div className="subscription-client-page">
        <div className="subscription-client-shell">
        <div className="subscription-panel">
          <button type="button" onClick={() => navigate('/subscriptions')} className="subscription-back" style={{ marginBottom: '24px' }}>
            <FaArrowLeft />
            Volver a suscripciones
          </button>
          <h1 className="subscription-customer-name" style={{ marginTop: 0, fontSize: '2rem' }}>Cliente no encontrado</h1>
          <p className="subscription-note" style={{ marginTop: '8px' }}>No existe un suscriptor con ese identificador o aún no se ha cargado en este tenant.</p>
        </div>
        </div>
      </div>
    )
  }

  return (
    <div className="subscription-client-page">
      <div className="subscription-client-shell">
        <div className="subscription-topbar">
          <button type="button" onClick={() => navigate(-1)} className="subscription-back">
            <FaArrowLeft />
            Regresar
          </button>
          <h1 className="subscription-title-chip">Cliente</h1>
          <span className={`subscription-status ${status.tone}`}>{status.label}</span>
        </div>

        <div className="subscription-grid">
          <section className="subscription-client-shell" style={{ maxWidth: 'none', margin: 0, gap: '20px' }}>
            <article className="subscription-panel subscription-panel--hero">
              <div className="subscription-panel-head">
                <div>
                  <p className="subscription-overline">Suscriptor</p>
                  <h2 className="subscription-customer-name">{customer.name}</h2>
                  <p className="subscription-customer-phone">
                    <FaPhoneAlt className="subscription-phone-icon" />
                    {customer.phone || 'Sin teléfono registrado'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing((current) => !current)
                    setFeedback('')
                  }}
                  className="subscription-edit-btn"
                >
                  {isEditing ? <FaTimes /> : <FaEdit />}
                  {isEditing ? 'Cerrar edición' : 'Editar cliente'}
                </button>
              </div>

              <div className="subscription-metrics-grid">
                <div className="subscription-metric">
                  <p className="subscription-label">Mensualidad</p>
                  <p className="subscription-metric-value subscription-metric-value--accent">{formatMoney(customer.monthlyFee)}</p>
                </div>
                <div className="subscription-metric">
                  <p className="subscription-label">Próxima renovación</p>
                  <p className="subscription-metric-value" style={{ fontSize: '1.2rem' }}>{formatRenewalDate(customer.endDate)}</p>
                  <p className="subscription-mini-copy">{customer.daysLeft >= 0 ? `${customer.daysLeft} día(s) restantes` : `Vencida hace ${Math.abs(customer.daysLeft)} día(s)`}</p>
                </div>
              </div>

              <div className="subscription-stats-grid">
                <div className="subscription-stat">
                  <p className="subscription-label">Inicio</p>
                  <p className="subscription-stat-value">{formatRenewalDate(customer.startDate)}</p>
                </div>
                <div className="subscription-stat">
                  <p className="subscription-label">Meses pagados</p>
                  <p className="subscription-stat-value">{Number(customer.monthsPurchased || 0)}</p>
                </div>
                <div className="subscription-stat">
                  <p className="subscription-label">Total pagado</p>
                  <p className="subscription-stat-value">{formatMoney(customer.totalPaid)}</p>
                </div>
              </div>
            </article>

            <article className="subscription-panel">
              <div className="subscription-panel-head">
                <div>
                  <p className="subscription-label">Acciones del QR</p>
                  <h3 className="subscription-stat-value" style={{ marginTop: '4px', fontSize: '1.15rem' }}>Código QR de acceso</h3>
                </div>
                <span className="subscription-pill">Único por suscriptor</span>
              </div>

              <div className="subscription-actions-grid">
                <button type="button" onClick={handleSendWhatsapp} disabled={!whatsappPhone} className="subscription-accent-btn inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <FaWhatsapp />
                  Enviar por WhatsApp
                </button>
                <button type="button" onClick={handleDownloadQr} className="subscription-ghost-btn inline-flex items-center justify-center gap-2">
                  <FaDownload />
                  Descargar QR
                </button>
                <button type="button" onClick={handlePrintQr} className="subscription-ghost-btn inline-flex items-center justify-center gap-2">
                  <FaPrint />
                  Imprimir QR
                </button>
                <button type="button" onClick={() => setIsEditing(true)} className="subscription-ghost-btn inline-flex items-center justify-center gap-2">
                  <FaEdit />
                  Editar cliente
                </button>
              </div>

              {!whatsappPhone && <p className="subscription-note" style={{ marginTop: '12px' }}>Agrega un teléfono válido para habilitar WhatsApp.</p>}
            </article>

            {isEditing && (
              <article className="subscription-panel">
                <div className="subscription-panel-head">
                  <div>
                    <p className="subscription-label">Edición</p>
                    <h3 className="subscription-stat-value" style={{ marginTop: '4px', fontSize: '1.15rem' }}>Modificar datos del cliente</h3>
                  </div>
                </div>

                <div className="subscription-form-grid" style={{ marginTop: '16px' }}>
                  <label className="block">
                    <span className="subscription-note" style={{ display: 'block', marginBottom: '8px' }}>Nombre</span>
                    <input type="text" value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: sanitizeName(event.target.value) }))} className="subscription-input" minLength={3} maxLength={80} />
                  </label>
                  <label className="block">
                    <span className="subscription-note" style={{ display: 'block', marginBottom: '8px' }}>Teléfono</span>
                    <input type="text" value={editForm.phone} onChange={(event) => setEditForm((current) => ({ ...current, phone: sanitizePhone(event.target.value) }))} className="subscription-input" inputMode="numeric" placeholder="10 dígitos" maxLength={10} />
                  </label>
                  <label className="block subscription-form-span">
                    <span className="subscription-note" style={{ display: 'block', marginBottom: '8px' }}>Mensualidad</span>
                    <select value={editForm.monthlyFee} onChange={(event) => setEditForm((current) => ({ ...current, monthlyFee: event.target.value }))} className="subscription-select">
                      {availablePlans.map((plan) => (
                        <option key={plan} value={String(plan)}>{formatMoney(plan)} / mes</option>
                      ))}
                    </select>
                  </label>
                </div>

                {feedback && <p className="subscription-feedback">{feedback}</p>}

                <div className="subscription-actions-grid" style={{ marginTop: '20px' }}>
                  <button type="button" onClick={handleSave} disabled={isSaving} className="subscription-accent-btn inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <FaSave />
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  <button type="button" onClick={() => setIsEditing(false)} disabled={isSaving} className="subscription-ghost-btn inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <FaTimes />
                    Cancelar
                  </button>
                </div>
              </article>
            )}
          </section>

          <aside className="subscription-client-shell" style={{ maxWidth: 'none', margin: 0, gap: '20px' }}>
            <article className="subscription-qr-panel">
              <div className="subscription-qr-center">
                <p className="subscription-label">Código QR de acceso</p>
                <h3 className="subscription-stat-value" style={{ marginTop: '8px', fontSize: '1.15rem' }}>Escanéalo en Check-In</h3>
              </div>

              <div className="subscription-qr-surface">
                <div ref={qrWrapperRef} className="subscription-qr-box">
                  <QRCodeCanvas value={qrValue} size={220} includeMargin bgColor="#ffffff" fgColor="#000000" level="H" />
                </div>
                <p className="subscription-note" style={{ marginTop: '16px', textAlign: 'center' }}>Identificador único listo para check-in automático.</p>
                <a
                  href={qrValue}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="subscription-link"
                >{qrValue}</a>
              </div>
            </article>

            <article className="subscription-side-panel">
              <h3 className="subscription-stat-value" style={{ marginTop: 0, fontSize: '1rem' }}>Historial de accesos</h3>
              {lastAccessKind === 'entry' && accessTimeline.length > 0 && (
                <p className="subscription-note" style={{ marginTop: '8px' }}>
                  <span className="subscription-pill">Posiblemente en sitio</span>
                  {' '}Último registro: entrada (sin salida posterior en los datos cargados).
                </p>
              )}

              {accessLoading && (
                <p className="subscription-empty">
                  Cargando accesos...
                </p>
              )}

              {!accessLoading && accessError && (
                <p className="subscription-error">
                  {accessError}
                </p>
              )}

              {!accessLoading && !accessError && accessTimeline.length === 0 && (
                <p className="subscription-empty">
                  Aún no hay entradas/salidas registradas para este suscriptor (o la tabla usa columnas distintas).
                </p>
              )}

              {!accessLoading && accessTimeline.length > 0 && (
                <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
                  {accessTimeline.map((ev) => {
                    const isEntry = ev.kind === 'entry'
                    return (
                      <div key={ev.rowId} className="subscription-list-item">
                        <div className="flex items-start gap-2">
                          {isEntry ? (
                            <FaSignInAlt className="mt-0.5 text-emerald-500 shrink-0" aria-hidden />
                          ) : (
                            <FaSignOutAlt className="mt-0.5 text-amber-500 shrink-0" aria-hidden />
                          )}
                          <div>
                            <p className="subscription-list-title">{isEntry ? 'Entrada' : 'Salida'}</p>
                            <p className="subscription-list-copy" style={{ fontSize: '12px' }}>{formatDateTime(ev.at)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </article>

            <article className="subscription-side-panel">
              <p className="subscription-label">Últimos movimientos</p>
              <div style={{ marginTop: '16px', display: 'grid', gap: '12px' }}>
                {(customer.paymentHistory || []).slice(0, 4).map((entry) => (
                  <div key={entry.id} className="subscription-list-item">
                    <div>
                      <p className="subscription-list-title">{entry.kind === 'new_subscription' ? 'Alta inicial' : 'Renovación'}</p>
                      <p className="subscription-list-copy" style={{ fontSize: '12px' }}>{formatRenewalDate(entry.date)} • {entry.months} mes(es)</p>
                    </div>
                    <div className="text-right">
                      <p className="subscription-money">{formatMoney(entry.amount)}</p>
                      <p className="subscription-payment-meta" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.18em' }}>{entry.paymentMethod}</p>
                    </div>
                  </div>
                ))}
                {(!customer.paymentHistory || customer.paymentHistory.length === 0) && (
                  <p className="subscription-payment-empty">Aún no hay historial de pagos registrado para este suscriptor.</p>
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