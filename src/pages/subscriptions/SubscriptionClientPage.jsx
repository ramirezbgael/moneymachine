import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { FaArrowLeft, FaDownload, FaEdit, FaPhoneAlt, FaPrint, FaSave, FaTimes, FaWhatsapp } from 'react-icons/fa'
import { useSubscriptionStore } from '../../store/subscriptionStore'

const dateFormatter = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`

const formatRenewalDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : dateFormatter.format(date)
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
  if (customer.status === 'cancelled') return { label: 'Cancelada', tone: 'text-zinc-300 bg-zinc-800 border-zinc-700' }
  if (customer.daysLeft < 0) return { label: 'Vencida', tone: 'text-red-300 bg-red-500/10 border-red-500/30' }
  if (customer.daysLeft <= 7) return { label: 'Por vencer', tone: 'text-amber-300 bg-amber-500/10 border-amber-500/30' }
  return { label: 'Activa', tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' }
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
    return <div className="min-h-screen bg-[#050816] px-4 py-6 text-zinc-100">Cargando cliente...</div>
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-[#050816] px-4 py-6 text-zinc-100">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-zinc-800 bg-zinc-950/80 p-6">
          <button type="button" onClick={() => navigate('/subscriptions')} className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white">
            <FaArrowLeft />
            Volver a suscripciones
          </button>
          <h1 className="text-2xl font-semibold text-white">Cliente no encontrado</h1>
          <p className="mt-2 text-zinc-400">No existe un suscriptor con ese identificador o aún no se ha cargado en este tenant.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-4 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-center justify-between rounded-[28px] border border-zinc-800 bg-zinc-950/85 px-4 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur">
          <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white">
            <FaArrowLeft />
            Regresar
          </button>
          <h1 className="text-lg font-semibold text-emerald-400">Cliente</h1>
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${status.tone}`}>{status.label}</span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-5">
            <article className="overflow-hidden rounded-[28px] border border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_45%),linear-gradient(180deg,_rgba(24,24,27,0.98),_rgba(9,9,11,0.98))] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Suscriptor</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{customer.name}</h2>
                  <p className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                    <FaPhoneAlt className="text-emerald-400" />
                    {customer.phone || 'Sin teléfono registrado'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing((current) => !current)
                    setFeedback('')
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-emerald-500/40 hover:text-white"
                >
                  {isEditing ? <FaTimes /> : <FaEdit />}
                  {isEditing ? 'Cerrar edición' : 'Editar cliente'}
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Mensualidad</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-400">{formatMoney(customer.monthlyFee)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Próxima renovación</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatRenewalDate(customer.endDate)}</p>
                  <p className="mt-1 text-sm text-zinc-400">{customer.daysLeft >= 0 ? `${customer.daysLeft} día(s) restantes` : `Vencida hace ${Math.abs(customer.daysLeft)} día(s)`}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Inicio</p>
                  <p className="mt-2 text-sm text-zinc-200">{formatRenewalDate(customer.startDate)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Meses pagados</p>
                  <p className="mt-2 text-sm text-zinc-200">{Number(customer.monthsPurchased || 0)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Total pagado</p>
                  <p className="mt-2 text-sm text-zinc-200">{formatMoney(customer.totalPaid)}</p>
                </div>
              </div>
            </article>

            <article className="rounded-[28px] border border-zinc-800 bg-zinc-950/90 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Acciones del QR</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Código QR de acceso</h3>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">Único por suscriptor</span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={handleSendWhatsapp} disabled={!whatsappPhone} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 font-medium text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500">
                  <FaWhatsapp />
                  Enviar por WhatsApp
                </button>
                <button type="button" onClick={handleDownloadQr} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800">
                  <FaDownload />
                  Descargar QR
                </button>
                <button type="button" onClick={handlePrintQr} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800">
                  <FaPrint />
                  Imprimir QR
                </button>
                <button type="button" onClick={() => setIsEditing(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800">
                  <FaEdit />
                  Editar cliente
                </button>
              </div>

              {!whatsappPhone && <p className="mt-3 text-sm text-zinc-500">Agrega un teléfono válido para habilitar WhatsApp.</p>}
            </article>

            {isEditing && (
              <article className="rounded-[28px] border border-zinc-800 bg-zinc-950/90 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Edición</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">Modificar datos del cliente</h3>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm text-zinc-400">Nombre</span>
                    <input type="text" value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: sanitizeName(event.target.value) }))} className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-500" minLength={3} maxLength={80} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm text-zinc-400">Teléfono</span>
                    <input type="text" value={editForm.phone} onChange={(event) => setEditForm((current) => ({ ...current, phone: sanitizePhone(event.target.value) }))} className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-500" inputMode="numeric" placeholder="10 dígitos" maxLength={10} />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm text-zinc-400">Mensualidad</span>
                    <select value={editForm.monthlyFee} onChange={(event) => setEditForm((current) => ({ ...current, monthlyFee: event.target.value }))} className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-500">
                      {availablePlans.map((plan) => (
                        <option key={plan} value={String(plan)}>{formatMoney(plan)} / mes</option>
                      ))}
                    </select>
                  </label>
                </div>

                {feedback && <p className="mt-4 text-sm text-emerald-300">{feedback}</p>}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 font-medium text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40">
                    <FaSave />
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  <button type="button" onClick={() => setIsEditing(false)} disabled={isSaving} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800">
                    <FaTimes />
                    Cancelar
                  </button>
                </div>
              </article>
            )}
          </section>

          <aside className="space-y-5">
            <article className="rounded-[28px] border border-zinc-800 bg-zinc-950/90 p-5">
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Código QR de acceso</p>
                <h3 className="mt-2 text-lg font-semibold text-zinc-100">Escanéalo en Check-In</h3>
              </div>

              <div className="mt-5 flex flex-col items-center rounded-[28px] border border-zinc-800 bg-[linear-gradient(180deg,_rgba(24,24,27,0.95),_rgba(9,9,11,0.95))] p-6">
                <div ref={qrWrapperRef} className="rounded-[24px] bg-white p-4 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
                  <QRCodeCanvas value={qrValue} size={220} includeMargin bgColor="#ffffff" fgColor="#000000" level="H" />
                </div>
                <p className="mt-4 text-center text-sm text-zinc-400">Identificador único listo para check-in automático.</p>
                <a
                  href={qrValue}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 break-all text-center text-xs text-emerald-400 underline hover:text-emerald-300"
                >{qrValue}</a>
              </div>
            </article>

            <article className="rounded-[28px] border border-zinc-800 bg-zinc-950/90 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Últimos movimientos</p>
              <div className="mt-4 space-y-3">
                {(customer.paymentHistory || []).slice(0, 4).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{entry.kind === 'new_subscription' ? 'Alta inicial' : 'Renovación'}</p>
                      <p className="text-xs text-zinc-500">{formatRenewalDate(entry.date)} • {entry.months} mes(es)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-300">{formatMoney(entry.amount)}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{entry.paymentMethod}</p>
                    </div>
                  </div>
                ))}
                {(!customer.paymentHistory || customer.paymentHistory.length === 0) && (
                  <p className="rounded-2xl border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">Aún no hay historial de pagos registrado para este suscriptor.</p>
                )}
              </div>
            </article>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default SubscriptionClientPage