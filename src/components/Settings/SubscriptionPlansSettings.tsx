import { useEffect, useState } from 'react'
import { useSubscriptionStore } from '../../store/subscriptionStore'

const parsePlans = (raw: string) => {
  return raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
}

export function SubscriptionPlansSettings() {
  const subscriptionPlans = useSubscriptionStore((s) => s.subscriptionPlans)
  const loadSubscriptionPlans = useSubscriptionStore((s) => s.loadSubscriptionPlans)
  const saveSubscriptionPlans = useSubscriptionStore((s) => s.saveSubscriptionPlans)

  const [rawPlans, setRawPlans] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadSubscriptionPlans()
  }, [loadSubscriptionPlans])

  useEffect(() => {
    setRawPlans(subscriptionPlans.join(', '))
  }, [subscriptionPlans])

  const handleSave = async () => {
    setMessage('')
    setError('')

    const plans = parsePlans(rawPlans)
    if (!plans.length) {
      setError('Debes agregar al menos una mensualidad válida. Ejemplo: 199, 299, 399')
      return
    }

    setSaving(true)
    try {
      const saved = await saveSubscriptionPlans(plans)
      setRawPlans(saved.join(', '))
      setMessage('Mensualidades guardadas correctamente.')
    } catch (err) {
      setError((err as Error)?.message || 'No se pudo guardar la configuración de mensualidades.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
      <div>
        <h3 className="text-base font-semibold text-[var(--text)]">Mensualidades permitidas</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Define los precios de mensualidad disponibles en Alta de cliente. Separalos con coma.
        </p>
      </div>

      <label className="block text-sm text-[var(--text)]">
        Opciones de mensualidad
        <input
          type="text"
          value={rawPlans}
          onChange={(e) => setRawPlans(e.target.value)}
          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
          placeholder="199, 299, 399"
          disabled={saving}
        />
      </label>

      <p className="text-xs text-[var(--muted)]">
        Vista previa: {subscriptionPlans.map((plan: number) => `$${plan.toFixed(2)}`).join(' | ')}
      </p>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-emerald-400">{message}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 font-semibold text-black disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar mensualidades'}
        </button>
      </div>
    </div>
  )
}
