import { DIFFICULTY_LABELS, LEVEL_SIZE, type Catalog, type Difficulty, type LevelCounts, type Progress, type Testament } from './types'

export const LEVEL_MODES = ['picture', 'whoami', 'scripture', 'sequence'] as const
export type LevelMode = (typeof LEVEL_MODES)[number]

export const TESTAMENTS: { v: Testament; label: string; short: string }[] = [
  { v: 'all', label: 'Whole Bible', short: 'Whole Bible' },
  { v: 'ot', label: 'Old Testament', short: 'Old Testament' },
  { v: 'nt', label: 'New Testament', short: 'New Testament' },
]
export const testamentLabel = (t: Testament) => TESTAMENTS.find((x) => x.v === t)?.label ?? 'Whole Bible'
/** Books 1–39 are the Old Testament, 40–66 the New Testament. */
export const testamentOfBook = (bookId: number): 'ot' | 'nt' => (bookId <= 39 ? 'ot' : 'nt')
const isPart = (x: string | undefined): x is 'ot' | 'nt' => x === 'ot' || x === 'nt'

/** Level keys: `mode:difficulty:set` for the whole Bible, `mode:difficulty:set:ot|nt` for one testament. */
export const levelKey = (mode: string, diff: number, set: number, t: Testament = 'all') =>
  t === 'all' ? `${mode}:${diff}:${set}` : `${mode}:${diff}:${set}:${t}`

export const arenaKey = (diff: number, t: Testament = 'all') => (t === 'all' ? `arena:${diff}` : `arena:${diff}:${t}`)

export interface ParsedLevel { mode: string; diff: number; set: number; testament: Testament }
export function parseLevelKey(key: string): ParsedLevel | null {
  const p = key.split(':')
  if (!(LEVEL_MODES as readonly string[]).includes(p[0])) return null
  if (p.length === 3 || (p.length === 4 && isPart(p[3]))) return { mode: p[0], diff: Number(p[1]), set: Number(p[2]), testament: (p[3] as Testament) ?? 'all' }
  return null
}

/** Question counts for the chosen part of the Bible. */
export function countsFor(catalog: Pick<Catalog, 'levelCounts' | 'testamentCounts'>, t: Testament): LevelCounts {
  return t === 'all' ? catalog.levelCounts : catalog.testamentCounts?.[t] ?? {}
}

export function levelCount(counts: LevelCounts, mode: string, diff: number): number {
  return Math.ceil((counts[mode]?.[diff] ?? 0) / LEVEL_SIZE)
}

export function describeLevelKey(key: string, chapterTitle?: (id: string) => string | undefined): string {
  const p = key.split(':')
  const modeNames: Record<string, string> = { picture: 'Picture Bible Quiz', whoami: 'Who Am I?', scripture: 'Scripture Challenge', sequence: 'Story Sequencing' }
  const lv = parseLevelKey(key)
  if (lv) return `${modeNames[lv.mode]} · ${DIFFICULTY_LABELS[lv.diff as Difficulty]} ${lv.set}${lv.testament === 'all' ? '' : ` · ${testamentLabel(lv.testament)}`}`
  if (p[0] === 'adv') return `Adventure · ${chapterTitle?.(p[1]) ?? p[1]}`
  if (p[0] === 'daily') return `Daily Challenge · ${p[1]}`
  if (p[0] === 'review') return 'Review My Mistakes'
  if (p[0] === 'arena') return `Challenge Arena · ${DIFFICULTY_LABELS[Number(p[1]) as Difficulty]}${isPart(p[2]) ? ` · ${testamentLabel(p[2])}` : ''}`
  return key
}

/**
 * Adaptive difficulty: look at the player's recent results for a mode and suggest a level.
 * 85%+ accuracy on the current difficulty suggests moving up; under 50% suggests moving down.
 * The player always chooses; this is only a recommendation.
 */
export function recommendDifficulty(progress: Progress[], mode: string): Difficulty {
  const rows = progress.filter((p) => p.game_mode === mode && parseLevelKey(p.level_key))
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
export function nextLevel(progress: Progress[], counts: LevelCounts, mode: string, diff: number, t: Testament = 'all'): number {
  const n = levelCount(counts, mode, diff)
  for (let s = 1; s <= n; s++) {
    if (!progress.some((p) => p.level_key === levelKey(mode, diff, s, t) && p.times_completed > 0)) return s
  }
  return Math.max(1, n)
}
