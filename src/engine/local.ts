// Local preview backend. Runs entirely in the browser with the bundled editorial content.
// It mirrors the server rules (first-correct awards, one-time level bonuses, idempotent
// purchases, no negative balances) so the experience matches, but gems earned here are
// practice gems on this device only and are never sent to the server.
import { ACHIEVEMENTS, ADVENTURES, ASSETS, QUESTIONS, REWARDS, STORE, type FullQuestion } from './content'
import { readJSON, storageAvailable, writeJSON } from '../lib/storage'
import { hash, todayUTC, uuid } from '../lib/ids'
import { parseLevelKey, testamentOfBook } from './levels'
import {
  ARENA_SIZE, DAILY_SIZE, GameError, LEVEL_SIZE,
  type AnswerResult, type Backend, type Catalog, type CompleteResult, type EarnedAchievement, type InventoryItem,
  type LeaderRow, type PlayerStats, type PowerUpResult, type Profile, type Progress, type PublicQuestion, type PurchaseResult,
  type SessionStart, type Transaction, type Wallet,
} from './types'

const KEY = 'bq.local.v1'

interface LocalSession {
  id: string; level_key: string; game_mode: string; question_ids: string[]
  answers: Record<string, { correct: boolean }>; uses: string[]; status: 'active' | 'completed'; started_at: string
}
interface LocalState {
  profile: Profile
  wallet: Wallet
  txs: Transaction[]
  keys: string[] // idempotency keys already applied
  inventory: InventoryItem[]
  progress: Progress[]
  awards: string[] // question ids that already earned the first-correct reward
  achievements: EarnedAchievement[]
  sessions: Record<string, LocalSession>
  nextTx: number
  /** Missed questions not yet answered correctly since, most recent last. */
  wrong: string[]
  /** Local dates (yyyy-mm-dd) on which a round was completed. */
  activeDays: string[]
}

/** yyyy-mm-dd in the device's own time zone. */
export function localDay(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const dayNum = (s: string) => Math.round(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000)

/** Streaks from a list of active days, matching the server's get_player_stats. */
export function computeStats(days: string[], today: string, reviewCount: number): PlayerStats {
  const sorted = [...new Set(days)].sort()
  let run = 0; let best = 0; let prev: number | null = null
  for (const d of sorted) { const n = dayNum(d); run = prev !== null && n === prev + 1 ? run + 1 : 1; best = Math.max(best, run); prev = n }
  const t = dayNum(today)
  return {
    today, best_streak: best, review_count: reviewCount,
    current_streak: prev !== null && prev >= t - 1 ? run : 0,
    played_today: prev === t,
    active_days: sorted.filter((d) => dayNum(d) > t - 84),
  }
}

function fresh(): LocalState {
  return {
    profile: { id: 'local-guest', display_name: 'Guest pilgrim', avatar_id: 'scroll', role: 'player', leaderboard_opt_in: false, preferences: {} },
    wallet: { balance: 0, lifetime_earned: 0 }, txs: [], keys: [], inventory: [], progress: [], awards: [], achievements: [], sessions: {}, nextTx: 1, wrong: [], activeDays: [],
  }
}

const byId = new Map(QUESTIONS.map((q) => [q.id, q]))

function toPublic(q: FullQuestion): PublicQuestion {
  const a = q.image_id ? ASSETS[q.image_id] : undefined
  const options = q.game_mode === 'sequence' ? [...q.options].sort((x, y) => hash(q.id + x) - hash(q.id + y)) : q.options
  return {
    id: q.id, game_mode: q.game_mode, book_id: q.book_id, chapter: q.chapter, verse_start: q.verse_start, verse_end: q.verse_end,
    reference_label: q.reference_label, difficulty: q.difficulty, prompt: q.prompt, clues: q.clues, options,
    has_hint: Boolean(q.hint), image_id: q.image_id, image_alt: a?.alt ?? null, image_path: a?.path ?? null,
    translation_id: q.translation_id, tags: q.tags,
  }
}

export class LocalBackend implements Backend {
  readonly kind = 'local' as const
  readonly persistent = storageAvailable()
  private s: LocalState = fresh()
  private listeners = new Set<() => void>()

  async init() { this.s = { ...fresh(), ...readJSON<Partial<LocalState>>(KEY, {}) } as LocalState }
  private save() { writeJSON(KEY, this.s) }
  user() { return { id: 'local-guest', email: null, isAnonymous: true } }
  onAuthChange(cb: () => void) { this.listeners.add(cb); return () => { this.listeners.delete(cb) } }
  async ensurePlayer() { /* always a local guest */ }
  async signUp(): Promise<{ needsConfirmation: boolean }> { throw new GameError('accounts_unavailable', 'Accounts need the online backend.') }
  async signIn() { throw new GameError('accounts_unavailable', 'Accounts need the online backend.') }
  async signOut() { /* nothing */ }
  async requestPasswordReset() { throw new GameError('accounts_unavailable') }
  async updatePassword() { throw new GameError('accounts_unavailable') }

  /** Reset all practice data on this device. */
  reset() { this.s = fresh(); this.save() }
  async deleteAccount() { this.reset() }

  async getCatalog(): Promise<Catalog> {
    const levelCounts: Catalog['levelCounts'] = {}
    const testamentCounts: Catalog['testamentCounts'] = { ot: {}, nt: {} }
    for (const q of QUESTIONS) {
      for (const c of [levelCounts, testamentCounts[testamentOfBook(q.book_id)]]) {
        c[q.game_mode] ??= {}
        c[q.game_mode][q.difficulty] = (c[q.game_mode][q.difficulty] ?? 0) + 1
      }
    }
    return { levelCounts, testamentCounts, adventures: ADVENTURES, store: STORE, achievements: ACHIEVEMENTS, assets: ASSETS, rewards: REWARDS, totalQuestions: QUESTIONS.length }
  }
  async getProfile() { return this.s.profile }
  async updateProfile(patch: Partial<Profile>) {
    if (patch.display_name !== undefined) {
      const n = patch.display_name.trim()
      if (n.length < 1 || n.length > 40) throw new GameError('invalid_name', 'Names must be 1–40 characters.')
      patch.display_name = n
    }
    this.s.profile = { ...this.s.profile, ...patch }; this.save()
  }
  async getWallet() { return { ...this.s.wallet } }
  async getTransactions(limit = 50) { return [...this.s.txs].reverse().slice(0, limit) }
  async getInventory() { return this.s.inventory.map((i) => ({ ...i })) }
  async getProgress() { return this.s.progress.map((p) => ({ ...p })) }
  async getAchievements() { return [...this.s.achievements] }

  /** Same contract as the SQL _apply_gems: idempotent, never negative. */
  private applyGems(amount: number, reason: string, refId: string | null, key: string): number {
    if (this.s.keys.includes(key)) return 0
    if (this.s.wallet.balance + amount < 0) throw new GameError('insufficient_gems')
    this.s.wallet.balance += amount
    if (amount > 0) this.s.wallet.lifetime_earned += amount
    this.s.keys.push(key)
    this.s.txs.push({ id: this.s.nextTx++, amount, kind: amount > 0 ? 'earn' : 'spend', reason, ref_id: refId, balance_after: this.s.wallet.balance, created_at: new Date().toISOString() })
    return amount
  }

  private selectIds(levelKey: string): { mode: string; ids: string[] } {
    const p = levelKey.split(':')
    const pub = QUESTIONS // local preview uses all reviewed-and-verified bundled content
    const inPart = (q: { book_id: number }, t: string | undefined) => !t || testamentOfBook(q.book_id) === t
    const lv = parseLevelKey(levelKey)
    if (lv) {
      const { diff, set } = lv; const t = lv.testament === 'all' ? undefined : lv.testament
      if (!(diff >= 1 && diff <= 4) || !(set >= 1)) throw new GameError('invalid_level')
      const ids = pub.filter((q) => q.game_mode === lv.mode && q.difficulty === diff && inPart(q, t)).map((q) => q.id).sort()
      return { mode: lv.mode, ids: ids.slice((set - 1) * LEVEL_SIZE, set * LEVEL_SIZE) }
    }
    if (p[0] === 'adv' && p.length === 2) {
      const adv = ADVENTURES.find((a) => a.chapters.some((c) => c.id === p[1]))
      const ch = adv?.chapters.find((c) => c.id === p[1])
      if (!adv || !ch) throw new GameError('invalid_level')
      const prev = adv.chapters.find((c) => c.position === ch.position - 1)
      if (prev && !this.s.progress.some((x) => x.level_key === `adv:${prev.id}` && x.times_completed > 0)) throw new GameError('chapter_locked')
      return { mode: 'adventure', ids: ch.question_ids.filter((id) => byId.has(id)) }
    }
    if (p[0] === 'daily' && p.length === 2) {
      if (p[1] !== todayUTC()) throw new GameError('daily_expired')
      const ids = pub.filter((q) => q.game_mode !== 'sequence').map((q) => q.id)
        .sort((a, b) => hash(a + p[1]) - hash(b + p[1])).slice(0, DAILY_SIZE)
      return { mode: 'daily', ids }
    }
    if (p[0] === 'arena' && (p.length === 2 || (p.length === 3 && (p[2] === 'ot' || p[2] === 'nt')))) {
      const diff = Number(p[1])
      if (!(diff >= 1 && diff <= 4)) throw new GameError('invalid_level')
      if (diff === 4 && !this.s.inventory.some((i) => i.item_id === 'bonus_expert')) throw new GameError('bonus_required')
      const pool = pub.filter((q) => q.game_mode !== 'sequence' && q.difficulty <= diff && inPart(q, p[2])).map((q) => q.id)
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]] }
      return { mode: 'arena', ids: pool.slice(0, ARENA_SIZE) }
    }
    if (p[0] === 'review' && p.length === 1) {
      const ids = this.reviewIds().slice(0, LEVEL_SIZE)
      if (!ids.length) throw new GameError('nothing_to_review')
      return { mode: 'review', ids }
    }
    throw new GameError('invalid_level')
  }

  private reviewIds(): string[] {
    return [...(this.s.wrong ?? [])].reverse().filter((id) => byId.get(id) && byId.get(id)!.game_mode !== 'sequence')
  }

  async startSession(levelKey: string): Promise<SessionStart> {
    const { mode, ids } = this.selectIds(levelKey)
    if (!ids.length) throw new GameError('no_published_content')
    const id = uuid()
    this.s.sessions[id] = { id, level_key: levelKey, game_mode: mode, question_ids: ids, answers: {}, uses: [], status: 'active', started_at: new Date().toISOString() }
    // keep storage small: drop old completed sessions
    const all = Object.values(this.s.sessions).sort((a, b) => b.started_at.localeCompare(a.started_at))
    for (const old of all.slice(20)) delete this.s.sessions[old.id]
    this.save()
    return { session_id: id, questions: ids.map((q) => toPublic(byId.get(q)!)) }
  }

  private record(sessionId: string, questionId: string, correct: boolean, points: number): Omit<AnswerResult, 'explanation' | 'reference'> {
    const ses = this.s.sessions[sessionId]
    if (!ses) throw new GameError('session_not_found')
    if (ses.status !== 'active') throw new GameError('session_closed')
    if (!ses.question_ids.includes(questionId)) throw new GameError('question_not_in_session')
    if (ses.answers[questionId]) throw new GameError('already_answered')
    ses.answers[questionId] = { correct }
    this.s.wrong = (this.s.wrong ?? []).filter((id) => id !== questionId)
    if (!correct) this.s.wrong.push(questionId)
    if (this.s.wrong.length > 200) this.s.wrong = this.s.wrong.slice(-200)
    let award = 0
    if (correct && !this.s.awards.includes(questionId)) {
      this.s.awards.push(questionId)
      award = this.applyGems(REWARDS.correct_answer, 'Correct answer', questionId, `q:${questionId}`)
    }
    this.save()
    return { correct, points: correct ? points : 0, gems_awarded: award, first_time_award: award > 0, balance: this.s.wallet.balance }
  }

  async submitAnswer(sessionId: string, questionId: string, choice: number, cluesUsed: number): Promise<AnswerResult> {
    const q = byId.get(questionId)
    if (!q) throw new GameError('question_not_found')
    if (q.game_mode === 'sequence') throw new GameError('use_submit_sequence')
    const correct = choice === q.correct_index
    const points = q.game_mode === 'whoami' ? Math.max(20, 100 - 20 * (Math.max(1, Math.min(cluesUsed || 1, 5)) - 1)) : 100
    const r = this.record(sessionId, questionId, correct, points)
    return { ...r, correct_index: q.correct_index, explanation: q.explanation, reference: q.reference_label, verse_text: q.verse_text ?? null, clue_refs: q.clue_refs ?? null, translation: q.translation_id }
  }

  async submitSequence(sessionId: string, questionId: string, order: string[]): Promise<AnswerResult> {
    const q = byId.get(questionId)
    if (!q || q.game_mode !== 'sequence') throw new GameError('question_not_found')
    const correct = order.length === q.options.length && order.every((o, i) => o === q.options[i])
    const r = this.record(sessionId, questionId, correct, 100)
    return { ...r, correct_order: q.options, explanation: q.explanation, reference: q.reference_label, verse_text: q.verse_text ?? null, clue_refs: q.clue_refs ?? null }
  }

  async completeSession(sessionId: string): Promise<CompleteResult> {
    const ses = this.s.sessions[sessionId]
    if (!ses) throw new GameError('session_not_found')
    if (ses.status === 'completed') throw new GameError('session_closed')
    const total = ses.question_ids.length
    if (Object.keys(ses.answers).length < total) throw new GameError('session_incomplete')
    const correct = Object.values(ses.answers).filter((a) => a.correct).length
    ses.status = 'completed'
    const day = localDay()
    this.s.activeDays = [...new Set([...(this.s.activeDays ?? []), day])].sort().slice(-400)
    const now = new Date().toISOString()
    const prev = this.s.progress.find((p) => p.level_key === ses.level_key)
    if (prev) Object.assign(prev, { best_correct: Math.max(prev.best_correct, correct), total_questions: total, times_completed: prev.times_completed + 1, last_played_at: now })
    else this.s.progress.push({ level_key: ses.level_key, game_mode: ses.game_mode, best_correct: correct, total_questions: total, times_completed: 1, last_played_at: now })

    const bonuses: CompleteResult['bonuses'] = []
    const add = (gems: number, reason: string, ref: string, key: string) => { const g = this.applyGems(gems, reason, ref, key); if (g > 0) bonuses.push({ reason, gems: g }) }
    if (['picture', 'whoami', 'scripture', 'sequence', 'adventure'].includes(ses.game_mode)) {
      add(REWARDS.level_complete, 'Level completed', ses.level_key, `level:${ses.level_key}`)
      if (correct === total) add(REWARDS.perfect_round, 'Perfect round', ses.level_key, `perfect:${ses.level_key}`)
    }
    const parts = ses.level_key.split(':')
    if (ses.game_mode === 'daily' && parts[1] === ses.started_at.slice(0, 10)) add(REWARDS.daily_challenge, 'Daily challenge', parts[1], `daily:${parts[1]}`)
    if (ses.game_mode === 'adventure') {
      const adv = ADVENTURES.find((a) => a.chapters.some((c) => c.id === parts[1]))
      if (adv && adv.chapters.every((c) => this.s.progress.some((p) => p.level_key === `adv:${c.id}` && p.times_completed > 0)))
        add(REWARDS.adventure_complete, 'Adventure completed', adv.id, `adventure:${adv.id}`)
    }
    const fresh = this.checkAchievements()
    this.save()
    return { correct, total, bonuses, balance: this.s.wallet.balance, new_achievements: fresh }
  }

  private checkAchievements(): string[] {
    const out: string[] = []
    const count = (prefix: string) => this.s.keys.filter((k) => k.startsWith(prefix)).length
    for (const a of ACHIEVEMENTS) {
      if (this.s.achievements.some((e) => e.achievement_id === a.id)) continue
      const r = a.rule
      const v = r.type === 'correct_total' ? this.s.awards.length
        : r.type === 'levels_completed' ? this.s.progress.filter((p) => p.times_completed > 0).length
        : r.type === 'perfect_levels' ? count('perfect:')
        : r.type === 'daily_total' ? count('daily:')
        : r.type === 'adventures_completed' ? count('adventure:')
        : r.type === 'mode_levels' ? this.s.progress.filter((p) => p.game_mode === r.mode && p.times_completed > 0).length : 0
      if (v >= r.gte) { this.s.achievements.push({ achievement_id: a.id, earned_at: new Date().toISOString() }); out.push(a.id) }
    }
    return out
  }

  async usePowerUp(sessionId: string, questionId: string, item: string): Promise<PowerUpResult> {
    if (!['hint', 'eliminate_two', 'extra_time'].includes(item)) throw new GameError('not_a_power_up')
    const ses = this.s.sessions[sessionId]
    if (!ses || ses.status !== 'active') throw new GameError('session_not_found')
    if (!ses.question_ids.includes(questionId)) throw new GameError('question_not_in_session')
    if (ses.answers[questionId]) throw new GameError('already_answered')
    const q = byId.get(questionId)!
    const useKey = `${questionId}|${item}`
    if (!ses.uses.includes(useKey)) {
      const inv = this.s.inventory.find((i) => i.item_id === item)
      if (!inv || inv.quantity < 1) throw new GameError('none_owned')
      inv.quantity -= 1
      ses.uses.push(useKey)
      this.save()
    }
    if (item === 'hint') return { item, hint: q.hint ?? `Look closely at ${q.reference_label}.` }
    if (item === 'eliminate_two') {
      const wrong = q.options.map((_, i) => i).filter((i) => i !== q.correct_index).sort((a, b) => hash(q.id + a) - hash(q.id + b))
      return { item, eliminated: wrong.slice(0, 2) }
    }
    return { item, extra_seconds: 15 }
  }

  async purchase(itemId: string, key: string): Promise<PurchaseResult> {
    if (!key || key.length < 8) throw new GameError('invalid_idempotency_key')
    const item = STORE.find((s) => s.id === itemId)
    if (!item) throw new GameError('item_not_found')
    const inv = this.s.inventory.find((i) => i.item_id === itemId)
    if (this.s.keys.includes(`buy:${key}`)) return { ok: true, replayed: true, balance: this.s.wallet.balance, quantity: inv?.quantity ?? 0 }
    if (!item.consumable && inv) throw new GameError('already_owned')
    this.applyGems(-item.price, `Purchased ${item.name}`, itemId, `buy:${key}`)
    let qty = 1
    if (inv) qty = ++inv.quantity
    else this.s.inventory.push({ item_id: itemId, quantity: 1, equipped: false, acquired_at: new Date().toISOString() })
    this.save()
    return { ok: true, replayed: false, balance: this.s.wallet.balance, quantity: qty }
  }

  async setEquipped(itemId: string, equipped: boolean) {
    const inv = this.s.inventory.find((i) => i.item_id === itemId && i.quantity > 0)
    if (!inv) throw new GameError('not_owned')
    const cat = STORE.find((s) => s.id === itemId)?.category
    if (equipped) for (const i of this.s.inventory) if (STORE.find((s) => s.id === i.item_id)?.category === cat) i.equipped = false
    inv.equipped = equipped
    this.save()
  }

  async getLeaderboard(): Promise<LeaderRow[]> { return [] }
  async getPlayerStats(): Promise<PlayerStats> { return computeStats(this.s.activeDays ?? [], localDay(), this.reviewIds().length) }
  async reportQuestion() { throw new GameError('accounts_unavailable', 'Reports are sent to editors through the online backend.') }
}
