import { readJSON, writeJSON } from '../lib/storage'

export interface Prefs {
  theme: 'system' | 'light' | 'dark'
  textSize: 'normal' | 'large' | 'xlarge'
  highContrast: boolean
  motion: 'system' | 'reduce' | 'full'
  timers: boolean
}
export const DEFAULT_PREFS: Prefs = { theme: 'system', textSize: 'normal', highContrast: false, motion: 'system', timers: true }
const KEY = 'bq.prefs.v1'

export const loadPrefs = (): Prefs => ({ ...DEFAULT_PREFS, ...readJSON<Partial<Prefs>>(KEY, {}) })
export const savePrefs = (p: Prefs) => writeJSON(KEY, p)

export function systemDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
}
export function systemReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}
export function motionReduced(p: Prefs): boolean {
  return p.motion === 'reduce' || (p.motion === 'system' && systemReducedMotion())
}

/** Applies preferences and the equipped cosmetic theme to <html>. */
export function applyPrefs(p: Prefs, palette: string | null) {
  const el = document.documentElement
  const dark = p.theme === 'dark' || (p.theme === 'system' && systemDark())
  el.classList.toggle('dark', dark)
  el.dataset.text = p.textSize
  el.dataset.contrast = p.highContrast ? 'high' : 'normal'
  el.dataset.motion = motionReduced(p) ? 'reduce' : 'full'
  if (palette) el.dataset.palette = palette
  else delete el.dataset.palette
}
