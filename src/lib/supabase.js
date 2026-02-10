import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Security check: Detect if service_role key is being used (common mistake)
if (supabaseAnonKey && supabaseAnonKey.includes('service_role')) {
  console.error(
    '❌ ERROR: You are using the service_role key in the browser!\n' +
    'This is a security risk. Use the ANON key instead.\n' +
    'Get it from: Supabase Dashboard > Settings > API > "anon public" key'
  )
  throw new Error('Forbidden use of secret API key in browser')
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Using mock mode.')
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabase !== null
}