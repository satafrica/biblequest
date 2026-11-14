import type { Backend } from './types'

/**
 * Picks the backend at build time. With Supabase variables set, the app uses the secure
 * server backend and the local preview code (which bundles answers) is left out of the build.
 */
export async function createBackend(): Promise<Backend> {
  if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
    const { CloudBackend } = await import('./cloud')
    const b = new CloudBackend()
    await b.init()
    return b
  }
  const { LocalBackend } = await import('./local')
  const b = new LocalBackend()
  await b.init()
  return b
}
export * from './types'
