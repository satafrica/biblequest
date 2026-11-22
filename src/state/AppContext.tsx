import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createBackend, type AuthUser, type Backend, type Catalog, type EarnedAchievement, type InventoryItem, type Profile, type Progress, type Wallet } from '../engine'
import { applyPrefs, loadPrefs, savePrefs, type Prefs } from './prefs'
import { setPreferredVoice } from '../lib/speech'

export interface Toast { id: number; title: string; body?: string; tone?: 'gem' | 'info' | 'error' }

interface AppState {
  backend: Backend
  catalog: Catalog
  user: AuthUser | null
  profile: Profile | null
  wallet: Wallet
  inventory: InventoryItem[]
  progress: Progress[]
  achievements: EarnedAchievement[]
  prefs: Prefs
  online: boolean
  setPrefs: (p: Partial<Prefs>) => void
  refresh: () => Promise<void>
  setBalance: (n: number) => void
  toast: (t: Omit<Toast, 'id'>) => void
  toasts: Toast[]
  dismissToast: (id: number) => void
  owns: (itemId: string) => number
}

const Ctx = createContext<AppState | null>(null)

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside provider')
  return v
}

const PALETTES: Record<string, string> = { theme_galilee: 'galilee', theme_temple: 'temple', theme_amethyst: 'amethyst' }

export function AppProvider({ children, backendOverride }: { children: ReactNode; backendOverride?: Backend }) {
  const [backend, setBackend] = useState<Backend | null>(backendOverride ?? null)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [wallet, setWallet] = useState<Wallet>({ balance: 0, lifetime_earned: 0 })
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [progress, setProgress] = useState<Progress[]>([])
  const [achievements, setAchievements] = useState<EarnedAchievement[]>([])
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs)
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(1)

  useEffect(() => {
    if (backend) return
    createBackend().then(setBackend).catch((e) => setError(String(e?.message ?? e)))
  }, [backend])

  const refresh = useCallback(async () => {
    if (!backend) return
    setUser(backend.user())
    const [p, w, inv, prog, ach] = await Promise.all([
      backend.getProfile(), backend.getWallet(), backend.getInventory(), backend.getProgress(), backend.getAchievements(),
    ])
    setProfile(p); setWallet(w); setInventory(inv); setProgress(prog); setAchievements(ach)
  }, [backend])

  useEffect(() => {
    if (!backend) return
    let cancelled = false
    if (backendOverride) backend.init().catch(() => {})
    backend.getCatalog().then((c) => { if (!cancelled) setCatalog(c) }).catch((e) => setError(String(e?.message ?? e)))
    refresh().catch(() => {})
    const off = backend.onAuthChange(() => { refresh().catch(() => {}) })
    return () => { cancelled = true; off() }
  }, [backend, refresh, backendOverride])

  useEffect(() => {
    const on = () => setOnline(true), offl = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', offl)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', offl) }
  }, [])

  const equippedTheme = inventory.find((i) => i.equipped && PALETTES[i.item_id])?.item_id
  useEffect(() => { setPreferredVoice(prefs.narratorVoice ?? '') }, [prefs.narratorVoice])
  useEffect(() => {
    applyPrefs(prefs, equippedTheme ? PALETTES[equippedTheme] : null)
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    const h = () => applyPrefs(prefs, equippedTheme ? PALETTES[equippedTheme] : null)
    mq?.addEventListener?.('change', h)
    return () => mq?.removeEventListener?.('change', h)
  }, [prefs, equippedTheme])

  const setPrefs = useCallback((p: Partial<Prefs>) => {
    setPrefsState((old) => { const n = { ...old, ...p }; savePrefs(n); return n })
  }, [])

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = toastId.current++
    setToasts((ts) => [...ts.slice(-3), { ...t, id }])
    window.setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 4500)
  }, [])
  const dismissToast = useCallback((id: number) => setToasts((ts) => ts.filter((x) => x.id !== id)), [])
  const setBalance = useCallback((n: number) => setWallet((w) => ({ ...w, balance: n })), [])
  const owns = useCallback((itemId: string) => inventory.find((i) => i.item_id === itemId)?.quantity ?? 0, [inventory])

  const value = useMemo(() => backend && catalog ? ({
    backend, catalog, user, profile, wallet, inventory, progress, achievements, prefs, online,
    setPrefs, refresh, setBalance, toast, toasts, dismissToast, owns,
  }) : null, [backend, catalog, user, profile, wallet, inventory, progress, achievements, prefs, online, setPrefs, refresh, setBalance, toast, toasts, dismissToast, owns])

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div className="max-w-md">
          <h1 className="font-display text-2xl mb-2">MyBibleGem could not start</h1>
          <p className="text-muted mb-4">We could not reach the game server. Check your connection and try again.</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>Try again</button>
        </div>
      </div>
    )
  }
  if (!value) {
    return <div className="min-h-screen grid place-items-center" role="status" aria-live="polite"><span className="sr-only">Loading MyBibleGem</span><div className="loader" aria-hidden="true" /></div>
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
