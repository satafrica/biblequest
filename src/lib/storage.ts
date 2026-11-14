// Safe wrapper around localStorage. Some embedded previews and private modes block
// storage; in that case we fall back to memory and report it so the UI can be honest.
const memory = new Map<string, string>()
let available: boolean | null = null

export function storageAvailable(): boolean {
  if (available !== null) return available
  try {
    const k = '__bq_probe__'
    window.localStorage.setItem(k, '1')
    window.localStorage.removeItem(k)
    available = true
  } catch {
    available = false
  }
  return available
}

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = storageAvailable() ? window.localStorage.getItem(key) : memory.get(key) ?? null
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): void {
  const raw = JSON.stringify(value)
  try {
    if (storageAvailable()) window.localStorage.setItem(key, raw)
    else memory.set(key, raw)
  } catch {
    memory.set(key, raw)
  }
}

export function removeKey(key: string): void {
  try {
    if (storageAvailable()) window.localStorage.removeItem(key)
  } catch { /* ignore */ }
  memory.delete(key)
}

/** Storage adapter for supabase-js auth that tolerates blocked storage. */
export const authStorage = {
  getItem: (k: string) => { try { return storageAvailable() ? window.localStorage.getItem(k) : memory.get(k) ?? null } catch { return memory.get(k) ?? null } },
  setItem: (k: string, v: string) => { try { if (storageAvailable()) window.localStorage.setItem(k, v); else memory.set(k, v) } catch { memory.set(k, v) } },
  removeItem: (k: string) => { removeKey(k) },
}
