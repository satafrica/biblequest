import { DIFFICULTY_LABELS, LEVEL_SIZE, type Difficulty, type LevelCounts, type Progress } from './types'

export const LEVEL_MODES = ['picture', 'whoami', 'scripture', 'sequence'] as const
export type LevelMode = (typeof LEVEL_MODES)[number]

export const levelKey = (mode: string, diff: number, set: number) => `${mode}:${diff}:${set}`

export function levelCount(counts: LevelCounts, mode: string, diff: number): number {
  return Math.ceil((counts[mode]?.[diff] ?? 0) / LEVEL_SIZE)
}

export function describeLevelKey(key: string, chapterTitle?: (id: string) => string | undefined): string {
  const p = key.split(':')
  const modeNames: Record<string, string> = { picture: 'Picture Bible Quiz', whoami: 'Who Am I?', scripture: 'Scripture Challenge', sequence: 'Story Sequencing' }
  if (p[0] in modeNames && p.length === 3) return `${modeNames[p[0]]} · ${DIFFICULTY_LABELS[Number(p[1]) as Difficulty]} ${p[2]}`
  if (p[0] === 'adv') return `Adventure · ${chapterTitle?.(p[1]) ?? p[1]}`
  if (p[0] === 'daily') return `Daily Challenge · ${p[1]}`
  if (p[0] === 'arena') return `Challenge Arena · ${DIFFICULTY_LABELS[Number(p[1]) as Difficulty]}`
  return key
}

/**
 * Adaptive difficulty: look at the player's recent results for a mode and suggest a level.
 * 85%+ accuracy on the current difficulty suggests moving up; under 50% suggests moving down.
 * The player always chooses; this is only a recommendation.
 */
export function recommendDifficulty(progress: Progress[], mode: string): Difficulty {
  const rows = progress.filter((p) => p.game_mode === mode && p.level_key.split(':').length === 3)
    .sort((a, b) => b.last_played_at.localeCompare(a.last_played_at)).slice(0, 4)
  if (!rows.length) return 1
  const diff = Number(rows[0].level_key.split(':')[1]) as Difficulty
  const same = rows.filter((r) => r.level_key.split(':')[1] === String(diff))
  const acc = same.reduce((s, r) => s + r.best_correct, 0) / Math.max(1, same.reduce((s, r) => s + r.total_questions, 0))
  if (acc >= 0.85 && diff < 4) return (diff + 1) as Difficulty
  if (acc < 0.5 && diff > 1) return (diff - 1) as Difficulty
  return diff
}

/** The next level to play in a mode at a difficulty: first one not yet completed. */
export function nextLevel(progress: Progress[], counts: LevelCounts, mode: string, diff: number): number {
  const n = levelCount(counts, mode, diff)
  for (let s = 1; s <= n; s++) {
    if (!progress.some((p) => p.level_key === levelKey(mode, diff, s) && p.times_completed > 0)) return s
  }
  return Math.max(1, n)
}
