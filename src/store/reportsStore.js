import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useTenantStore } from './tenantStore'
import { useAuthStore } from './authStore'

// Mock data for fallback
const mockTopProducts = [
  { name: 'Product A', quantity: 45 },
  { name: 'Product B', quantity: 32 },
  { name: 'Product C', quantity: 28 },
  { name: 'Product D', quantity: 21 },
  { name: 'Product E', quantity: 15 }
]

const mockRepeatCustomers = [
  { id: 1, name: 'John', lastName: 'Doe', phone: '555-0101', purchaseCount: 8, totalSpent: 2400 },
  { id: 2, name: 'Jane', lastName: 'Smith', phone: '555-0102', purchaseCount: 6, totalSpent: 1850 },
  { id: 3, name: 'Bob', lastName: 'Johnson', phone: '555-0103', purchaseCount: 4, totalSpent: 980 }
]

const mockDailySales = [
  { date: '2026-01-18', total: 450 },
  { date: '2026-01-19', total: 520 },
  { date: '2026-01-20', total: 380 },
  { date: '2026-01-21', total: 610 },
  { date: '2026-01-22', total: 490 },
  { date: '2026-01-23', total: 550 },
  { date: '2026-01-24', total: 680 }
]

const mockDailySoldProducts = [
  { id: 'm1', name: 'Product A', code: 'A-001', quantitySold: 4, revenue: 520 },
  { id: 'm2', name: 'Product B', code: 'B-002', quantitySold: 2, revenue: 300 }
]

const FINANCE_RECEIVABLES_KEY = 'finance:receivables'
const FINANCE_CASH_SESSIONS_KEY = 'finance:cash_sessions'
const FINANCE_CASH_MOVEMENTS_KEY = 'finance:cash_movements'
const FINANCE_PAYMENTS_KEY = 'finance:payments'
const DAILY_ALLOWED_PAYMENT_METHODS = ['cash', 'card', 'transfer']

const isMissingFinanceSchemaError = (error) => {
  const text = String(error?.message || error?.details || error?.hint || '').toLowerCase()
  return text.includes('could not find the table') || text.includes('relation') || text.includes('schema cache')
}

const isMissingColumnOrRelationError = (error) => {
  const text = String(error?.message || error?.details || error?.hint || '').toLowerCase()
  return text.includes('column') ||
    text.includes('foreign key') ||
    text.includes('relationship') ||
    text.includes('does not exist') ||
    text.includes('schema cache')
}

const mockReceivables = [
  {
    id: 'r-1',
    business_id: 'local',
    client_id: null,
    client_name: 'Panaderia Centro',
    concept: 'Pedido mayoreo facturado',
    amount: 1450,
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: new Date().toISOString().slice(0, 10),
    notes: '',
    status: 'pending',
    created_at: new Date().toISOString()
  }
]

const safeRead = (key, fallback = []) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const safeWrite = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore local storage write errors
  }
}

const getDayRangeFromDateRange = (dateRange = null) => {
  if (dateRange?.start && dateRange?.end) {
    const start = new Date(dateRange.start)
    const end = new Date(dateRange.end)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString()
    }
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  return {
    startIso: todayStart.toISOString(),
    endIso: null
  }
}

const normalizePaymentMethod = (value) => String(value || '').trim().toLowerCase()

const isSaleInRange = (sale, startIso, endIso) => {
  const createdAt = String(sale?.created_at || '')
  if (!createdAt) return false
  if (createdAt < startIso) return false
  if (endIso && createdAt > endIso) return false
  return true
}

const calculateSalesTotal = (sales = []) => {
  return sales.reduce((sum, sale) => sum + Number(sale?.total || 0), 0)
}

const countTickets = (sales = []) => sales.length

/**
 * Reports store
 * Manages reports and analytics data
 */
export const useReportsStore = create((set, get) => ({
  financeBackendReady: null,
  receivablesJoinReady: null,
  dailyTotal: 0,
  dailyTickets: 0,
  financialSummary: {
    todayIncome: 0,
    monthIncome: 0,
    receivablesTotal: 0,
    currentCash: 0
  },
  receivables: [],
  cashSession: null,
  cashSessionsHistory: [],
  cashMovements: [],
  cashXCut: {
    totalSales: 0,
    totalExpenses: 0,
    totalAdjustments: 0,
    currentBalance: 0
  },
  topProducts: [],
  repeatCustomers: [],
  outOfStockProducts: [],
  monthlySummary: null,
  profitMargin: null,
  leastSoldProducts: [],
  dailySoldProducts: [],
  loading: false,
  error: null,

  ensureFinanceBackend: async () => {
    const cached = get().financeBackendReady
    if (cached === true || cached === false) return cached

    const tenantId = useTenantStore.getState().currentTenantId
    if (!tenantId || tenantId === 'local') {
      return false
    }

    if (!isSupabaseConfigured() || !supabase) {
      return false
    }

    try {
      const { error } = await supabase
        .from('cash_sessions')
        .select('id')
        .limit(1)

      if (error) {
        if (isMissingFinanceSchemaError(error)) {
          console.warn('Finance schema not found in Supabase, using local fallback.')
          set({ financeBackendReady: false })
          return false
        }
      }

      set({ financeBackendReady: true })
      return true
    } catch (error) {
      if (isMissingFinanceSchemaError(error)) {
        console.warn('Finance schema not found in Supabase, using local fallback.')
        set({ financeBackendReady: false })
        return false
      }
      set({ financeBackendReady: false })
      return false
    }
  },

  fetchUnifiedDailySalesTotal: async (dateRange = null) => {
    const tenantId = useTenantStore.getState().currentTenantId
    const { startIso, endIso } = getDayRangeFromDateRange(dateRange)

    if (isSupabaseConfigured() && supabase && tenantId) {
      let query = supabase
        .from('sales')
        .select('total')
        .eq('business_id', tenantId)
        .eq('status', 'completed')
        .in('payment_method', DAILY_ALLOWED_PAYMENT_METHODS)
        .gte('created_at', startIso)

      if (endIso) {
        query = query.lte('created_at', endIso)
      }

      const { data, error } = await query
      if (error) throw error
      return calculateSalesTotal(data || [])
    }

    const localSales = safeRead('sales', [])
    const filtered = localSales.filter((sale) => {
      const method = normalizePaymentMethod(sale.payment_method || sale.paymentMethod)
      return sale.status === 'completed' && DAILY_ALLOWED_PAYMENT_METHODS.includes(method) && isSaleInRange(sale, startIso, endIso)
    })
    return calculateSalesTotal(filtered)
  },

  fetchFinancialSummary: async () => {
    try {
      const tenantId = useTenantStore.getState().currentTenantId
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      if (isSupabaseConfigured() && supabase && tenantId) {
        const [todayIncome, { data: monthSales }] = await Promise.all([
          get().fetchUnifiedDailySalesTotal(),
          supabase
            .from('sales')
            .select('total')
            .eq('business_id', tenantId)
            .gte('created_at', monthStart.toISOString())
            .eq('status', 'completed'),
        ])

        const monthIncome = (monthSales || []).reduce((sum, row) => sum + Number(row.total || 0), 0)
        let receivablesTotal = 0
        let currentCash = 0
        let activeSession = null

        const { data: pendingReceivables, error: pendingError } = await supabase
          .from('accounts_receivable')
          .select('amount')
          .eq('business_id', tenantId)
          .eq('status', 'pending')

        if (!pendingError) {
          receivablesTotal = (pendingReceivables || []).reduce((sum, row) => sum + Number(row.amount || 0), 0)
        }

        const canUseFinanceBackend = await get().ensureFinanceBackend()
        if (canUseFinanceBackend) {
          const { data: openSession } = await supabase
            .from('cash_sessions')
            .select('*')
            .eq('business_id', tenantId)
            .eq('status', 'open')
            .order('opened_at', { ascending: false })
            .limit(1)

          activeSession = openSession?.[0] || null
        }

        if (activeSession) {
          const { data: moves } = await supabase
            .from('cash_movements')
            .select('type, amount')
            .eq('session_id', activeSession.id)

          const sales = (moves || []).filter((m) => m.type === 'sale').reduce((sum, m) => sum + Number(m.amount || 0), 0)
          const expenses = (moves || []).filter((m) => m.type === 'expense').reduce((sum, m) => sum + Number(m.amount || 0), 0)
          const adjustments = (moves || []).filter((m) => m.type === 'adjustment').reduce((sum, m) => sum + Number(m.amount || 0), 0)
          currentCash = Number(activeSession.opening_amount || 0) + sales - expenses + adjustments
          set({ cashSession: activeSession })
        } else {
          set({ cashSession: null })
        }

        set({
          financialSummary: {
            todayIncome,
            monthIncome,
            receivablesTotal,
            currentCash
          }
        })
        return
      }

      const localReceivables = safeRead(FINANCE_RECEIVABLES_KEY, mockReceivables)
      const localSessions = safeRead(FINANCE_CASH_SESSIONS_KEY, [])
      const localMoves = safeRead(FINANCE_CASH_MOVEMENTS_KEY, [])
      const localSales = safeRead('sales', [])

      const monthIso = monthStart.toISOString().slice(0, 7)

      const todayIncome = await get().fetchUnifiedDailySalesTotal()

      const monthIncome = localSales
        .filter((sale) => String(sale.created_at || '').slice(0, 7) === monthIso && sale.status === 'completed')
        .reduce((sum, sale) => sum + Number(sale.total || 0), 0)

      const receivablesTotal = localReceivables
        .filter((r) => r.status === 'pending')
        .reduce((sum, r) => sum + Number(r.amount || 0), 0)

      const activeSession = localSessions.find((s) => s.status === 'open') || null
      const sessionMoves = activeSession ? localMoves.filter((m) => m.session_id === activeSession.id) : []
      const currentCash = activeSession
        ? Number(activeSession.opening_amount || 0) + sessionMoves.reduce((sum, m) => {
          const amount = Number(m.amount || 0)
          if (m.type === 'sale') return sum + amount
          if (m.type === 'expense') return sum - amount
          return sum + amount
        }, 0)
        : 0

      set({
        cashSession: activeSession,
        financialSummary: {
          todayIncome,
          monthIncome,
          receivablesTotal,
          currentCash
        }
      })
    } catch (error) {
      console.warn('Error fetching financial summary:', error.message)
    }
  },

  fetchReceivables: async () => {
    const requestedTenantId = useTenantStore.getState().currentTenantId

    const isStaleRequest = () => {
      const liveTenantId = useTenantStore.getState().currentTenantId
      return String(liveTenantId || '') !== String(requestedTenantId || '')
    }

    const getLocalReceivablesBackup = () => {
      const local = safeRead(FINANCE_RECEIVABLES_KEY, mockReceivables)
      if (!requestedTenantId) return local

      const exactTenantRows = local.filter((row) => String(row?.business_id ?? row?.tenant_id ?? '') === String(requestedTenantId))
      if (exactTenantRows.length > 0) return exactTenantRows

      // Migration safety: previously some rows were stored under "local" before tenant finished loading.
      if (requestedTenantId !== 'local') {
        const legacyLocalRows = local.filter((row) => String(row?.business_id ?? row?.tenant_id ?? '') === 'local')
        if (legacyLocalRows.length > 0) return legacyLocalRows
      }

      return local
    }

    try {
      // If tenant is still resolving, avoid clobbering state with local fallback.
      if (!requestedTenantId) {
        return
      }

      if (isSupabaseConfigured() && supabase && requestedTenantId !== 'local') {
        const canTryJoined = get().receivablesJoinReady !== false

        if (canTryJoined) {
          const { data: joinedData, error: joinedError } = await supabase
            .from('accounts_receivable')
            .select('*, finance_customers(id, name, phone, email)')
            .eq('business_id', requestedTenantId)
            .order('created_at', { ascending: false })

          if (!joinedError) {
            if (isStaleRequest()) return
            const rows = joinedData || []
            if (rows.length > 0) {
              set({ receivables: rows, receivablesJoinReady: true })
            } else {
              const backupRows = getLocalReceivablesBackup()
              set({ receivables: backupRows, receivablesJoinReady: true })
            }
            return
          }

          if (!isMissingColumnOrRelationError(joinedError) && !isMissingFinanceSchemaError(joinedError)) {
            throw joinedError
          }

          if (isMissingColumnOrRelationError(joinedError)) {
            set({ receivablesJoinReady: false })
          }
        }

        const { data, error } = await supabase
          .from('accounts_receivable')
          .select('*')
          .eq('business_id', requestedTenantId)
          .order('created_at', { ascending: false })
        if (error) throw error
        if (isStaleRequest()) return
        const rows = data || []
        if (rows.length > 0) {
          set({ receivables: rows })
        } else {
          set({ receivables: getLocalReceivablesBackup() })
        }
        return
      }

      const local = getLocalReceivablesBackup()
      if (isStaleRequest()) return
      set({ receivables: local })
    } catch (error) {
      console.warn('Error fetching receivables:', error.message)
      if (isStaleRequest()) return
      set({ receivables: getLocalReceivablesBackup() })
    }
  },

  createReceivable: async ({ client_id = null, client_name = '', concept, amount, issue_date, due_date, notes = '' }) => {
    const tenantId = useTenantStore.getState().currentTenantId || 'local'
    const safeAmount = Number(amount || 0)
    if (!concept || !String(concept).trim() || safeAmount <= 0) {
      throw new Error('Concepto y monto son obligatorios.')
    }

    const payload = {
      business_id: tenantId,
      client_id: client_id || null,
      client_name: String(client_name || 'Cliente').trim(),
      concept: String(concept).trim(),
      amount: safeAmount,
      issue_date: issue_date || new Date().toISOString().slice(0, 10),
      due_date: due_date || null,
      notes: String(notes || '').trim(),
      status: 'pending'
    }

    try {
      if (isSupabaseConfigured() && supabase && tenantId !== 'local') {
        const { error: insertError } = await supabase
          .from('accounts_receivable')
          .insert(payload)

        if (insertError) {
          if (isMissingFinanceSchemaError(insertError)) {
            set({ financeBackendReady: false })
            throw insertError
          }
          if (!isMissingColumnOrRelationError(insertError)) throw insertError

          const legacyPayload = {
            business_id: tenantId,
            client_name: payload.client_name,
            concept: payload.concept,
            amount: payload.amount,
            due_date: payload.due_date,
            status: 'pending'
          }

          const { error: legacyError } = await supabase
            .from('accounts_receivable')
            .insert(legacyPayload)

          if (legacyError) throw legacyError
        }

        await get().fetchReceivables()
        await get().fetchFinancialSummary()
        return
      }

      const local = safeRead(FINANCE_RECEIVABLES_KEY, mockReceivables)
      const next = [
        {
          id: `r-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          ...payload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        ...local
      ]
      safeWrite(FINANCE_RECEIVABLES_KEY, next)
      set({ receivables: next })
      await get().fetchFinancialSummary()
    } catch (error) {
      console.warn('Error creating receivable:', error.message)
      throw error
    }
  },

  markReceivableAsPaid: async (receivableId) => {
    try {
      const row = get().receivables.find((item) => item.id === receivableId)
      if (!row || row.status === 'paid') return
      await get().registerReceivablePayment(receivableId, {
        amount: Number(row.amount || 0),
        payment_method: 'cash'
      })
    } catch (error) {
      console.warn('Error marking receivable as paid:', error.message)
    }
  },

  registerReceivablePayment: async (receivableId, { amount, payment_method = 'cash' }) => {
    const tenantId = useTenantStore.getState().currentTenantId || 'local'
    const userId = useAuthStore.getState().user?.id || null
    const paymentAmount = Number(amount || 0)
    if (paymentAmount <= 0) return

    try {
      if (isSupabaseConfigured() && supabase && tenantId !== 'local') {
        const { data: receivable, error: fetchError } = await supabase
          .from('accounts_receivable')
          .select('*')
          .eq('id', receivableId)
          .single()
        if (fetchError) {
          if (isMissingFinanceSchemaError(fetchError)) {
            set({ financeBackendReady: false })
            throw fetchError
          }
          throw fetchError
        }

        const totalDue = Number(receivable.amount || 0)
        const { data: existingPayments, error: paymentsFetchError } = await supabase
          .from('payments')
          .select('amount')
          .eq('receivable_id', receivableId)
        if (paymentsFetchError) throw paymentsFetchError

        const paidSoFarBefore = (existingPayments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0)
        const remainingBefore = Math.max(0, totalDue - paidSoFarBefore)
        if (remainingBefore <= 0) {
          throw new Error('Esta cuenta ya está liquidada.')
        }

        const appliedAmount = Math.min(paymentAmount, remainingBefore)
        if (appliedAmount <= 0) {
          throw new Error('Monto inválido para aplicar a la cuenta.')
        }

        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            receivable_id: receivableId,
            amount: appliedAmount,
            payment_method,
            paid_at: new Date().toISOString(),
            user_id: userId,
            business_id: tenantId
          })
        if (paymentError) throw paymentError

        const { data: paymentsData } = await supabase
          .from('payments')
          .select('amount')
          .eq('receivable_id', receivableId)
        const paidSoFar = (paymentsData || []).reduce((sum, p) => sum + Number(p.amount || 0), 0)
        const status = paidSoFar >= totalDue ? 'paid' : 'pending'

        await supabase
          .from('accounts_receivable')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', receivableId)

        if (payment_method === 'cash') {
          const { data: openSession } = await supabase
            .from('cash_sessions')
            .select('*')
            .eq('business_id', tenantId)
            .eq('status', 'open')
            .order('opened_at', { ascending: false })
            .limit(1)

          const session = openSession?.[0]
          if (session) {
            await supabase.from('cash_movements').insert({
              business_id: tenantId,
              session_id: session.id,
              type: 'sale',
              description: `Pago CxC ${receivable.client_name || ''}`,
              amount: appliedAmount,
              created_at: new Date().toISOString(),
              user_id: userId
            })
          }
        }

        await get().fetchReceivables()
        await get().fetchFinancialSummary()
        return {
          appliedAmount,
          paidSoFar,
          remaining: Math.max(0, totalDue - paidSoFar),
          status
        }
      }

      const receivables = safeRead(FINANCE_RECEIVABLES_KEY, mockReceivables)
      const payments = safeRead(FINANCE_PAYMENTS_KEY, [])
      const targetReceivable = receivables.find((item) => item.id === receivableId)
      const totalDue = Number(targetReceivable?.amount || 0)
      const paidSoFarBefore = payments
        .filter((p) => p.receivable_id === receivableId)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0)
      const remainingBefore = Math.max(0, totalDue - paidSoFarBefore)
      if (remainingBefore <= 0) {
        throw new Error('Esta cuenta ya está liquidada.')
      }

      const appliedAmount = Math.min(paymentAmount, remainingBefore)
      if (appliedAmount <= 0) {
        throw new Error('Monto inválido para aplicar a la cuenta.')
      }

      payments.push({
        id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        receivable_id: receivableId,
        amount: appliedAmount,
        payment_method,
        paid_at: new Date().toISOString(),
        user_id: userId
      })
      safeWrite(FINANCE_PAYMENTS_KEY, payments)

      const updatedReceivables = receivables.map((item) => {
        if (item.id !== receivableId) return item
        const paidSoFar = payments
          .filter((p) => p.receivable_id === receivableId)
          .reduce((sum, p) => sum + Number(p.amount || 0), 0)
        return {
          ...item,
          status: paidSoFar >= Number(item.amount || 0) ? 'paid' : 'pending',
          updated_at: new Date().toISOString()
        }
      })
      safeWrite(FINANCE_RECEIVABLES_KEY, updatedReceivables)

      if (payment_method === 'cash') {
        await get().registerCashMovement({
          type: 'sale',
          description: 'Pago de cuenta por cobrar',
          amount: appliedAmount
        })
      }

      set({ receivables: updatedReceivables })
      await get().fetchFinancialSummary()
      const paidSoFar = payments
        .filter((p) => p.receivable_id === receivableId)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0)

      return {
        appliedAmount,
        paidSoFar,
        remaining: Math.max(0, totalDue - paidSoFar),
        status: paidSoFar >= totalDue ? 'paid' : 'pending'
      }
    } catch (error) {
      if (isMissingFinanceSchemaError(error)) {
        set({ financeBackendReady: false })

        const receivables = safeRead(FINANCE_RECEIVABLES_KEY, mockReceivables)
        const payments = safeRead(FINANCE_PAYMENTS_KEY, [])
        const targetReceivable = receivables.find((item) => item.id === receivableId)

        if (!targetReceivable) {
          throw new Error('No se encontró la cuenta por cobrar.')
        }

        const totalDue = Number(targetReceivable.amount || 0)
        const paidSoFarBefore = payments
          .filter((p) => p.receivable_id === receivableId)
          .reduce((sum, p) => sum + Number(p.amount || 0), 0)
        const remainingBefore = Math.max(0, totalDue - paidSoFarBefore)
        if (remainingBefore <= 0) {
          throw new Error('Esta cuenta ya está liquidada.')
        }

        const appliedAmount = Math.min(paymentAmount, remainingBefore)
        if (appliedAmount <= 0) {
          throw new Error('Monto inválido para aplicar a la cuenta.')
        }

        payments.push({
          id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          receivable_id: receivableId,
          amount: appliedAmount,
          payment_method,
          paid_at: new Date().toISOString(),
          user_id: userId
        })
        safeWrite(FINANCE_PAYMENTS_KEY, payments)

        const updatedReceivables = receivables.map((item) => {
          if (item.id !== receivableId) return item
          const paidSoFar = payments
            .filter((p) => p.receivable_id === receivableId)
            .reduce((sum, p) => sum + Number(p.amount || 0), 0)
          return {
            ...item,
            status: paidSoFar >= Number(item.amount || 0) ? 'paid' : 'pending',
            updated_at: new Date().toISOString()
          }
        })
        safeWrite(FINANCE_RECEIVABLES_KEY, updatedReceivables)

        if (payment_method === 'cash') {
          await get().registerCashMovement({
            type: 'sale',
            description: 'Pago de cuenta por cobrar',
            amount: appliedAmount
          })
        }

        set({ receivables: updatedReceivables })
        await get().fetchFinancialSummary()

        const paidSoFar = payments
          .filter((p) => p.receivable_id === receivableId)
          .reduce((sum, p) => sum + Number(p.amount || 0), 0)

        return {
          appliedAmount,
          paidSoFar,
          remaining: Math.max(0, totalDue - paidSoFar),
          status: paidSoFar >= totalDue ? 'paid' : 'pending'
        }
      }

      console.warn('Error registering receivable payment:', error.message)
      throw error
    }
  },

  fetchCashSession: async () => {
    try {
      const tenantId = useTenantStore.getState().currentTenantId || 'local'
      const canUseFinanceBackend = await get().ensureFinanceBackend()
      if (canUseFinanceBackend && tenantId !== 'local') {
        const { data, error } = await supabase
          .from('cash_sessions')
          .select('*')
          .eq('business_id', tenantId)
          .eq('status', 'open')
          .order('opened_at', { ascending: false })
          .limit(1)
        if (error) throw error
        set({ cashSession: data?.[0] || null })
        return
      }

      const sessions = safeRead(FINANCE_CASH_SESSIONS_KEY, [])
      const session = sessions.find((s) => s.status === 'open') || null
      set({ cashSession: session })
    } catch (error) {
      console.warn('Error fetching cash session:', error.message)
      set({ cashSession: null })
    }
  },

  fetchCashSessionsHistory: async () => {
    try {
      const tenantId = useTenantStore.getState().currentTenantId || 'local'
      const canUseFinanceBackend = await get().ensureFinanceBackend()
      if (canUseFinanceBackend && tenantId !== 'local') {
        const { data, error } = await supabase
          .from('cash_sessions')
          .select('*')
          .eq('business_id', tenantId)
          .order('opened_at', { ascending: false })
          .limit(200)
        if (error) throw error
        set({ cashSessionsHistory: data || [] })
        return
      }

      const sessions = safeRead(FINANCE_CASH_SESSIONS_KEY, [])
      const ordered = [...sessions].sort((a, b) => String(b.opened_at || '').localeCompare(String(a.opened_at || '')))
      set({ cashSessionsHistory: ordered })
    } catch (error) {
      console.warn('Error fetching cash sessions history:', error.message)
      set({ cashSessionsHistory: [] })
    }
  },

  openCashSession: async (openingAmount = 0) => {
    const tenantId = useTenantStore.getState().currentTenantId || 'local'
    const userId = useAuthStore.getState().user?.id || null
    const amount = Number(openingAmount || 0)

    try {
      const canUseFinanceBackend = await get().ensureFinanceBackend()
      if (canUseFinanceBackend && tenantId !== 'local') {
        const { data: openData } = await supabase
          .from('cash_sessions')
          .select('id')
          .eq('business_id', tenantId)
          .eq('status', 'open')
          .limit(1)
        if (openData?.length) return

        await supabase.from('cash_sessions').insert({
          business_id: tenantId,
          opened_by_user_id: userId,
          opened_at: new Date().toISOString(),
          opening_amount: amount,
          status: 'open'
        })
        await get().fetchCashSession()
        return
      }

      const sessions = safeRead(FINANCE_CASH_SESSIONS_KEY, [])
      if (sessions.some((s) => s.status === 'open')) return
      sessions.unshift({
        id: `cash-${Date.now()}`,
        business_id: tenantId,
        opened_by_user_id: userId,
        opened_at: new Date().toISOString(),
        opening_amount: amount,
        closing_amount: null,
        status: 'open'
      })
      safeWrite(FINANCE_CASH_SESSIONS_KEY, sessions)
      set({ cashSession: sessions[0] })
    } catch (error) {
      console.warn('Error opening cash session:', error.message)
    }
  },

  fetchCashMovements: async (sessionId = null) => {
    try {
      const tenantId = useTenantStore.getState().currentTenantId || 'local'
      const activeSessionId = sessionId || get().cashSession?.id
      if (!activeSessionId) {
        set({ cashMovements: [] })
        return
      }

      const canUseFinanceBackend = await get().ensureFinanceBackend()
      if (canUseFinanceBackend && tenantId !== 'local') {
        const { data, error } = await supabase
          .from('cash_movements')
          .select('*')
          .eq('session_id', activeSessionId)
          .order('created_at', { ascending: false })
        if (error) throw error
        set({ cashMovements: data || [] })
        return
      }

      const movements = safeRead(FINANCE_CASH_MOVEMENTS_KEY, [])
      set({
        cashMovements: movements
          .filter((m) => m.session_id === activeSessionId)
          .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
      })
    } catch (error) {
      console.warn('Error fetching cash movements:', error.message)
      set({ cashMovements: [] })
    }
  },

  registerCashMovement: async ({ type = 'adjustment', description = '', amount = 0 }) => {
    const tenantId = useTenantStore.getState().currentTenantId || 'local'
    const userId = useAuthStore.getState().user?.id || null
    const numericAmount = Number(amount || 0)
    const session = get().cashSession
    if (!session?.id || numericAmount <= 0) return

    try {
      const canUseFinanceBackend = await get().ensureFinanceBackend()
      if (canUseFinanceBackend && tenantId !== 'local') {
        await supabase.from('cash_movements').insert({
          business_id: tenantId,
          session_id: session.id,
          type,
          description,
          amount: numericAmount,
          created_at: new Date().toISOString(),
          user_id: userId
        })
        await get().fetchCashMovements(session.id)
        await get().fetchXCut()
        return
      }

      const movements = safeRead(FINANCE_CASH_MOVEMENTS_KEY, [])
      movements.unshift({
        id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        session_id: session.id,
        type,
        description,
        amount: numericAmount,
        created_at: new Date().toISOString(),
        user_id: userId
      })
      safeWrite(FINANCE_CASH_MOVEMENTS_KEY, movements)
      await get().fetchCashMovements(session.id)
      await get().fetchXCut()
    } catch (error) {
      console.warn('Error registering cash movement:', error.message)
    }
  },

  fetchXCut: async () => {
    const session = get().cashSession
    if (!session?.id) {
      set({ cashXCut: { totalSales: 0, totalExpenses: 0, totalAdjustments: 0, currentBalance: 0 } })
      return
    }

    await get().fetchCashMovements(session.id)
    const moves = get().cashMovements
    const totalSales = moves.filter((m) => m.type === 'sale').reduce((sum, m) => sum + Number(m.amount || 0), 0)
    const totalExpenses = moves.filter((m) => m.type === 'expense').reduce((sum, m) => sum + Number(m.amount || 0), 0)
    const totalAdjustments = moves.filter((m) => m.type === 'adjustment').reduce((sum, m) => sum + Number(m.amount || 0), 0)
    const currentBalance = Number(session.opening_amount || 0) + totalSales - totalExpenses + totalAdjustments
    set({ cashXCut: { totalSales, totalExpenses, totalAdjustments, currentBalance } })
  },

  closeCashSessionZ: async (closingAmount = 0) => {
    const tenantId = useTenantStore.getState().currentTenantId || 'local'
    const session = get().cashSession
    if (!session?.id) return

    try {
      const amount = Number(closingAmount || 0)
      const canUseFinanceBackend = await get().ensureFinanceBackend()
      if (canUseFinanceBackend && tenantId !== 'local') {
        await supabase
          .from('cash_sessions')
          .update({
            status: 'closed',
            closed_at: new Date().toISOString(),
            closing_amount: amount
          })
          .eq('id', session.id)
        set({ cashSession: null, cashMovements: [] })
        await get().fetchFinancialSummary()
        return
      }

      const sessions = safeRead(FINANCE_CASH_SESSIONS_KEY, [])
      const updated = sessions.map((item) => {
        if (item.id !== session.id) return item
        return {
          ...item,
          status: 'closed',
          closed_at: new Date().toISOString(),
          closing_amount: amount
        }
      })
      safeWrite(FINANCE_CASH_SESSIONS_KEY, updated)
      set({ cashSession: null, cashMovements: [] })
      await get().fetchFinancialSummary()
    } catch (error) {
      console.warn('Error closing cash session Z:', error.message)
    }
  },

  // Fetch daily total
  fetchDailyReport: async (dateRange = null) => {
    set({ loading: true, error: null })
    try {
      const tenantId = useTenantStore.getState().currentTenantId
      const { startIso, endIso } = getDayRangeFromDateRange(dateRange)

      if (isSupabaseConfigured() && supabase && tenantId) {
        let query = supabase
          .from('sales')
          .select('total')
          .eq('business_id', tenantId)
          .eq('status', 'completed')
          .in('payment_method', DAILY_ALLOWED_PAYMENT_METHODS)
          .gte('created_at', startIso)

        if (endIso) {
          query = query.lte('created_at', endIso)
        }

        const { data, error } = await query
        if (error) throw error

        const rows = data || []
        const total = calculateSalesTotal(rows)
        set({
          dailyTotal: Math.round(Number(total || 0) * 100) / 100,
          dailyTickets: countTickets(rows),
          loading: false
        })
        return
      }

      const localSales = safeRead('sales', [])
      const filtered = localSales.filter((sale) => {
        const method = normalizePaymentMethod(sale.payment_method || sale.paymentMethod)
        return sale.status === 'completed' && DAILY_ALLOWED_PAYMENT_METHODS.includes(method) && isSaleInRange(sale, startIso, endIso)
      })
      const total = calculateSalesTotal(filtered)
      set({
        dailyTotal: Math.round(Number(total || 0) * 100) / 100,
        dailyTickets: countTickets(filtered),
        loading: false
      })
    } catch (error) {
      console.warn('Error fetching daily report:', error.message)
      set({ loading: false, error: null, dailyTotal: 0, dailyTickets: 0 })
    }
  },

  fetchDailySoldProducts: async (dateRange = null) => {
    try {
      if (isSupabaseConfigured() && supabase) {
        let query = supabase
          .from('sale_items')
          .select(`
            product_id,
            quantity,
            subtotal,
            unit_price,
            products (
              id,
              name,
              code
            ),
            sales!inner (
              created_at,
              status,
              payment_method
            )
          `)
          .eq('sales.status', 'completed')
          .in('sales.payment_method', DAILY_ALLOWED_PAYMENT_METHODS)

        if (dateRange) {
          query = query
            .gte('sales.created_at', `${dateRange.start}T00:00:00.000Z`)
            .lte('sales.created_at', `${dateRange.end}T23:59:59.999Z`)
        } else {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          query = query.gte('sales.created_at', today.toISOString())
        }

        const { data, error } = await query
        if (error) throw error

        const productMap = {}
        data?.forEach((item) => {
          const productId = item.product_id || item.products?.id
          if (!productId) return

          if (!productMap[productId]) {
            productMap[productId] = {
              id: productId,
              name: item.products?.name || 'Sin nombre',
              code: item.products?.code || '',
              quantitySold: 0,
              revenue: 0
            }
          }

          productMap[productId].quantitySold += Number(item.quantity || 0)
          productMap[productId].revenue += Number(item.subtotal || 0)
        })

        const sorted = Object.values(productMap)
          .sort((a, b) => b.quantitySold - a.quantitySold)

        set({ dailySoldProducts: sorted })
        return
      }

      set({ dailySoldProducts: mockDailySoldProducts })
    } catch (error) {
      console.warn('Error fetching daily sold products, using fallback data:', error.message)
      set({ dailySoldProducts: mockDailySoldProducts })
    }
  },

  // Fetch top products
  fetchTopProducts: async (limit = 10) => {
    try {
      if (isSupabaseConfigured() && supabase) {
        // Use the view if available, otherwise query directly
        const { data, error } = await supabase
          .from('top_products_by_quantity')
          .select('*')
          .limit(limit)

        if (error) {
          // Fallback to direct query if view doesn't exist
          const { data: itemsData, error: itemsError } = await supabase
            .from('sale_items')
            .select(`
              product_id,
              quantity,
              products (
                id,
                name,
                code
              )
            `)

          if (itemsError) {
            console.warn('Supabase error, using mock data:', itemsError.message)
            set({ topProducts: mockTopProducts })
            return
          }

          // Aggregate by product
          const productMap = {}
          itemsData?.forEach(item => {
            const productId = item.product_id
            if (!productMap[productId]) {
              productMap[productId] = {
                id: productId,
                name: item.products?.name || 'Unknown',
                code: item.products?.code || '',
                quantity: 0
              }
            }
            productMap[productId].quantity += item.quantity || 0
          })

          const topProducts = Object.values(productMap)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, limit)
            .map(p => ({ name: p.name, quantity: p.quantity }))

          set({ topProducts: topProducts.length > 0 ? topProducts : mockTopProducts })
        } else {
          const topProducts = data?.map(p => ({
            name: p.name,
            quantity: p.total_quantity_sold || 0
          })) || []
          set({ topProducts: topProducts.length > 0 ? topProducts : mockTopProducts })
        }
      } else {
        // Mock data when not configured
        set({ topProducts: mockTopProducts })
      }
    } catch (error) {
      console.warn('Error fetching top products, using mock data:', error.message)
      set({ topProducts: mockTopProducts })
    }
  },

  // Fetch repeat customers
  fetchRepeatCustomers: async () => {
    try {
      if (isSupabaseConfigured() && supabase) {
        // Try to use the view first
        const { data, error } = await supabase
          .from('repeat_customers')
          .select('*')
          .order('purchase_count', { ascending: false })

        if (error) {
          // Fallback to direct query
          const { data: salesData, error: salesError } = await supabase
            .from('sales')
            .select(`
              customer_id,
              total,
              customers (
                id,
                name,
                last_name,
                phone
              )
            `)
            .not('customer_id', 'is', null)

          if (salesError) {
            console.warn('Supabase error, using mock data:', salesError.message)
            set({ repeatCustomers: mockRepeatCustomers })
            return
          }

          // Aggregate by customer
          const customerMap = {}
          salesData?.forEach(sale => {
            const customerId = sale.customer_id
            if (customerId && sale.customers) {
              if (!customerMap[customerId]) {
                customerMap[customerId] = {
                  id: customerId,
                  name: sale.customers.name || '',
                  lastName: sale.customers.last_name || '',
                  phone: sale.customers.phone || '',
                  purchaseCount: 0,
                  totalSpent: 0
                }
              }
              customerMap[customerId].purchaseCount++
              customerMap[customerId].totalSpent += parseFloat(sale.total || 0)
            }
          })

          const repeatCustomers = Object.values(customerMap)
            .filter(c => c.purchaseCount > 1)
            .sort((a, b) => b.purchaseCount - a.purchaseCount)

          set({ repeatCustomers: repeatCustomers.length > 0 ? repeatCustomers : mockRepeatCustomers })
        } else {
          const repeatCustomers = data?.map(c => ({
            id: c.id,
            name: c.name || '',
            lastName: c.last_name || '',
            phone: c.phone || '',
            purchaseCount: c.purchase_count || 0,
            totalSpent: parseFloat(c.total_spent || 0)
          })) || []
          set({ repeatCustomers: repeatCustomers.length > 0 ? repeatCustomers : mockRepeatCustomers })
        }
      } else {
        set({ repeatCustomers: mockRepeatCustomers })
      }
    } catch (error) {
      console.warn('Error fetching repeat customers, using mock data:', error.message)
      set({ repeatCustomers: mockRepeatCustomers })
    }
  },

  // Fetch out of stock products
  fetchOutOfStock: async () => {
    try {
      if (isSupabaseConfigured() && supabase) {
        // Try to use the view first
        const { data, error } = await supabase
          .from('products_out_of_stock')
          .select('*')

        if (error) {
          // Fallback to direct query
          const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('*')
            .eq('stock', 0)
            .order('last_sale_date', { ascending: false, nullsFirst: false })

          if (productsError) {
            console.warn('Supabase error, using empty data:', productsError.message)
            set({ outOfStockProducts: [] })
            return
          }
          set({ outOfStockProducts: productsData || [] })
        } else {
          set({ outOfStockProducts: data || [] })
        }
      } else {
        set({ outOfStockProducts: [] })
      }
    } catch (error) {
      console.warn('Error fetching out of stock, using empty data:', error.message)
      set({ outOfStockProducts: [] })
    }
  },

  // Fetch monthly summary
  fetchMonthlySummary: async () => {
    try {
      if (isSupabaseConfigured() && supabase) {
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        // Total sales
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('total, payment_method, created_at')
          .gte('created_at', startOfMonth.toISOString())

        if (salesError) {
          console.warn('Supabase error, using mock data:', salesError.message)
          const mockTotal = mockDailySales.reduce((sum, day) => sum + day.total, 0)
          set({
            monthlySummary: {
              total: mockTotal,
              paymentMethods: [
                { name: 'Cash', value: mockTotal * 0.6 },
                { name: 'Card', value: mockTotal * 0.3 },
                { name: 'Transfer', value: mockTotal * 0.1 }
              ],
              dailySales: mockDailySales
            }
          })
          return
        }

        const total = salesData?.reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0) || 0

        // Payment methods breakdown
        const paymentMethods = {}
        salesData?.forEach(sale => {
          const method = sale.payment_method || 'unknown'
          paymentMethods[method] = (paymentMethods[method] || 0) + parseFloat(sale.total || 0)
        })

        const paymentMethodsArray = Object.entries(paymentMethods).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value
        }))

        // Daily sales (last 30 days)
        const dailySalesMap = {}
        salesData?.forEach(sale => {
          const date = new Date(sale.created_at).toISOString().split('T')[0]
          if (!dailySalesMap[date]) {
            dailySalesMap[date] = { date, total: 0 }
          }
          dailySalesMap[date].total += parseFloat(sale.total || 0)
        })

        const dailySales = Object.values(dailySalesMap).sort((a, b) => 
          new Date(a.date) - new Date(b.date)
        )

        set({
          monthlySummary: {
            total: Math.round((total || 0) * 100) / 100,
            paymentMethods: paymentMethodsArray.length > 0 ? paymentMethodsArray : [
              { name: 'Cash', value: 0 },
              { name: 'Card', value: 0 }
            ],
            dailySales: dailySales.length > 0 ? dailySales : mockDailySales
          }
        })
      } else {
        const mockTotal = mockDailySales.reduce((sum, day) => sum + day.total, 0)
        set({
          monthlySummary: {
            total: mockTotal,
            paymentMethods: [
              { name: 'Cash', value: mockTotal * 0.6 },
              { name: 'Card', value: mockTotal * 0.3 },
              { name: 'Transfer', value: mockTotal * 0.1 }
            ],
            dailySales: mockDailySales
          }
        })
      }
    } catch (error) {
      console.warn('Error fetching monthly summary, using mock data:', error.message)
      const mockTotal = mockDailySales.reduce((sum, day) => sum + day.total, 0)
      set({
        monthlySummary: {
          total: mockTotal,
          paymentMethods: [
            { name: 'Cash', value: mockTotal * 0.6 },
            { name: 'Card', value: mockTotal * 0.3 },
            { name: 'Transfer', value: mockTotal * 0.1 }
          ],
          dailySales: mockDailySales
        }
      })
    }
  },

  // Fetch profit margin
  fetchProfitMargin: async () => {
    try {
      if (isSupabaseConfigured() && supabase) {
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        // Get sales with items and product costs
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select(`
            total,
            sale_items (
              quantity,
              unit_price,
              subtotal,
              products (
                price,
                cost
              )
            )
          `)
          .gte('created_at', startOfMonth.toISOString())

        if (salesError) {
          console.warn('Supabase error, using mock data:', salesError.message)
          const mockRevenue = 3680
          const mockCost = 2208
          const mockProfit = mockRevenue - mockCost
          const mockPercentage = (mockProfit / mockRevenue) * 100
          set({
            profitMargin: {
              percentage: mockPercentage.toFixed(1),
              revenue: mockRevenue,
              cost: mockCost,
              profit: mockProfit,
              breakdown: [
                { label: 'Investment', investment: mockCost, profit: 0 },
                { label: 'Profit', investment: 0, profit: mockProfit }
              ]
            }
          })
          return
        }

        let totalRevenue = 0
        let totalCost = 0

        salesData?.forEach(sale => {
          totalRevenue += parseFloat(sale.total || 0)
          sale.sale_items?.forEach(item => {
            // Use actual product cost if available, otherwise estimate 60% of price
            const productCost = parseFloat(item.products?.cost || 0)
            const estimatedCost = parseFloat(item.products?.price || item.unit_price || 0) * 0.6
            const cost = productCost > 0 ? productCost : estimatedCost
            totalCost += cost * (item.quantity || 0)
          })
        })

        const profit = totalRevenue - totalCost
        const percentage = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0

        set({
          profitMargin: {
            percentage: percentage.toFixed(1),
            revenue: totalRevenue,
            cost: totalCost,
            profit: profit,
            breakdown: [
              { label: 'Investment', investment: totalCost, profit: 0 },
              { label: 'Profit', investment: 0, profit: profit }
            ]
          }
        })
      } else {
        const mockRevenue = 3680
        const mockCost = 2208
        const mockProfit = mockRevenue - mockCost
        const mockPercentage = (mockProfit / mockRevenue) * 100
        set({
          profitMargin: {
            percentage: mockPercentage.toFixed(1),
            revenue: mockRevenue,
            cost: mockCost,
            profit: mockProfit,
            breakdown: [
              { label: 'Investment', investment: mockCost, profit: 0 },
              { label: 'Profit', investment: 0, profit: mockProfit }
            ]
          }
        })
      }
    } catch (error) {
      console.warn('Error fetching profit margin, using mock data:', error.message)
      const mockRevenue = 3680
      const mockCost = 2208
      const mockProfit = mockRevenue - mockCost
      const mockPercentage = (mockProfit / mockRevenue) * 100
      set({
        profitMargin: {
          percentage: mockPercentage.toFixed(1),
          revenue: mockRevenue,
          cost: mockCost,
          profit: mockProfit,
          breakdown: [
            { label: 'Investment', investment: mockCost, profit: 0 },
            { label: 'Profit', investment: 0, profit: mockProfit }
          ]
        }
      })
    }
  },

  // Fetch least sold products
  fetchLeastSold: async (limit = 10) => {
    try {
      if (isSupabaseConfigured() && supabase) {
        const { data, error } = await supabase
          .from('sale_items')
          .select(`
            product_id,
            quantity,
            unit_price,
            subtotal,
            products (
              id,
              name,
              code
            )
          `)

        if (error) {
          console.warn('Supabase error, using mock data:', error.message)
          const mockLeastSold = [
            { name: 'Product X', quantitySold: 2, revenue: 80 },
            { name: 'Product Y', quantitySold: 3, revenue: 120 },
            { name: 'Product Z', quantitySold: 5, revenue: 200 }
          ]
          set({ leastSoldProducts: mockLeastSold })
          return
        }

        // Aggregate by product
        const productMap = {}
        data?.forEach(item => {
          const productId = item.product_id
          if (!productMap[productId]) {
            productMap[productId] = {
              id: productId,
              name: item.products?.name || 'Unknown',
              code: item.products?.code || '',
              quantitySold: 0,
              revenue: 0
            }
          }
          productMap[productId].quantitySold += item.quantity || 0
          productMap[productId].revenue += parseFloat(item.subtotal || 0)
        })

        const leastSold = Object.values(productMap)
          .sort((a, b) => a.quantitySold - b.quantitySold)
          .slice(0, limit)

        set({ leastSoldProducts: leastSold.length > 0 ? leastSold : [] })
      } else {
        set({ leastSoldProducts: [] })
      }
    } catch (error) {
      console.warn('Error fetching least sold products, using mock data:', error.message)
      const mockLeastSold = [
        { name: 'Product X', quantitySold: 2, revenue: 80 },
        { name: 'Product Y', quantitySold: 3, revenue: 120 },
        { name: 'Product Z', quantitySold: 5, revenue: 200 }
      ]
      set({ leastSoldProducts: mockLeastSold })
    }
  }
}))