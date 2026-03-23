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
  d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })

/**
 * Panel de asistencia: entradas/salidas, ahora en sitio, tendencias por día y hora.
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
        since.setDate(since.getDate() - 42)
        const data = await fetchAccessRowsForBusiness(businessId, since.toISOString(), 2500)
        if (!cancelled) setRows(data || [])
      } catch (e) {
        if (!cancelled) {
          setRows([])
          setError('No se pudieron cargar los datos de asistencia.')
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

  const hourBarMax = useMemo(
    () => Math.max(1, ...insights.hourEntryCounts),
    [insights.hourEntryCounts]
  )

  const weekdayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const weekdayBarMax = useMemo(
    () => Math.max(1, ...insights.weekdayEntryCounts),
    [insights.weekdayEntryCounts]
  )

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

  return (
    <section
      className={`mb-6 rounded-xl border border-[var(--border)] bg-[var(--panel)]/80 p-4 shadow-[var(--shadow-sm)] ${
        loading ? 'min-h-[min(280px,50vh)]' : ''
      }`}
      aria-label="Asistencia e insights"
      aria-busy={loading}
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <FaChartLine className="text-[var(--accent)]" aria-hidden />
        <h2 className="text-sm font-bold text-[var(--text)]">Asistencia e insights</h2>
        <span className="text-[11px] text-[var(--muted)]">Entradas / salidas y tendencias (últimas ~6 semanas)</span>
      </div>

      {loading && <p className="text-sm text-[var(--muted)]">Cargando asistencia…</p>}
      {!loading && error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-3">
              <p className="text-[10px] uppercase tracking-wide text-[var(--muted)] flex items-center gap-1">
                <FaUsers className="inline" aria-hidden /> Ahora (estim.)
              </p>
              <p className="text-xl font-bold text-[var(--accent)] tabular-nums">{insights.insideNow}</p>
              <p className="text-[10px] text-[var(--muted)]">último evento = entrada sin salida</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-3">
              <p className="text-[10px] uppercase tracking-wide text-[var(--muted)] flex items-center gap-1">
                <FaDoorOpen className="inline text-emerald-500" aria-hidden /> Hoy entradas
              </p>
              <p className="text-xl font-bold text-[var(--text)] tabular-nums">{insights.entriesToday}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-3">
              <p className="text-[10px] uppercase tracking-wide text-[var(--muted)] flex items-center gap-1">
                <FaDoorClosed className="inline text-amber-600" aria-hidden /> Hoy salidas
              </p>
              <p className="text-xl font-bold text-[var(--text)] tabular-nums">{insights.exitsToday}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-3">
              <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Miembros con registros</p>
              <p className="text-xl font-bold text-[var(--text)] tabular-nums">{insights.membersWithEvents}</p>
            </div>
          </div>

          <p className="text-xs text-[var(--muted)] mb-3">{insights.nextBusyDayHint}</p>

          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold text-[var(--text)] mb-2">Últimos {DAYS} días (entradas)</p>
              <div className="flex items-end gap-1 h-24">
                {last7DaysBars.bars.map((b) => (
                  <div key={b.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div
                      className="w-full max-w-[28px] mx-auto rounded-t bg-[var(--accent)]/70 min-h-[4px] transition-all"
                      style={{ height: `${Math.round((b.count / last7DaysBars.max) * 72)}px` }}
                      title={`${b.count} entradas`}
                    />
                    <span className="text-[9px] text-[var(--muted)] truncate w-full text-center">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[var(--text)] mb-2">Por día de la semana (entradas)</p>
              <div className="flex items-end gap-1 h-24">
                {insights.weekdayEntryCounts.map((c, wd) => (
                  <div key={weekdayLabels[wd]} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div
                      className="w-full max-w-[22px] mx-auto rounded-t bg-[var(--accent)]/50 min-h-[4px]"
                      style={{ height: `${Math.round((c / weekdayBarMax) * 72)}px` }}
                      title={`${weekdayLabels[wd]}: ${c} entradas`}
                    />
                    <span className="text-[9px] text-[var(--muted)]">{weekdayLabels[wd]}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[var(--muted)] mt-1">
                Más entradas:{' '}
                <strong className="text-[var(--text)]">{insights.peakWeekdayLabel}</strong>
                {insights.peakWeekdayCount > 0 ? ` (${insights.peakWeekdayCount})` : ''}
              </p>
            </div>
            <div className="lg:col-span-1 min-w-0">
              <p className="text-[11px] font-semibold text-[var(--text)] mb-2">Por hora (entradas)</p>
              <div className="flex items-end gap-0.5 h-28 px-0.5">
                {insights.hourEntryCounts.map((c, h) => (
                  <div
                    key={h}
                    className="flex-1 min-w-0 flex flex-col items-center justify-end gap-0.5 h-full"
                    title={`${String(h).padStart(2, '0')}:00 — ${c} entradas`}
                  >
                    <div
                      className="w-full max-w-[10px] mx-auto rounded-t bg-[var(--accent)]/65 min-h-[2px]"
                      style={{ height: `${Math.max(2, Math.round((c / hourBarMax) * 80))}px` }}
                    />
                    {h % 3 === 0 ? (
                      <span className="text-[8px] text-[var(--muted)] tabular-nums leading-none">{h}</span>
                    ) : (
                      <span className="h-2.5 shrink-0" aria-hidden />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[var(--muted)] mt-1">
                Pico: <strong className="text-[var(--text)]">{insights.peakHourLabel}</strong>
                {insights.peakHourCount > 0 ? ` (${insights.peakHourCount} entradas)` : ''}
              </p>
            </div>
          </div>

          <p className="text-[10px] text-[var(--muted)] mt-3">
            Total en periodo: {insights.totalEntryEvents} entradas · {insights.totalExitEvents} salidas. Registra eventos con
            columna <code className="text-[var(--accent)]">event_type</code> (<code>entry</code>/<code>exit</code>) o
            check-in/out en la misma fila.
          </p>
        </>
      )}
    </section>
  )
}
