import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaClock } from 'react-icons/fa6'
import { useTenantStore } from '../../store/tenantStore'

function formatRemainingSpanish(ms) {
  if (ms <= 0) return null
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d >= 1) {
    return `${d} día${d !== 1 ? 's' : ''}`
  }
  if (h >= 1) {
    return `${h} hora${h !== 1 ? 's' : ''}`
  }
  return `${Math.max(1, m)} min`
}

/**
 * Banner global cuando el negocio está en periodo de prueba (billing trialing).
 */
export function TrialBanner() {
  const currentTenant = useTenantStore((s) => s.currentTenant)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const { show, expired, labelLine } = useMemo(() => {
    const t = currentTenant
    if (!t?.billing_status) {
      return { show: false, expired: false, labelLine: '' }
    }
    const isTrialing = t.billing_status === 'trialing'
    if (!isTrialing) {
      return { show: false, expired: false, labelLine: '' }
    }

    const end = t.trial_ends_at ? new Date(t.trial_ends_at).getTime() : null
    if (end == null || Number.isNaN(end)) {
      return {
        show: true,
        expired: false,
        labelLine: 'Estás en periodo de prueba.'
      }
    }

    const ms = end - Date.now()
    if (ms <= 0) {
      return {
        show: true,
        expired: true,
        labelLine: 'Tu periodo de prueba ha finalizado.'
      }
    }

    const rem = formatRemainingSpanish(ms)
    return {
      show: true,
      expired: false,
      labelLine: rem ? `Te quedan ${rem} de prueba.` : 'Periodo de prueba activo.'
    }
  }, [currentTenant, tick])

  if (!show) return null

  return (
    <div
      className={`trial-banner shrink-0 border-b px-3 py-2.5 md:px-4 ${
        expired
          ? 'border-amber-500/25 bg-amber-500/10 text-amber-100'
          : 'border-[rgb(82_196_138/0.25)] bg-[rgb(82_196_138/0.12)] text-[#e8ede9]'
      }`}
      role="status"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2 text-center text-sm md:justify-between md:text-left">
        <span className="inline-flex items-center gap-2 font-medium">
          <FaClock className={`shrink-0 ${expired ? 'text-amber-300' : 'text-[#6ee7a8]'}`} aria-hidden />
          <span>
            {expired ? (
              <>
                <strong className="font-semibold">Prueba finalizada.</strong>{' '}
                Contrata un plan para continuar sin límites.
              </>
            ) : (
              <>
                <strong className="font-semibold text-[#6ee7a8]">Periodo de prueba</strong>
                {' — '}
                {labelLine}
              </>
            )}
          </span>
        </span>
        {!expired && (
          <Link
            to="/settings"
            className="text-xs font-semibold text-[#6ee7a8] underline underline-offset-2 hover:text-[#a7f3d0] md:text-sm"
          >
            Ver planes
          </Link>
        )}
        {expired && (
          <Link
            to="/settings"
            className="text-xs font-semibold text-amber-200 underline underline-offset-2 hover:text-amber-50 md:text-sm"
          >
            Ir a configuración
          </Link>
        )}
      </div>
    </div>
  )
}
