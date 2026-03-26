import React, { useEffect, useMemo, useState } from 'react'
import { FaChartLine, FaDoorClosed, FaDoorOpen, FaUsers } from 'react-icons/fa'
import {
  computeAttendanceInsights,
  fetchAccessRowsForBusiness,
  flattenRowsToEvents
} from '../../services/subscriptionAccessService'
import { isSupabaseConfigured } from '../../lib/supabase'

const DAYS = 7

const formatDayLabel = (d) =>
  d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })

/**
 * Franja compacta: KPIs + mini tendencia 7 días en una sola fila (scroll horizontal en móvil).
 */
export function SubscriptionAttendanceInsights({ businessId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!businessId || !isSupabaseConfigured()) {
        if (!cancelled) {
          setRows([])
          setLoading(false)
          setError('')
        }
        return
      }
      setLoading(true)
      setError('')
      try {
        const since = new Date()
        since.setDate(since.getDate() - 21)
        const data = await fetchAccessRowsForBusiness(businessId, since.toISOString(), 600)
        if (!cancelled) setRows(data || [])
      } catch (e) {
        if (!cancelled) {
          setRows([])
          setError('Sin datos de asistencia')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [businessId])

  const insights = useMemo(() => computeAttendanceInsights(rows), [rows])

  const last7DaysBars = useMemo(() => {
    const events = flattenRowsToEvents(rows).filter((e) => e.kind === 'entry')
    const bars = []
    const now = new Date()
    for (let i = DAYS - 1; i >= 0; i -= 1) {
      const day = new Date(now)
      day.setDate(day.getDate() - i)
      day.setHours(0, 0, 0, 0)
      const next = new Date(day)
      next.setDate(next.getDate() + 1)
      const count = events.filter((e) => {
        const t = new Date(e.at)
        return t >= day && t < next
      }).length
      bars.push({ day, count, label: formatDayLabel(day) })
    }
    const max = Math.max(1, ...bars.map((b) => b.count))
    return { bars, max }
  }, [rows])

  if (!businessId) return null

  const peakShort =
    insights.peakWeekdayCount > 0
      ? `${insights.peakWeekdayLabel} ${insights.peakHourCount > 0 ? `· ~${String(insights.peakHourLabel).slice(0, 2)}h` : ''}`
      : null

  return (
    <div
      className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-0.5 [-webkit-overflow-scrolling:touch] subscription-attendance-strip"
      aria-label="Asistencia e insights"
      aria-busy={loading}
    >
      <div className="flex shrink-0 items-center gap-1.5 text-[var(--muted)]">
        <FaChartLine className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" aria-hidden />
        <span className="text-[11px] font-semibold whitespace-nowrap text-[var(--text)]">Asistencia</span>
        <span className="hidden md:inline text-[10px] text-[var(--muted)] whitespace-nowrap">~3 sem</span>
      </div>

      <span className="h-4 w-px shrink-0 bg-[var(--border)]/60" aria-hidden />

      {loading && (
        <span className="text-[11px] text-[var(--muted)] whitespace-nowrap">Cargando…</span>
      )}

      {!loading && error && (
        <span className="text-[11px] text-[var(--danger)] whitespace-nowrap">{error}</span>
      )}

      {!loading && !error && (
        <>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1 text-[11px] tabular-nums whitespace-nowrap" title="Estimado: última acción entrada sin salida">
              <FaUsers className="h-3 w-3 text-[var(--accent)] opacity-80" aria-hidden />
              <span className="text-[var(--muted)]">Ahora</span>
              <strong className="text-[var(--text)]">{insights.insideNow}</strong>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] tabular-nums whitespace-nowrap">
              <FaDoorOpen className="h-3 w-3 text-emerald-500/90" aria-hidden />
              <span className="text-[var(--muted)]">Hoy</span>
              <strong className="text-[var(--text)]">{insights.entriesToday}</strong>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] tabular-nums whitespace-nowrap">
              <FaDoorClosed className="h-3 w-3 text-amber-600/90" aria-hidden />
              <span className="text-[var(--muted)]">Sal.</span>
              <strong className="text-[var(--text)]">{insights.exitsToday}</strong>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] tabular-nums whitespace-nowrap">
              <span className="text-[var(--muted)]">Miemb.</span>
              <strong className="text-[var(--text)]">{insights.membersWithEvents}</strong>
            </span>
          </div>

          <span className="h-4 w-px shrink-0 bg-[var(--border)]/60" aria-hidden />

          <div
            className="flex min-w-[120px] max-w-[200px] shrink-0 items-end gap-0.5 sm:max-w-[240px]"
            title="Entradas por día (últimos 7 días)"
          >
            {last7DaysBars.bars.map((b) => (
              <div key={b.label} className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
                <div
                  className="w-full max-w-[14px] rounded-sm bg-[var(--accent)]/55 min-h-[2px]"
                  style={{ height: `${Math.max(2, Math.round((b.count / last7DaysBars.max) * 28))}px` }}
                />
                <span className="text-[8px] leading-none text-[var(--muted)] truncate max-w-full text-center">
                  {b.label.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>

          {(peakShort || insights.nextBusyDayHint) && (
            <>
              <span className="h-4 w-px shrink-0 bg-[var(--border)]/60" aria-hidden />
              <p
                className="min-w-0 max-w-[min(100%,14rem)] sm:max-w-xs text-[10px] leading-tight text-[var(--muted)] truncate"
                title={insights.nextBusyDayHint}
              >
                {peakShort || insights.nextBusyDayHint}
              </p>
            </>
          )}
        </>
      )}
    </div>
  )
}
