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
  loading: false,
  error: null,

  /**
   * Load tenants for the current user (call after login).
   * @param {string} userId - auth.users.id
   */
  loadTenants: async (userId) => {
    if (!userId) {
      set({ currentTenantId: null, currentTenant: null, tenants: [] })
      return
    }

    set({ loading: true, error: null })

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
        loading: false
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from('tenant_members')
        .select(`
          tenant_id,
          tenants (id, name, slug)
        `)
        .eq('user_id', userId)

      if (error) throw error

      const list = (data || [])
        .map((row) => row.tenants)
        .filter(Boolean)

      if (list.length === 0) {
        set({
          currentTenantId: null,
          currentTenant: null,
          tenants: [],
          loading: false,
          error: 'No tenant assigned. Please contact support or sign up again.'
        })
        return
      }

      const first = list[0]
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
    }
  },

  clearTenants: () => {
    set({
      currentTenantId: null,
      currentTenant: null,
      tenants: [],
      error: null
    })
  }
}))
