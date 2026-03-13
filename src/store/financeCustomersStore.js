import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useTenantStore } from './tenantStore'

const FINANCE_CUSTOMERS_KEY = 'finance:customers'

const mockCustomers = [
  {
    id: 'c-1',
    tenant_id: 'local',
    name: 'Panaderia Centro',
    phone: '7221234567',
    email: '',
    notes: '',
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

const isMissingTableError = (error) => {
  const text = String(error?.message || error?.details || error?.hint || '').toLowerCase()
  return text.includes('could not find the table') || text.includes('relation') || text.includes('schema cache')
}

export const useFinanceCustomersStore = create((set, get) => ({
  customers: [],
  loading: false,
  error: null,
  backendReady: null,

  ensureBackend: async () => {
    const cached = get().backendReady
    if (cached === true || cached === false) return cached

    const tenantId = useTenantStore.getState().currentTenantId
    if (!tenantId || tenantId === 'local' || !isSupabaseConfigured() || !supabase) {
      set({ backendReady: false })
      return false
    }

    try {
      const { error } = await supabase.from('finance_customers').select('id').limit(1)
      if (error) {
        if (isMissingTableError(error)) {
          set({ backendReady: false })
          return false
        }
        throw error
      }
      set({ backendReady: true })
      return true
    } catch {
      set({ backendReady: false })
      return false
    }
  },

  fetchCustomers: async () => {
    set({ loading: true, error: null })
    try {
      const tenantId = useTenantStore.getState().currentTenantId || 'local'
      const backendReady = await get().ensureBackend()
      if (backendReady && tenantId !== 'local') {
        const { data, error } = await supabase
          .from('finance_customers')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
        if (error) throw error
        set({ customers: data || [], loading: false })
        return
      }

      const local = safeRead(FINANCE_CUSTOMERS_KEY, mockCustomers)
      set({ customers: local, loading: false })
    } catch (error) {
      set({ error: error.message || 'Error cargando clientes', loading: false })
    }
  },

  addCustomer: async ({ name, phone = '', email = '', notes = '' }) => {
    const safeName = String(name || '').trim()
    if (!safeName) throw new Error('El nombre del cliente es obligatorio.')

    const tenantId = useTenantStore.getState().currentTenantId || 'local'
    const payload = {
      tenant_id: tenantId,
      name: safeName,
      phone: String(phone || '').trim(),
      email: String(email || '').trim(),
      notes: String(notes || '').trim()
    }

    const backendReady = await get().ensureBackend()
    if (backendReady && tenantId !== 'local') {
      const { data, error } = await supabase
        .from('finance_customers')
        .insert(payload)
        .select('*')
        .single()

      if (error) throw error

      set((state) => ({ customers: [data, ...state.customers] }))
      return data
    }

    const local = safeRead(FINANCE_CUSTOMERS_KEY, mockCustomers)
    const next = [{
      id: `c-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, ...local]
    safeWrite(FINANCE_CUSTOMERS_KEY, next)
    set({ customers: next })
    return next[0]
  }
}))
