import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { useAuthStore } from './store/authStore'
import { useSettingsStore } from './store/settingsStore'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { useTenantStore } from './store/tenantStore'
import './index.css'
import './styles/mm-surface.css'

// Registrar antes que checkSession: INITIAL_SESSION / SIGNED_IN vuelven a cargar tenants
// si getSession() y el primer SELECT iban desincronizados al recargar la página.
if (isSupabaseConfigured() && supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      useTenantStore.getState().clearTenants()
      return
    }
    // INITIAL_SESSION: sesión restaurada al cargar; SIGNED_IN: login explícito
    if (
      session?.user?.id &&
      (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')
    ) {
      useTenantStore.getState().loadTenants(session.user.id)
    }
  })
}

// Check session on app load
useAuthStore.getState().checkSession()

// Initialize theme on app load
useSettingsStore.getState().initTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)