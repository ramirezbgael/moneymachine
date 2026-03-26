import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSubscriptionStore } from '../../store/subscriptionStore'
import '../../components/Subscriptions/Subscriptions.css'

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'card', label: 'Tarjeta' },
  { id: 'transfer', label: 'Transferencia' }
]

const formatMoney = (value) => {
  const amount = Number(value || 0)
  return `$${amount.toFixed(2)}`
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

/**
 * Alta de suscriptor + cobro inicial en página dedicada (sin modales).
 * Las mensualidades del negocio se editan aquí mismo en bloque aparte.
 */
export default function NewSubscriptionPage() {
  const navigate = useNavigate()
  const {
    subscriptionPlans,
    addCustomer,
    loadSubscriptionPlans,
    saveSubscriptionPlans
  } = useSubscriptionStore()

  const [step, setStep] = useState('form')
  const [formData, setFormData] = useState({ name: '', phone: '', monthlyFee: '', months: '1' })
  const [plansRaw, setPlansRaw] = useState('')
  const [plansSaving, setPlansSaving] = useState(false)
  const [plansError, setPlansError] = useState('')
  const [plansMessage, setPlansMessage] = useState('')
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState('cash')
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false)

  useEffect(() => {
    loadSubscriptionPlans()
  }, [loadSubscriptionPlans])

  useEffect(() => {
    if (!subscriptionPlans.length) return
    const hasSelected = subscriptionPlans.some((plan) => Number(plan) === Number(formData.monthlyFee))
    if (!hasSelected) {
      setFormData((prev) => ({ ...prev, monthlyFee: String(subscriptionPlans[0]) }))
    }
  }, [subscriptionPlans, formData.monthlyFee])

  useEffect(() => {
    setPlansRaw(subscriptionPlans.join(', '))
  }, [subscriptionPlans])

  const parsedInitialMonths = useMemo(() => {
    const raw = Number(formData.months)
    if (!formData.months || Number.isNaN(raw)) return 1
    return Math.max(1, Math.floor(raw))
  }, [formData.months])

  const initialCharge = useMemo(
    () => Number(formData.monthlyFee || 0) * parsedInitialMonths,
    [formData.monthlyFee, parsedInitialMonths]
  )

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
      setFormData((prev) => ({
        ...prev,
        monthlyFee: savedPlans.includes(Number(prev.monthlyFee)) ? prev.monthlyFee : String(savedPlans[0])
      }))
    } catch (err) {
      setPlansError(err?.message || 'No se pudieron guardar las mensualidades.')
    } finally {
      setPlansSaving(false)
    }
  }

  const goToCheckout = (e) => {
    e.preventDefault()
    if (!formData.name.trim() || formData.name.trim().length < 3) return
    if (formData.phone && formData.phone.length !== 10) return
    if (!subscriptionPlans.length) {
      setPlansError('Configura al menos una mensualidad en la sección de abajo.')
      return
    }
    setStep('checkout')
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

      const receipt = {
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
      }

      navigate('/subscriptions', { state: { subscriptionSaleReceipt: receipt } })
    } finally {
      setCheckoutSubmitting(false)
    }
  }

  return (
    <div className="mm-page mm-page--flush overflow-x-hidden">
      <div className="mx-auto w-full max-w-2xl mm-stack">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => (step === 'checkout' ? setStep('form') : navigate('/subscriptions'))}
              className="mb-2 text-sm text-[var(--muted)] transition hover:text-[var(--accent)]"
            >
              ← {step === 'checkout' ? 'Volver a datos' : 'Volver a suscripciones'}
            </button>
            <h1 className="text-2xl font-bold text-[var(--text)]">
              {step === 'checkout' ? 'Confirmar cobro inicial' : 'Nueva suscripción'}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {step === 'checkout'
                ? 'Revisa el importe y el método de pago antes de registrar.'
                : 'Alta de suscriptor y primer cobro. La configuración de mensualidades del gimnasio va aparte del cliente.'}
            </p>
          </div>
        </header>

        {step === 'form' && (
          <>
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[var(--shadow-sm)]">
              <h2 className="text-sm font-semibold text-[var(--text)]">Datos del suscriptor</h2>
              <form className="subscriptions-form mt-4" onSubmit={goToCheckout}>
                <div className="subscriptions-field subscriptions-field--full">
                  <label className="subscriptions-field__label">Nombre del cliente</label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: sanitizeName(e.target.value) }))}
                    className="subscriptions-input subscriptions-input--full"
                    placeholder="Ej. Juan Pérez"
                    minLength={3}
                    maxLength={80}
                    required
                  />
                </div>

                <div className="subscriptions-field">
                  <label className="subscriptions-field__label">Teléfono</label>
                  <input
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: sanitizePhone(e.target.value) }))}
                    className="subscriptions-input"
                    placeholder="Opcional (10 dígitos)"
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, monthlyFee: e.target.value }))}
                    className="subscriptions-input"
                    required
                    disabled={!subscriptionPlans.length}
                  >
                    {subscriptionPlans.map((plan) => (
                      <option key={plan} value={String(plan)}>
                        {formatMoney(plan)} / mes
                      </option>
                    ))}
                  </select>
                </div>

                <div className="subscriptions-field subscriptions-field--full">
                  <label className="subscriptions-field__label">Meses iniciales</label>
                  <div className="subscriptions-stepper">
                    <button
                      type="button"
                      className="subscriptions-stepper__btn"
                      onClick={() => setFormData((prev) => ({ ...prev, months: String(Math.max(1, parsedInitialMonths - 1)) }))}
                      aria-label="Restar meses"
                    >
                      -
                    </button>
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
                    <button
                      type="button"
                      className="subscriptions-stepper__btn"
                      onClick={() => setFormData((prev) => ({ ...prev, months: String(parsedInitialMonths + 1) }))}
                      aria-label="Sumar meses"
                    >
                      +
                    </button>
                  </div>
                  <p className="subscriptions-field__hint">Cuántos meses paga al dar de alta. Normalmente 1.</p>
                  <p className="subscriptions-field__hint subscriptions-field__hint--strong">
                    Cobro inicial a registrar: {formatMoney(initialCharge)}
                  </p>
                </div>

                <div className="subscriptions-modal-actions">
                  <button type="button" className="subscriptions-modal-btn" onClick={() => navigate('/subscriptions')}>
                    Cancelar
                  </button>
                  <button type="submit" className="subscriptions-submit" disabled={!subscriptionPlans.length}>
                    Continuar al cobro
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel)]/70 p-5">
              <h2 className="text-sm font-semibold text-[var(--text)]">Mensualidades del negocio</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Son las opciones que verás en el selector (no es el cliente en sí). Ajústalas si tus planes cambian.
              </p>
              <div className="subscriptions-field subscriptions-field--full subscriptions-plans-editor mt-3">
                <label className="subscriptions-field__label">Importes (separados por coma)</label>
                <input
                  type="text"
                  value={plansRaw}
                  onChange={(e) => setPlansRaw(e.target.value)}
                  className="subscriptions-input subscriptions-input--full"
                  placeholder="199, 299, 399"
                  disabled={plansSaving}
                />
                <p className="subscriptions-field__hint">Ejemplo: 199, 299, 399</p>
                {plansError && <p className="subscriptions-inline-error">{plansError}</p>}
                {plansMessage && <p className="subscriptions-inline-success">{plansMessage}</p>}
                <div className="subscriptions-plans-editor__actions">
                  <button type="button" onClick={handleSavePlans} disabled={plansSaving} className="subscriptions-action-btn">
                    {plansSaving ? 'Guardando...' : 'Guardar mensualidades'}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {step === 'checkout' && (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[var(--shadow-sm)]">
            <h2 className="text-sm font-semibold text-[var(--text)]">Resumen</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Cliente: {formData.name}</p>
            <div className="mt-4 rounded-lg border border-[var(--border)] p-3 text-sm space-y-1">
              <p>Mensualidad: {formatMoney(formData.monthlyFee)}</p>
              <p>Meses iniciales: {parsedInitialMonths}</p>
              <p className="font-semibold">Total a cobrar: {formatMoney(initialCharge)}</p>
            </div>

            <div className="mt-5">
              <p className="subscriptions-modal-label-text">Método de pago</p>
              <div className="subscriptions-payment-options">
                {PAYMENT_METHODS.map((method) => (
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

            <div className="subscriptions-modal-actions mt-6">
              <button type="button" className="subscriptions-modal-btn" onClick={() => setStep('form')} disabled={checkoutSubmitting}>
                Volver
              </button>
              <button
                type="button"
                className="subscriptions-modal-btn subscriptions-modal-btn--primary"
                onClick={handleConfirmCreate}
                disabled={checkoutSubmitting}
              >
                {checkoutSubmitting ? 'Procesando...' : 'Cobrar y guardar'}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
