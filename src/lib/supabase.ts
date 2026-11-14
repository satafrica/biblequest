import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { authStorage } from './storage'

// Only the public anon key belongs in the browser. The service-role key must never
// be placed in any VITE_* variable (Vite exposes those to the client bundle).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const cloudConfigured = Boolean(url && anonKey)

let client: SupabaseClient | null = null
export function supabase(): SupabaseClient {
  if (!cloudConfigured) throw new Error('Supabase is not configured')
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: authStorage },
    })
  }
  return client
}
