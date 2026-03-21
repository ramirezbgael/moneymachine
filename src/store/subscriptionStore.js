import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthStore } from './authStore'
import { useTenantStore } from './tenantStore'

const STORAGE_KEY = 'subscription-customers'
const PLANS_STORAGE_KEY = 'subscription-monthly-plans'
const DEFAULT_SUBSCRIPTION_PLANS = [299]

const getStorageKey = () => {
  const tenantId = useTenantStore.getState().currentTenantId || 'global'
  return `${STORAGE_KEY}:${tenantId}`
}

const getPlansStorageKey = () => {
  const tenantId = useTenantStore.getState().currentTenantId || 'global'
  return `${PLANS_STORAGE_KEY}:${tenantId}`
}

const normalizePlans = (plans) => {
  const normalized = (Array.isArray(plans) ? plans : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Number(value.toFixed(2)))

  const uniqueSorted = Array.from(new Set(normalized)).sort((a, b) => a - b)
  return uniqueSorted.length > 0 ? uniqueSorted : [...DEFAULT_SUBSCRIPTION_PLANS]
}

const isRlsDeniedError = (error) => {
  const msg = String(error?.message || '').toLowerCase()
  return msg.includes('row-level security') || error?.code === '42501'
}

const safeRead = (key) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch (error) {
    console.error('Error reading subscriptions from storage:', error)
    return []
  }
}

const safeWrite = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error('Error saving subscriptions to storage:', error)
  }
}

const generateSaleNumber = () => {
  const date = new Date()
  const random = Math.floor(Math.random() * 1000)
  return `SUB-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${random}`
}

const addMonths = (dateInput, monthsToAdd) => {
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return new Date().toISOString()

  date.setHours(0, 0, 0, 0)
  const originalDay = date.getDate()
  date.setMonth(date.getMonth() + monthsToAdd)

  if (date.getDate() < originalDay) {
    date.setDate(0)
  }

  return date.toISOString()
}

const calculateDaysLeft = (endDate) => {
  if (!endDate) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const target = new Date(endDate)
  target.setHours(0, 0, 0, 0)

  const diff = target.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const parseSubscriptionSaleNotes = (notes) => {
  const raw = String(notes || '')
  if (!raw.toLowerCase().startsWith('subscription:')) return null

  const parts = raw.split(';').map((part) => part.trim()).filter(Boolean)
  const parsed = {}

  parts.forEach((part) => {
    const separatorIndex = part.indexOf(':')
    if (separatorIndex === -1) return
    const key = part.slice(0, separatorIndex).trim().toLowerCase()
    const value = part.slice(separatorIndex + 1).trim()
    parsed[key] = value
  })

  return parsed
}

const mapHistoryEntry = (entry) => ({
  id: entry.id,
  amount: Number(entry.amount || 0),
  date: entry.date || entry.created_at || new Date().toISOString(),
  months: Math.max(1, Number(entry.months) || 1),
  paymentMethod: entry.paymentMethod || entry.payment_method || 'cash',
  kind: entry.kind || entry.type || 'renewal'
})

const buildSubscriptionSaleNotes = ({ customerId, customerName, months, kind }) => (
  `subscription:${kind}; customer_id:${customerId || ''}; customer:${customerName}; months:${months}`
)

const buildPaymentHistoryMap = (salesRows = []) => {
  return salesRows.reduce((acc, sale) => {
    const parsed = parseSubscriptionSaleNotes(sale.notes)
    if (!parsed) return acc

    const keyById = parsed.customer_id || null
    const keyByName = (parsed.customer || '').trim().toLowerCase()
    const historyEntry = mapHistoryEntry({
      id: sale.id,
      amount: sale.total,
      date: sale.created_at,
      months: parsed.months,
      paymentMethod: sale.payment_method,
      kind: parsed.subscription || parsed.kind || 'renewal'
    })

    if (keyById) {
      acc.byId[keyById] = [...(acc.byId[keyById] || []), historyEntry]
    }

    if (keyByName) {
      acc.byName[keyByName] = [...(acc.byName[keyByName] || []), historyEntry]
    }

    return acc
  }, { byId: {}, byName: {} })
}

const mapDbCustomer = (row) => ({
  id: row.id,
  business_id: row.business_id ?? row.tenant_id,
  name: row.name,
  phone: row.phone || '',
  monthlyFee: Number(row.monthly_fee || 0),
  startDate: row.start_date,
  endDate: row.end_date,
  status: row.status || 'active',
  notes: row.notes || '',
  monthsPurchased: Number(row.months_purchased || 0),
  totalPaid: Number(row.total_paid || 0),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  cancelledAt: row.cancelled_at,
  lastPaymentAt: row.last_payment_at,
  paymentHistory: []
})

const normalizeCustomer = (customer) => {
  const daysLeft = calculateDaysLeft(customer.endDate)
  const isCancelled = customer.status === 'cancelled'
  const paymentHistory = (customer.paymentHistory || customer.sales || [])
    .map(mapHistoryEntry)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return {
    ...customer,
    paymentHistory,
    daysLeft,
    isExpired: !isCancelled && daysLeft < 0,
    isDueSoon: !isCancelled && daysLeft >= 0 && daysLeft <= 7
  }
}

export const useSubscriptionStore = create((set, get) => ({
  customers: [],
  subscriptionPlans: [...DEFAULT_SUBSCRIPTION_PLANS],
  loading: false,
  error: null,

  loadSubscriptionPlans: async () => {
    const tenantId = useTenantStore.getState().currentTenantId

    try {
      if (isSupabaseConfigured() && supabase && tenantId) {
        const { data, error } = await supabase
          .from('saas_module_entitlements')
          .select('metadata')
          .eq('business_id', tenantId)
          .eq('module_key', 'subscriptions')
          .maybeSingle()

        if (error) throw error

        const plansFromMetadata = normalizePlans(data?.metadata?.subscription_monthly_options)
        set({ subscriptionPlans: plansFromMetadata })

        const plansKey = getPlansStorageKey()
        safeWrite(plansKey, plansFromMetadata)
        return plansFromMetadata
      }

      const plansKey = getPlansStorageKey()
      const storedPlans = normalizePlans(safeRead(plansKey))
      set({ subscriptionPlans: storedPlans })
      return storedPlans
    } catch (error) {
      console.error('Error loading subscription plans:', error)
      const plansKey = getPlansStorageKey()
      const fallbackPlans = normalizePlans(safeRead(plansKey))
      set({ subscriptionPlans: fallbackPlans })
      return fallbackPlans
    }
  },

  saveSubscriptionPlans: async (plans) => {
    const normalizedPlans = normalizePlans(plans)
    const tenantId = useTenantStore.getState().currentTenantId

    if (isSupabaseConfigured() && supabase && tenantId) {
      try {
        const { data: existing, error: fetchError } = await supabase
          .from('saas_module_entitlements')
          .select('metadata')
          .eq('business_id', tenantId)
          .eq('module_key', 'subscriptions')
          .maybeSingle()

        if (fetchError) throw fetchError

        const metadata = {
          ...(existing?.metadata || {}),
          subscription_monthly_options: normalizedPlans
        }

        if (existing) {
          const { error: updateError } = await supabase
            .from('saas_module_entitlements')
            .update({ metadata, updated_at: new Date().toISOString() })
            .eq('business_id', tenantId)
            .eq('module_key', 'subscriptions')

          if (updateError) throw updateError
        } else {
          const { error: insertError } = await supabase
            .from('saas_module_entitlements')
            .insert({
              business_id: tenantId,
              module_key: 'subscriptions',
              metadata
            })

          if (insertError) throw insertError
        }
      } catch (error) {
        if (!isRlsDeniedError(error)) {
          throw error
        }
        console.warn('RLS denied saving subscription plans in Supabase. Using local fallback for this tenant.', error)
      }
    }

    const plansKey = getPlansStorageKey()
    safeWrite(plansKey, normalizedPlans)
    set({ subscriptionPlans: normalizedPlans })
    return normalizedPlans
  },

  loadCustomers: async () => {
    set({ loading: true, error: null })

    try {
      const tenantId = useTenantStore.getState().currentTenantId
      if (isSupabaseConfigured() && supabase && tenantId) {
        const { data, error } = await supabase
          .from('client_memberships')
          .select('*')
          .eq('business_id', tenantId)
          .order('created_at', { ascending: false })

        if (error) throw error

        let historyMap = { byId: {}, byName: {} }
        try {
          const { data: salesData, error: salesError } = await supabase
            .from('sales')
            .select('id, total, created_at, notes, payment_method')
            .eq('business_id', tenantId)
            .ilike('notes', 'subscription:%')
            .order('created_at', { ascending: false })

          if (salesError) throw salesError
          historyMap = buildPaymentHistoryMap(salesData || [])
        } catch (salesError) {
          console.warn('Error loading subscription payment history:', salesError)
        }

        const normalizedCustomers = (data || [])
          .map(mapDbCustomer)
          .map((customer) => normalizeCustomer({
            ...customer,
            paymentHistory: historyMap.byId[customer.id] || historyMap.byName[(customer.name || '').trim().toLowerCase()] || []
          }))

        set({ customers: normalizedCustomers, loading: false })
        return
      }

      const key = getStorageKey()
      const stored = safeRead(key)
      const normalized = stored.map(normalizeCustomer)
      set({ customers: normalized, loading: false })
    } catch (error) {
      console.error('Error loading subscription customers:', error)
      set({ error: error.message, loading: false, customers: [] })
    }
  },

  addCustomer: async ({ name, phone = '', monthlyFee, months = 1, notes = '', paymentMethod = 'cash' }) => {
    const monthsNum = Math.max(1, Number(months) || 1)
    const monthlyFeeNum = Math.max(0, Number(monthlyFee) || 0)

    const now = new Date()
    const startDateIso = now.toISOString()
    const endDateIso = addMonths(startDateIso, monthsNum)

    const newCustomer = {
      id: `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      business_id: useTenantStore.getState().currentTenantId,
      name: name?.trim() || 'Cliente sin nombre',
      phone: phone?.trim() || '',
      monthlyFee: monthlyFeeNum,
      startDate: startDateIso,
      endDate: endDateIso,
      status: 'active',
      notes: notes?.trim() || '',
      monthsPurchased: monthsNum,
      totalPaid: monthlyFeeNum * monthsNum,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      paymentHistory: [
        {
          id: `sale-${Date.now()}`,
          kind: 'new_subscription',
          months: monthsNum,
          amount: monthlyFeeNum * monthsNum,
          date: now.toISOString(),
          paymentMethod
        }
      ]
    }

    const tenantId = useTenantStore.getState().currentTenantId
    const userId = useAuthStore.getState().user?.id || null

    if (isSupabaseConfigured() && supabase && tenantId) {
      const { data, error } = await supabase
        .from('client_memberships')
        .insert([
          {
            business_id: tenantId,
            name: newCustomer.name,
            phone: newCustomer.phone,
            monthly_fee: monthlyFeeNum,
            start_date: startDateIso,
            end_date: endDateIso,
            status: 'active',
            notes: newCustomer.notes,
            months_purchased: monthsNum,
            total_paid: monthlyFeeNum * monthsNum,
            last_payment_at: now.toISOString()
          }
        ])
        .select()
        .single()

      if (error) {
        console.warn('Supabase add subscription customer failed, using local fallback:', error)
      } else {
        await get().registerSubscriptionSale({
          tenantId,
          userId,
          customerId: data.id,
          customerName: data.name,
          amount: monthlyFeeNum * monthsNum,
          months: monthsNum,
          kind: 'new_subscription',
          paymentMethod
        })
        await get().loadCustomers()
        return
      }
    }

    const key = getStorageKey()
    const next = [newCustomer, ...get().customers].map(normalizeCustomer)
    safeWrite(key, next)
    set({ customers: next })
  },

  renewCustomer: async (customerId, months = 1, type = 'renewal', paymentMethod = 'cash') => {
    const monthsNum = Math.max(1, Number(months) || 1)

    const tenantId = useTenantStore.getState().currentTenantId
    const userId = useAuthStore.getState().user?.id || null

    if (isSupabaseConfigured() && supabase && tenantId) {
      const customer = get().customers.find(c => c.id === customerId)
      if (!customer) return

      const now = new Date()
      const currentEndDate = new Date(customer.endDate)
      const baseDate = currentEndDate.getTime() > now.getTime() ? customer.endDate : now.toISOString()
      const nextEndDate = addMonths(baseDate, monthsNum)
      const amount = (Number(customer.monthlyFee) || 0) * monthsNum

      const { error } = await supabase
        .from('client_memberships')
        .update({
          status: 'active',
          end_date: nextEndDate,
          months_purchased: (Number(customer.monthsPurchased) || 0) + monthsNum,
          total_paid: (Number(customer.totalPaid) || 0) + amount,
          last_payment_at: now.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', customerId)
        .eq('business_id', tenantId)

      if (error) {
        console.warn('Supabase renew subscription failed, using local fallback:', error)
      } else {
        await get().registerSubscriptionSale({
          tenantId,
          userId,
          customerId: customer.id,
          customerName: customer.name,
          amount,
          months: monthsNum,
          kind: type,
          paymentMethod
        })
        await get().loadCustomers()
        return
      }
    }

    const updated = get().customers.map((customer) => {
      if (customer.id !== customerId) return customer

      const now = new Date()
      const currentEndDate = new Date(customer.endDate)
      const baseDate = currentEndDate.getTime() > now.getTime() ? customer.endDate : now.toISOString()
      const nextEndDate = addMonths(baseDate, monthsNum)
      const amount = (Number(customer.monthlyFee) || 0) * monthsNum

      return normalizeCustomer({
        ...customer,
        status: 'active',
        endDate: nextEndDate,
        monthsPurchased: (Number(customer.monthsPurchased) || 0) + monthsNum,
        totalPaid: (Number(customer.totalPaid) || 0) + amount,
        updatedAt: now.toISOString(),
        paymentHistory: [
          {
            id: `sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            kind: type,
            months: monthsNum,
            amount,
            date: now.toISOString(),
            paymentMethod
          },
          ...(customer.paymentHistory || customer.sales || [])
        ]
      })
    })

    const key = getStorageKey()
    safeWrite(key, updated)
    set({ customers: updated })
  },

  updateCustomer: async (customerId, { name, phone = '', monthlyFee }) => {
    const tenantId = useTenantStore.getState().currentTenantId
    const normalizedName = String(name || '').trim() || 'Cliente sin nombre'
    const normalizedPhone = String(phone || '').trim()
    const normalizedMonthlyFee = Math.max(0, Number(monthlyFee) || 0)

    if (isSupabaseConfigured() && supabase && tenantId) {
      const { error } = await supabase
        .from('client_memberships')
        .update({
          name: normalizedName,
          phone: normalizedPhone,
          monthly_fee: normalizedMonthlyFee,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .eq('business_id', tenantId)

      if (error) {
        console.warn('Supabase update subscription customer failed, using local fallback:', error)
      } else {
        await get().loadCustomers()
        return
      }
    }

    const updated = get().customers.map((customer) => {
      if (customer.id !== customerId) return customer

      return normalizeCustomer({
        ...customer,
        name: normalizedName,
        phone: normalizedPhone,
        monthlyFee: normalizedMonthlyFee,
        updatedAt: new Date().toISOString()
      })
    })

    const key = getStorageKey()
    safeWrite(key, updated)
    set({ customers: updated })
  },

  cancelCustomer: async (customerId) => {
    const tenantId = useTenantStore.getState().currentTenantId

    if (isSupabaseConfigured() && supabase && tenantId) {
      const { error } = await supabase
        .from('client_memberships')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .eq('business_id', tenantId)

      if (error) {
        console.warn('Supabase cancel subscription failed, using local fallback:', error)
      } else {
        await get().loadCustomers()
        return
      }
    }

    const updated = get().customers.map((customer) => {
      if (customer.id !== customerId) return customer

      return normalizeCustomer({
        ...customer,
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
        cancelledAt: new Date().toISOString()
      })
    })

    const key = getStorageKey()
    safeWrite(key, updated)
    set({ customers: updated })
  },

  registerSubscriptionSale: async ({ tenantId, userId, customerId, customerName, amount, months, kind, paymentMethod = 'cash' }) => {
    if (!isSupabaseConfigured() || !supabase || !tenantId) return

    try {
      const saleNumber = generateSaleNumber()
      const notes = buildSubscriptionSaleNotes({ customerId, customerName, months, kind })

      const { error } = await supabase
        .from('sales')
        .insert([
          {
            business_id: tenantId,
            sale_number: saleNumber,
            subtotal: amount,
            total: amount,
            payment_method: paymentMethod,
            receipt_type: 'ticket',
            user_id: userId,
            notes
          }
        ])

      if (error) {
        console.error('Error registering subscription sale:', error)
      }
    } catch (error) {
      console.error('Error registering subscription sale:', error)
    }
  }
}))
