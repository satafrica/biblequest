import { useEffect, useState } from 'react'
import { useApp } from './AppContext'
import type { PlayerStats } from '../engine'

/** Streak and review numbers. Re-fetched whenever progress changes (after each round). */
export function usePlayerStats(): PlayerStats | null {
  const { backend, progress, user } = useApp()
  const [stats, setStats] = useState<PlayerStats | null>(null)
  useEffect(() => {
    let live = true
    backend.getPlayerStats().then((s) => { if (live) setStats(s) }).catch(() => { if (live) setStats(null) })
    return () => { live = false }
  }, [backend, progress, user?.id])
  return stats
}
