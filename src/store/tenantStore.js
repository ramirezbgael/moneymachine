import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/** RPC SECURITY DEFINER: lista business_id según auth.uid(); no depende del SELECT público a memberships. */
async function fetchBusinessIdsForUser(supabaseClient) {
  const rpcNames = ['user_business_ids', 'user_tenant_ids']
  let lastError = null
  for (const name of rpcNames) {
    const { data, error } = await supabaseClient.rpc(name, {})
    if (!error) {
      if (data == null) return { error: null, businessIds: [] }
      const arr = Array.isArray(data) ? data : [data]
      const businessIds = [...new Set(arr.map((id) => String(id)).filter(Boolean))]
      return { error: null, businessIds }
    }
    lastError = error
  }
  return { error: lastError, businessIds: null }
}

/** Fallback: SELECT directo (depende de RLS en memberships). */
async function fetchBusinessIdsFromMembershipsTable(supabaseClient, userId) {
  const { data, error } = await supabaseClient
    .from('memberships')
    .select('business_id')
    .eq('user_id', userId)
  if (error) return { error, businessIds: null }
  const businessIds = [
    ...new Set((data || []).map((r) => r.business_id).filter(Boolean).map((id) => String(id)))
  ]
  return { error: null, businessIds }
}

/** Compat legacy: tenant_members con columnas business_id o tenant_id. */
async function fetchBusinessIdsFromTenantMembersLegacy(supabaseClient, userId) {
  const candidates = ['business_id', 'tenant_id']
  let lastError = null
  for (const col of candidates) {
    const { data, error } = await supabaseClient
      .from('tenant_members')
      .select(col)
      .eq('user_id', userId)
    if (!error) {
      const businessIds = [
        ...new Set((data || []).map((r) => r[col]).filter(Boolean).map((id) => String(id)))
      ]
      return { error: null, businessIds, source: `tenant_members.${col}` }
    }
    lastError = error
  }
  return { error: lastError, businessIds: null, source: 'tenant_members' }
}

/** Rescate: usa profiles.default_business_id cuando memberships está vacío/inconsistente. */
async function fetchBusinessIdFromProfile(supabaseClient, userId) {
  const fields = ['default_business_id', 'default_tenant_id']
  let lastError = null
  for (const field of fields) {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select(field)
      .eq('id', userId)
      .maybeSingle()
    if (!error) {
      return { error: null, businessId: data?.[field] || null, source: `profiles.${field}` }
    }
    lastError = error
  }
  return { error: lastError, businessId: null, source: 'profiles' }
}

/** Normaliza fila businesses → objeto tenant en cliente (incl. trial / facturación) */
function mapBusinessRow(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? null,
    trial_ends_at: row.trial_ends_at ?? null,
    billing_status: row.billing_status ?? null,
    plan: row.plan ?? null
  }
}

/**
 * Tenant store for multi-tenant SaaS
 * Holds current tenant and list of tenants the user belongs to.
 */
export const useTenantStore = create((set, get) => ({
  currentTenantId: null,
  currentTenant: null, // { id, name, slug }
  tenants: [],
  debug: null, // solo para diagnóstico en UI cuando no hay tenant
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
        debug: null,
        featureFlags: { subscriptions: true },
        featureFlagsLoading: false
      })
      return
    }

    set({
      loading: true,
      error: null,
      featureFlagsLoading: true,
      debug: { at: new Date().toISOString(), userId, step: 'start' }
    })

    if (!isSupabaseConfigured() || !supabase) {
      // Mock: un negocio local (sin trial banner molesto: active)
      const defaultTenant = {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Mi Negocio',
        slug: 'default',
        trial_ends_at: null,
        billing_status: 'active',
        plan: 'starter'
      }
      set({
        currentTenantId: defaultTenant.id,
        currentTenant: defaultTenant,
        tenants: [defaultTenant],
        debug: { at: new Date().toISOString(), userId, step: 'mock' },
        featureFlags: { subscriptions: true },
        featureFlagsLoading: false,
        loading: false
      })
      return
    }

    try {
      // 1) IDs de negocio: primero RPC user_business_ids() (SECURITY DEFINER, ignora RLS roto en memberships).
      const maxAttempts = 4
      const retryMs = 550
      let businessIds = []
      let lastErr = null

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        set({
          debug: {
            at: new Date().toISOString(),
            userId,
            step: 'fetch_business_ids',
            attempt: attempt + 1,
            maxAttempts
          }
        })
        let res = await fetchBusinessIdsForUser(supabase)
        if (res.error) {
          lastErr = res.error
          const fb = await fetchBusinessIdsFromMembershipsTable(supabase, userId)
          if (fb.error) throw fb.error
          res = fb
        }
        businessIds = res.businessIds || []
        set({
          debug: {
            at: new Date().toISOString(),
            userId,
            step: 'business_ids',
            attempt: attempt + 1,
            businessIdsCount: businessIds.length
          }
        })
        if (businessIds.length > 0) break
        if (get().currentTenantId) {
          set({
            loading: false,
            error: null,
            featureFlagsLoading: false
          })
          return
        }
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, retryMs))
        }
      }

      if (businessIds.length === 0 && lastErr) {
        console.warn('[tenantStore] user_business_ids RPC falló; memberships también vacío:', lastErr)
      }

      // 1b) Fallback robusto: perfil del usuario (muchas cuentas sí tienen default_business_id aunque memberships falte)
      if (businessIds.length === 0) {
        set({
          debug: {
            at: new Date().toISOString(),
            userId,
            step: 'fallback_profile_start'
          }
        })
        const fromProfile = await fetchBusinessIdFromProfile(supabase, userId)
        if (!fromProfile.error && fromProfile.businessId) {
          businessIds = [String(fromProfile.businessId)]
          set({
            debug: {
              at: new Date().toISOString(),
              userId,
              step: 'fallback_profile_default_business_id',
              source: fromProfile.source,
              businessIdsCount: businessIds.length
            }
          })
        } else if (fromProfile.error) {
          set({
            debug: {
              at: new Date().toISOString(),
              userId,
              step: 'fallback_profile_error',
              source: fromProfile.source,
              message: String(fromProfile.error?.message || fromProfile.error)
            }
          })
        }
      }

      // 1c) Compat legacy: tenant_members en proyectos no migrados.
      if (businessIds.length === 0) {
        const legacy = await fetchBusinessIdsFromTenantMembersLegacy(supabase, userId)
        if (!legacy.error && (legacy.businessIds || []).length > 0) {
          businessIds = legacy.businessIds
          set({
            debug: {
              at: new Date().toISOString(),
              userId,
              step: 'fallback_tenant_members_legacy',
              source: legacy.source,
              businessIdsCount: businessIds.length
            }
          })
        } else if (legacy.error) {
          set({
            debug: {
              at: new Date().toISOString(),
              userId,
              step: 'fallback_tenant_members_error',
              source: legacy.source,
              message: String(legacy.error?.message || legacy.error)
            }
          })
        }
      }

      if (businessIds.length === 0) {
        // Tras create_tenant_and_join el membership puede no verse aún (latencia/RLS); no borrar bootstrap.
        if (get().currentTenantId) {
          set({
            loading: false,
            error: null,
            featureFlagsLoading: false
          })
          return
        }
        set({
          currentTenantId: null,
          currentTenant: null,
          tenants: [],
          featureFlags: { subscriptions: true },
          featureFlagsLoading: false,
          loading: false,
          error: `No tenant assigned for user ${userId}. (businessIds=0)`
        })
        return
      }

      // 2) Negocios en consulta aparte (misma política RLS, join más fiable)
      const { data: businessRows, error: bizError } = await supabase
        .from('businesses')
        .select('id, name, slug, trial_ends_at, billing_status, plan')
        .in('id', businessIds)

      if (bizError) throw bizError

      const list = businessRows || []

      if (list.length === 0) {
        if (get().currentTenantId) {
          set({
            loading: false,
            error: null,
            featureFlagsLoading: false
          })
          return
        }
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
      const mapped = list.map(mapBusinessRow).filter(Boolean)
      await get().loadFeatureFlags(first.id)
      set({
        currentTenantId: first.id,
        currentTenant: mapBusinessRow(first),
        tenants: mapped,
        debug: { at: new Date().toISOString(), userId, step: 'done', tenantId: first.id },
        loading: false,
        error: null
      })
    } catch (err) {
      console.error('Error loading tenants:', err)
      const hadTenant = get().currentTenantId
      if (hadTenant) {
        set({
          loading: false,
          featureFlagsLoading: false,
          error: err.message || 'Failed to load tenant'
        })
      } else {
        set({
          currentTenantId: null,
          currentTenant: null,
          tenants: [],
          featureFlags: { subscriptions: true },
          featureFlagsLoading: false,
          loading: false,
          error: err?.message ? String(err.message) : 'Failed to load tenant',
          debug: {
            at: new Date().toISOString(),
            userId,
            step: 'error',
            message: err?.message ? String(err.message) : null,
            code: err?.code ?? null
          }
        })
      }
    }
  },

  /**
   * Tras create_tenant_and_join: entra al POS de inmediato con el UUID devuelto por la RPC
   * mientras loadTenants sincroniza desde la base.
   */
  bootstrapTenantFromRpc: async ({ id, name, slug }) => {
    if (!id) return
    await get().loadFeatureFlags(id)
    const trialEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const row = {
      id,
      name: name || 'Mi negocio',
      slug: slug ?? null,
      trial_ends_at: trialEnds,
      billing_status: 'trialing',
      plan: 'trial'
    }
    set({
      currentTenantId: id,
      currentTenant: mapBusinessRow(row),
      tenants: [mapBusinessRow(row)],
      loading: false,
      error: null,
      featureFlagsLoading: false
    })
  },

  setCurrentTenant: (tenantId) => {
    const { tenants } = get()
    const tenant = tenants.find((t) => t.id === tenantId)
    if (tenant) {
      set({
        currentTenantId: tenantId,
        currentTenant: { ...tenant }
      })
      get().loadFeatureFlags(tenantId)
    }
  },

  clearTenants: () => {
    set({
      currentTenantId: null,
      currentTenant: null,
      tenants: [],
      debug: null,
      featureFlags: { subscriptions: true },
      featureFlagsLoading: false,
      error: null
    })
  }
}))
