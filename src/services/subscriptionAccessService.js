/**
 * Lectura y normalización de eventos de acceso (entrada/salida) para suscripciones.
 * Soporta varias tablas y formas de fila (sesión con check-in/out o fila por evento).
 */

import { isSupabaseConfigured, supabase } from '../lib/supabase'

const TABLE_CANDIDATES = ['subscription_access_events', 'gym_checkins', 'checkins']

const MEMBER_ID_COLUMNS = [
  'client_membership_id',
  'membership_id',
  'subscriber_id',
  'subscription_customer_id',
  'customer_id',
  'cliente_id'
]

const BUSINESS_ID_COLUMNS = ['business_id', 'tenant_id']

const ORDER_COLUMNS = ['occurred_at', 'checkin_at', 'checked_in_at', 'created_at', 'entry_at']

export const resolveCheckinAt = (row) =>
  row?.checkin_at || row?.checked_in_at || row?.entry_at || null

export const resolveCheckoutAt = (row) =>
  row?.checkout_at || row?.checked_out_at || row?.exit_at || null

const EXPLICIT_ENTRY = new Set(['entry', 'entrada', 'in', 'check_in', 'checkin', 'ingreso', 'arrival'])
const EXPLICIT_EXIT = new Set(['exit', 'salida', 'out', 'check_out', 'checkout', 'egreso', 'departure'])

/**
 * @returns {'entry'|'exit'|null}
 */
export function normalizeExplicitEventKind(row) {
  const candidates = [
    row?.event_type,
    row?.direction,
    row?.type,
    row?.access_type,
    row?.kind,
    row?.movement
  ]
  for (const raw of candidates) {
    const v = String(raw || '')
      .trim()
      .toLowerCase()
    if (!v) continue
    if (EXPLICIT_EXIT.has(v)) return 'exit'
    if (EXPLICIT_ENTRY.has(v)) return 'entry'
  }
  return null
}

/**
 * Convierte una fila de BD en 0..N eventos cronológicos elementales.
 * @returns {{ kind: 'entry'|'exit', at: string, rowId: string }[]}
 */
export function rowToAccessEvents(row) {
  if (!row) return []
  const baseId = String(row.id ?? row.uuid ?? `${row.created_at}-${Math.random()}`)
  const explicit = normalizeExplicitEventKind(row)
  const cin = resolveCheckinAt(row)
  const cout = resolveCheckoutAt(row)
  const fallbackTs = row?.occurred_at || row?.created_at || row?.updated_at || null

  if (explicit === 'entry') {
    const at = cin || fallbackTs
    return at ? [{ kind: 'entry', at: String(at), rowId: `${baseId}-explicit-in` }] : []
  }
  if (explicit === 'exit') {
    const at = cout || fallbackTs
    return at ? [{ kind: 'exit', at: String(at), rowId: `${baseId}-explicit-out` }] : []
  }

  const out = []
  if (cin) out.push({ kind: 'entry', at: String(cin), rowId: `${baseId}-session-in` })
  if (cout) out.push({ kind: 'exit', at: String(cout), rowId: `${baseId}-session-out` })
  if (out.length > 0) return out

  if (fallbackTs) {
    return [{ kind: 'entry', at: String(fallbackTs), rowId: `${baseId}-legacy` }]
  }
  return []
}

function sortEventsDesc(events) {
  return [...events].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}

async function trySelect(table, filters, orderCol, limit) {
  if (!isSupabaseConfigured() || !supabase) return { data: null, error: new Error('no supabase') }
  let q = supabase.from(table).select('*')
  for (const [col, val] of filters) {
    q = q.eq(col, val)
  }
  q = q.order(orderCol, { ascending: false })
  if (limit) q = q.limit(limit)
  return q
}

/**
 * @param {string} memberId - client_memberships.id (uuid)
 * @param {number} limit
 */
export async function fetchAccessRowsForMember(memberId, limit = 80) {
  if (!memberId || !isSupabaseConfigured() || !supabase) return []

  let lastError = null

  for (const table of TABLE_CANDIDATES) {
    for (const col of MEMBER_ID_COLUMNS) {
      for (const orderCol of ORDER_COLUMNS) {
        const { data, error } = await trySelect(table, [[col, memberId]], orderCol, limit)
        if (!error && data) return data
        lastError = error
        const msg = String(error?.message || '').toLowerCase()
        const recoverable =
          msg.includes('column') ||
          msg.includes('does not exist') ||
          msg.includes('schema cache') ||
          msg.includes('could not find the table')
        if (!recoverable && error) throw error
      }
    }
  }

  if (lastError) console.warn('fetchAccessRowsForMember:', lastError.message)
  return []
}

/**
 * @param {string} businessId
 * @param {string} sinceIso - fecha mínima (inclusive)
 * @param {number} limit
 */
export async function fetchAccessRowsForBusiness(businessId, sinceIso, limit = 2000) {
  if (!businessId || !isSupabaseConfigured() || !supabase) return []

  let lastError = null

  for (const table of TABLE_CANDIDATES) {
    for (const col of BUSINESS_ID_COLUMNS) {
      for (const orderCol of ORDER_COLUMNS) {
        let q = supabase.from(table).select('*').eq(col, businessId)
        if (sinceIso) {
          q = q.gte(orderCol, sinceIso)
        }
        q = q.order(orderCol, { ascending: false }).limit(limit)
        const { data, error } = await q
        if (!error && data) return data
        lastError = error
        const msg = String(error?.message || '').toLowerCase()
        const recoverable =
          msg.includes('column') ||
          msg.includes('does not exist') ||
          msg.includes('schema cache') ||
          msg.includes('could not find the table')
        if (!recoverable && error) throw error
      }
    }
  }

  if (lastError) console.warn('fetchAccessRowsForBusiness:', lastError.message)
  return []
}

export function flattenRowsToEvents(rows) {
  const list = []
  for (const row of rows || []) {
    for (const ev of rowToAccessEvents(row)) {
      list.push({
        ...ev,
        memberId:
          row.client_membership_id ||
          row.membership_id ||
          row.subscriber_id ||
          row.subscription_customer_id ||
          row.customer_id ||
          row.cliente_id ||
          null
      })
    }
  }
  return list
}

/** Último evento por miembro (más reciente primero en el tiempo = comparar max timestamp) */
export function estimateInsideNowCount(rows) {
  const byMember = new Map()
  const events = flattenRowsToEvents(rows)

  for (const ev of events) {
    if (!ev.memberId) continue
    const prev = byMember.get(ev.memberId)
    const t = new Date(ev.at).getTime()
    if (!prev || t > prev.t) {
      byMember.set(ev.memberId, { kind: ev.kind, t })
    }
  }

  let inside = 0
  for (const { kind } of byMember.values()) {
    if (kind === 'entry') inside += 1
  }
  return { inside, membersTracked: byMember.size }
}

export function computeAttendanceInsights(rows, { timeZone } = {}) {
  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
  const events = flattenRowsToEvents(rows)
  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  let entriesToday = 0
  let exitsToday = 0
  const weekdayEntryCounts = [0, 0, 0, 0, 0, 0, 0]
  const hourEntryCounts = new Array(24).fill(0)

  for (const ev of events) {
    const d = new Date(ev.at)
    if (Number.isNaN(d.getTime())) continue

    const localDay = new Date(d.toLocaleString('en-US', { timeZone: tz }))
    const todayLocal = new Date(now.toLocaleString('en-US', { timeZone: tz }))
    const sameCalendarDay =
      localDay.getFullYear() === todayLocal.getFullYear() &&
      localDay.getMonth() === todayLocal.getMonth() &&
      localDay.getDate() === todayLocal.getDate()

    if (sameCalendarDay) {
      if (ev.kind === 'entry') entriesToday += 1
      if (ev.kind === 'exit') exitsToday += 1
    }

    if (ev.kind === 'entry') {
      const wd = localDay.getDay()
      weekdayEntryCounts[wd] += 1
      hourEntryCounts[localDay.getHours()] += 1
    }
  }

  const weekdayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  let peakWeekday = 0
  let peakWeekdayCount = -1
  weekdayEntryCounts.forEach((c, i) => {
    if (c > peakWeekdayCount) {
      peakWeekdayCount = c
      peakWeekday = i
    }
  })

  let peakHour = 0
  let peakHourCount = -1
  hourEntryCounts.forEach((c, h) => {
    if (c > peakHourCount) {
      peakHourCount = c
      peakHour = h
    }
  })

  const { inside, membersTracked } = estimateInsideNowCount(rows)

  const nextSameWeekday = new Date(now)
  const daysUntil = (peakWeekday - nextSameWeekday.getDay() + 7) % 7
  nextSameWeekday.setDate(nextSameWeekday.getDate() + (daysUntil === 0 ? 7 : daysUntil))

  return {
    insideNow: inside,
    membersWithEvents: membersTracked,
    entriesToday,
    exitsToday,
    peakWeekdayLabel: weekdayLabels[peakWeekday],
    peakWeekdayCount,
    peakHourLabel: `${String(peakHour).padStart(2, '0')}:00–${String(peakHour + 1).padStart(2, '0')}:00`,
    peakHourCount,
    totalEntryEvents: events.filter((e) => e.kind === 'entry').length,
    totalExitEvents: events.filter((e) => e.kind === 'exit').length,
    weekdayEntryCounts,
    hourEntryCounts,
    nextBusyDayHint:
      peakWeekdayCount > 0
        ? `Suele haber más entradas los ${weekdayLabels[peakWeekday]}${peakHourCount > 0 ? `; franja frecuente ~${String(peakHour).padStart(2, '0')}:00 h` : ''}.`
        : 'Aún no hay suficientes datos para tendencias.'
  }
}

export function memberTimelineFromRows(rows) {
  const events = flattenRowsToEvents(rows)
  return sortEventsDesc(events)
}
