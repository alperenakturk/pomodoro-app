import { createClient } from '@supabase/supabase-js'

// Accounts are optional per methodology.md — this client is only created
// when both env vars are present, so the app can still run fully offline/
// guest (localStorage-only, see storage.js) if Supabase isn't configured at
// all, rather than crashing at import time in that environment.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are not set — running in offline/guest mode only.'
  )
}

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null
