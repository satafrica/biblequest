import { useApp } from './AppContext'
import type { Testament } from '../engine'

/** Lets the player choose Old Testament, New Testament or the whole Bible. Saved with display settings. */
export function useTestament(): [Testament, (t: Testament) => void] {
  const { prefs, setPrefs, backend, profile, user } = useApp()
  const choose = (t: Testament) => {
    setPrefs({ testament: t })
    if (backend.kind === 'cloud' && user && profile) backend.updateProfile({ preferences: { ...profile.preferences, display: { ...prefs, testament: t } } }).catch(() => {})
  }
  return [prefs.testament ?? 'all', choose]
}
