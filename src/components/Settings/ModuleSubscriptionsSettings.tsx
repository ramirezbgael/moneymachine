import { useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useTenantStore } from '../../store/tenantStore'
import { useAuthStore } from '../../store/authStore'

type ModuleStatus = 'inactive' | 'trial' | 'active' | 'past_due' | 'cancelled'

interface ModuleRow {
  module_key: string
  status: ModuleStatus
  monthly_price: number
  currency: string
  starts_at: string | null
  ends_at: string | null
  auto_renew: boolean
}

const toInputDateTime = (value: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const tzOffsetMs = date.getTimezoneOffset() * 60 * 1000
  const local = new Date(date.getTime() - tzOffsetMs)
  return local.toISOString().slice(0, 16)
}

const fromInputDateTime = (value: string) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function ModuleSubscriptionsSettings() {
  const currentTenantId = useTenantStore((s) => s.currentTenantId)
  const loadFeatureFlags = useTenantStore((s) => s.loadFeatureFlags)
  const user = useAuthStore((s) => s.user)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [canManage, setCanManage] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [status, setStatus] = useState<ModuleStatus>('inactive')
  const [monthlyPrice, setMonthlyPrice] = useState('99')
  const [currency, setCurrency] = useState('MXN')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [autoRenew, setAutoRenew] = useState(false)

  const moduleEnabled = useMemo(() => {
    if (status !== 'active' && status !== 'trial') return false
    const now = new Date()
    const startOk = !startsAt || new Date(startsAt) <= now
    const endOk = !endsAt || new Date(endsAt) >= now
    return startOk && endOk
  }, [status, startsAt, endsAt])

  const loadData = async () => {
    setLoading(true)
    setError('')

    if (!currentTenantId || !user?.id) {
      setLoading(false)
      return
    }

    if (!isSupabaseConfigured() || !supabase) {
      setCanManage(true)
      setLoading(false)
      return
    }

    try {
      const { data: membership, error: membershipError } = await supabase
        .from('memberships')
        .select('role')
        .eq('business_id', currentTenantId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (membershipError) throw membershipError
      setCanManage(Boolean(membership?.role))

      const { data, error: moduleError } = await supabase
        .from('saas_module_entitlements')
        .select('module_key, status, monthly_price, currency, starts_at, ends_at, auto_renew')
        .eq('business_id', currentTenantId)
        .eq('module_key', 'subscriptions')
        .maybeSingle()

      if (moduleError) throw moduleError

      if (data) {
        const row = data as ModuleRow
        setStatus(row.status || 'inactive')
        setMonthlyPrice(String(row.monthly_price ?? 99))
        setCurrency(row.currency || 'MXN')
        setStartsAt(toInputDateTime(row.starts_at))
        setEndsAt(toInputDateTime(row.ends_at))
        setAutoRenew(Boolean(row.auto_renew))
      }
    } catch (err) {
      setError((err as Error)?.message || 'No se pudo cargar la configuración del módulo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [currentTenantId, user?.id])

  const handleSave = async () => {
    setError('')
    setSuccess('')

    if (!currentTenantId) {
      setError('No hay tenant activo.')
      return
    }

    if (!isSupabaseConfigured() || !supabase) {
      setSuccess('Guardado en modo local (sin Supabase).')
      return
    }

    if (!canManage) {
      setError('No tienes permisos sobre este tenant para editar módulos premium.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        business_id: currentTenantId,
        module_key: 'subscriptions',
        status,
        monthly_price: Number(monthlyPrice) || 0,
        currency,
        starts_at: fromInputDateTime(startsAt),
        ends_at: fromInputDateTime(endsAt),
        auto_renew: autoRenew
      }

      const { error: upsertError } = await supabase
        .from('saas_module_entitlements')
        .upsert(payload, { onConflict: 'business_id,module_key' })

      if (upsertError) throw upsertError

      await loadFeatureFlags(currentTenantId)
      setSuccess('Módulo actualizado correctamente.')
    } catch (err) {
      setError((err as Error)?.message || 'No se pudo guardar la configuración del módulo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>
            Estado efectivo del módulo: <strong>{moduleEnabled ? 'ENCENDIDO' : 'APAGADO'}</strong>
          </p>
          {!canManage && !loading && (
            <span className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-xs">
              Solo lectura (sin permisos en este tenant)
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-[var(--muted)]">Cargando configuración del módulo...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm">
            Estado
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ModuleStatus)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2"
              disabled={!canManage || saving}
            >
              <option value="inactive">Inactivo</option>
              <option value="trial">Trial</option>
              <option value="active">Activo</option>
              <option value="past_due">Pago vencido</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </label>

          <label className="text-sm">
            Precio mensual
            <input
              type="number"
              min="0"
              step="0.01"
              value={monthlyPrice}
              onChange={(e) => setMonthlyPrice(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2"
              disabled={!canManage || saving}
            />
          </label>

          <label className="text-sm">
            Moneda
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2"
              disabled={!canManage || saving}
            >
              <option value="MXN">MXN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>

          <label className="text-sm flex items-end gap-2">
            <input
              type="checkbox"
              checked={autoRenew}
              onChange={(e) => setAutoRenew(e.target.checked)}
              disabled={!canManage || saving}
            />
            Renovación automática
          </label>

          <label className="text-sm">
            Inicio
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2"
              disabled={!canManage || saving}
            />
          </label>

          <label className="text-sm">
            Fin
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2"
              disabled={!canManage || saving}
            />
          </label>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-emerald-400">{success}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || saving || !canManage}
          className="rounded-xl bg-[var(--accent)] text-black font-semibold px-4 py-2 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar módulo'}
        </button>
      </div>
    </div>
  )
}
