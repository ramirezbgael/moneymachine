import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useTenantStore } from './tenantStore'

/**
 * Authentication store
 * Manages user authentication state
 */
export const useAuthStore = create((set, get) => {
  // Load from localStorage on init
  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem('auth-storage')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.state?.isAuthenticated && parsed.state?.user) {
          return parsed.state
        }
      }
    } catch (e) {
      console.error('Error loading auth from storage:', e)
    }
    return null
  }

  const initialState = loadFromStorage() || {
    user: null,
    session: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  }

  return {
    ...initialState,

    // Sign in
    signIn: async (email, password) => {
      set({ isLoading: true, error: null })

      if (!isSupabaseConfigured()) {
        const mockState = {
          user: { id: 'mock-user', email },
          session: { access_token: 'mock-token' },
          isAuthenticated: true,
          isLoading: false
        }
        set(mockState)
        useTenantStore.getState().loadTenants('mock-user')
        return { error: null }
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) throw error

        const newState = {
          user: data.user,
          session: data.session,
          isAuthenticated: true,
          isLoading: false,
          error: null
        }
        set(newState)
        useTenantStore.getState().loadTenants(data.user.id)
        return { error: null }
      } catch (error) {
        const errorState = {
          isLoading: false,
          error: error.message,
          isAuthenticated: false
        }
        set(errorState)
        return { error: error.message }
      }
    },

    // Sign up. If Supabase returns a session (e.g. email confirmation off), state is set and caller can then create tenant.
    signUp: async (email, password) => {
      set({ isLoading: true, error: null })
      if (!isSupabaseConfigured() || !supabase) {
        set({ isLoading: false, error: 'Sign up requires Supabase configuration' })
        return { error: 'Sign up requires Supabase configuration', user: null }
      }
      try {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.session) {
          set({
            user: data.user,
            session: data.session,
            isAuthenticated: true,
            isLoading: false,
            error: null
          })
          // Do NOT call loadTenants here on signup - Register will create tenant first, then loadTenants
        } else {
          set({ isLoading: false })
        }
        return { error: null, user: data.user, session: data.session }
      } catch (err) {
        set({ isLoading: false, error: err.message })
        return { error: err.message, user: null }
      }
    },

    // Sign out
    signOut: async () => {
      if (isSupabaseConfigured() && supabase) {
        await supabase.auth.signOut()
      }
      useTenantStore.getState().clearTenants()
      const clearedState = {
        user: null,
        session: null,
        isAuthenticated: false,
        error: null
      }
      set(clearedState)
      localStorage.removeItem('auth-storage')
    },

    // Check session
    checkSession: async () => {
      if (!isSupabaseConfigured()) {
        // Mock session check
        const { user, session } = get()
        if (user && session) {
          set({ isAuthenticated: true })
        }
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const sessionState = {
            session,
            user: session.user,
            isAuthenticated: true
          }
          set(sessionState)
          useTenantStore.getState().loadTenants(session.user.id)
        } else {
          const noSessionState = {
            session: null,
            user: null,
            isAuthenticated: false
          }
          set(noSessionState)
        }
      } catch (error) {
        console.error('Session check error:', error)
        const errorState = {
          session: null,
          user: null,
          isAuthenticated: false
        }
        set(errorState)
      }
    }
  }
})

// Persist to localStorage on changes
useAuthStore.subscribe((state) => {
  try {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated
      }
    }))
  } catch (e) {
    console.error('Error saving auth to storage:', e)
  }
})