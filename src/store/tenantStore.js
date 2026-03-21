import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Tenant store for multi-tenant SaaS
 * Holds current tenant and list of tenants the user belongs to.
 */
export const useTenantStore = create((set, get) => ({
  currentTenantId: null,
  currentTenant: null, // { id, name, slug }
  tenants: [],
  featureFlags: {
    subscriptions: true
  },
  featureFlagsLoading: true,
  loading: false,
  error: null,

  loadFeatureFlags: async (tenantId) => {
    if (!tenantId) {
      set({ featureFlags: { subscriptions: true }, featureFlagsLoading: false })
      return
    }

    if (!isSupabaseConfigured() || !supabase) {
      set({ featureFlags: { subscriptions: true }, featureFlagsLoading: false })
      return
    }

    set({ featureFlagsLoading: true })
    try {
      const { data, error } = await supabase
        .from('saas_module_entitlements')
        .select('module_key, status, starts_at, ends_at')
        .eq('business_id', tenantId)
        .eq('module_key', 'subscriptions')
        .maybeSingle()

      if (error) throw error

      const now = new Date()
      const startsAt = data?.starts_at ? new Date(data.starts_at) : null
      const endsAt = data?.ends_at ? new Date(data.ends_at) : null
      const statusActive = data?.status === 'active' || data?.status === 'trial'
      const startsOk = !startsAt || startsAt <= now
      const endsOk = !endsAt || endsAt >= now
      const hasModuleConfig = Boolean(data)

      set({
        featureFlags: {
          // Legacy fallback: if module row doesn't exist yet, keep subscriptions visible.
          subscriptions: hasModuleConfig ? Boolean(statusActive && startsOk && endsOk) : true
        },
        featureFlagsLoading: false
      })
    } catch (err) {
      console.error('Error loading tenant feature flags:', err)
      set({
        featureFlags: { subscriptions: true },
        featureFlagsLoading: false
      })
    }
  },

  /**
   * Load tenants for the current user (call after login).
   * @param {string} userId - auth.users.id
   */
  loadTenants: async (userId) => {
    if (!userId) {
      set({
        currentTenantId: null,
        currentTenant: null,
        tenants: [],
        featureFlags: { subscriptions: true },
        featureFlagsLoading: false
      })
      return
    }

    set({ loading: true, error: null, featureFlagsLoading: true })

    if (!isSupabaseConfigured() || !supabase) {
      // Mock: single default tenant
      const defaultTenant = {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Mi Negocio',
        slug: 'default'
      }
      set({
        currentTenantId: defaultTenant.id,
        currentTenant: defaultTenant,
        tenants: [defaultTenant],
        featureFlags: { subscriptions: true },
        featureFlagsLoading: false,
        loading: false
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          business_id,
          businesses (id, name, slug)
        `)
        .eq('user_id', userId)

      if (error) throw error

      const list = (data || [])
        .map((row) => row.businesses)
        .filter(Boolean)

      if (list.length === 0) {
        set({
          currentTenantId: null,
          currentTenant: null,
          tenants: [],
          featureFlags: { subscriptions: true },
          featureFlagsLoading: false,
          loading: false,
          error: 'No tenant assigned. Please contact support or sign up again.'
        })
        return
      }

      const first = list[0]
      await get().loadFeatureFlags(first.id)
      set({
        currentTenantId: first.id,
        currentTenant: { id: first.id, name: first.name, slug: first.slug },
        tenants: list.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
        loading: false,
        error: null
      })
    } catch (err) {
      console.error('Error loading tenants:', err)
      set({
        currentTenantId: null,
        currentTenant: null,
        tenants: [],
        featureFlags: { subscriptions: true },
        featureFlagsLoading: false,
        loading: false,
        error: err.message || 'Failed to load tenant'
      })
    }
  },

  setCurrentTenant: (tenantId) => {
    const { tenants } = get()
    const tenant = tenants.find((t) => t.id === tenantId)
    if (tenant) {
      set({
        currentTenantId: tenantId,
        currentTenant: { id: tenant.id, name: tenant.name, slug: tenant.slug }
      })
      get().loadFeatureFlags(tenantId)
    }
  },

  clearTenants: () => {
    set({
      currentTenantId: null,
      currentTenant: null,
      tenants: [],
      featureFlags: { subscriptions: true },
      featureFlagsLoading: false,
      error: null
    })
  }
}))
