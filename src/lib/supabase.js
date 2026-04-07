import { createClient } from '@supabase/supabase-js'

const configuredSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const DEMO_MODE_KEY = 'mm_demo_mode'

// En DEV, usamos proxy same-origin (/supabase) para evitar bloqueos CORS del navegador.
// En PROD, usamos la URL real.
const supabaseUrl = configuredSupabaseUrl
  ? (import.meta.env.DEV ? `${window.location.origin}/supabase` : configuredSupabaseUrl)
  : configuredSupabaseUrl

// Security check: Detect if service_role key is being used (common mistake)
if (supabaseAnonKey && supabaseAnonKey.includes('service_role')) {
  console.error(
    '❌ ERROR: You are using the service_role key in the browser!\n' +
    'This is a security risk. Use the ANON key instead.\n' +
    'Get it from: Supabase Dashboard > Settings > API > "anon public" key'
  )
  throw new Error('Forbidden use of secret API key in browser')
}

if (!configuredSupabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not found (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Using mock mode. ' +
      'Si acabas de añadir .env, reinicia el servidor de desarrollo (npm run dev).'
  )
}

export const supabase = configuredSupabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const isDemoMode = () => {
  try {
    return localStorage.getItem(DEMO_MODE_KEY) === '1'
  } catch {
    return false
  }
}

export const setDemoMode = (enabled) => {
  try {
    if (enabled) localStorage.setItem(DEMO_MODE_KEY, '1')
    else localStorage.removeItem(DEMO_MODE_KEY)
  } catch {
    /* ignore */
  }
}

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabase !== null && !isDemoMode()
}