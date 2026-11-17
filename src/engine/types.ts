export type ModeId = 'picture' | 'whoami' | 'scripture' | 'sequence' | 'adventure' | 'arena' | 'daily'
export type Difficulty = 1 | 2 | 3 | 4
export const DIFFICULTY_LABELS: Record<Difficulty, string> = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced', 4: 'Expert' }
export const LEVEL_SIZE = 8
export const ARENA_SIZE = 10
export const DAILY_SIZE = 5

/** A question as the player sees it: never includes the correct answer. */
export interface PublicQuestion {
  id: string
  game_mode: 'picture' | 'whoami' | 'scripture' | 'sequence'
  book_id: number
  chapter: number
  verse_start: number | null
  verse_end: number | null
  reference_label: string
  difficulty: Difficulty
  prompt: string
  clues: string[] | null
  options: string[]
  has_hint: boolean
  image_id: string | null
  image_alt: string | null
  image_path: string | null
  translation_id: string
  tags: string[]
}

export interface SessionStart { session_id: string; questions: PublicQuestion[] }

export interface AnswerResult {
  correct: boolean
  correct_index?: number
  correct_order?: string[]
  explanation: string
  reference: string
  /** KJV passage for the reference, returned only after the answer is locked in. */
  verse_text?: string | null
  translation?: string
  points: number
  gems_awarded: number
  first_time_award: boolean
  balance: number
}

export interface CompleteResult {
  correct: number
  total: number
  bonuses: { reason: string; gems: number }[]
  balance: number
  new_achievements: string[]
}

export interface PowerUpResult { item: string; hint?: string; eliminated?: number[]; extra_seconds?: number }

export interface PurchaseResult { ok: boolean; replayed: boolean; balance: number; quantity: number }

export interface Wallet { balance: number; lifetime_earned: number }
export interface Transaction { id: string | number; amount: number; kind: 'earn' | 'spend' | 'admin_adjust'; reason: string; ref_id: string | null; balance_after: number; created_at: string }
export interface InventoryItem { item_id: string; quantity: number; equipped: boolean; acquired_at: string }
export interface Progress { level_key: string; game_mode: string; best_correct: number; total_questions: number; times_completed: number; last_played_at: string }
export interface EarnedAchievement { achievement_id: string; earned_at: string }

export interface Profile {
  id: string
  display_name: string
  avatar_id: string
  role: 'player' | 'moderator' | 'editor' | 'admin'
  leaderboard_opt_in: boolean
  preferences: Record<string, unknown>
}

export interface StoreItem { id: string; name: string; description: string; category: 'power_up' | 'badge' | 'frame' | 'theme' | 'collection' | 'collectible' | 'bonus' | 'decoration'; price: number; consumable: boolean; sort: number; image: string | null; image_alt: string | null }
export interface Achievement { id: string; name: string; description: string; icon: string }
export interface Asset { id: string; description: string; reference: string; alt: string; path: string; width?: number; height?: number; interpretation_note: string }
export interface Chapter { id: string; title: string; reference_label: string; image_id: string | null; narrative: string; position: number; question_ids: string[] }
export interface Adventure { id: string; title: string; testament: string; image_id: string | null; summary: string; chapters: Chapter[] }

/** Number of questions available per mode and difficulty (published only in cloud mode). */
export type LevelCounts = Record<string, Record<number, number>>

/** Which part of the Bible questions come from. 'all' is the whole Bible. */
export type Testament = 'all' | 'ot' | 'nt'

export interface Catalog {
  /** Whole-Bible counts. */
  levelCounts: LevelCounts
  /** Counts limited to the Old ('ot') or New ('nt') Testament. */
  testamentCounts: Record<'ot' | 'nt', LevelCounts>
  adventures: Adventure[]
  store: StoreItem[]
  achievements: Achievement[]
  assets: Record<string, Asset>
  rewards: Record<string, number>
  totalQuestions: number
}

export interface AuthUser { id: string; email: string | null; isAnonymous: boolean }

export interface LeaderRow { display_name: string; correct: number; rounds: number }

/** Daily activity. A day counts when at least one round is completed. */
export interface PlayerStats {
  today: string            // yyyy-mm-dd in the player's time zone
  current_streak: number
  best_streak: number
  played_today: boolean
  active_days: string[]    // yyyy-mm-dd, most recent ~12 weeks
  review_count: number     // missed questions not yet answered correctly
}

export class GameError extends Error {
  code: string
  constructor(code: string, message?: string) { super(message ?? code); this.code = code }
}

export interface Backend {
  readonly kind: 'cloud' | 'local'
  /** True when progress will survive a reload on this device / account. */
  readonly persistent: boolean
  init(): Promise<void>
  user(): AuthUser | null
  onAuthChange(cb: () => void): () => void
  ensurePlayer(): Promise<void>
  signUp(email: string, password: string, displayName: string): Promise<{ needsConfirmation: boolean }>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  updatePassword(password: string): Promise<void>

  getCatalog(): Promise<Catalog>
  getProfile(): Promise<Profile | null>
  updateProfile(patch: Partial<Pick<Profile, 'display_name' | 'avatar_id' | 'leaderboard_opt_in' | 'preferences'>>): Promise<void>
  getWallet(): Promise<Wallet>
  getTransactions(limit?: number): Promise<Transaction[]>
  getInventory(): Promise<InventoryItem[]>
  getProgress(): Promise<Progress[]>
  getAchievements(): Promise<EarnedAchievement[]>

  startSession(levelKey: string): Promise<SessionStart>
  submitAnswer(sessionId: string, questionId: string, choice: number, cluesUsed: number): Promise<AnswerResult>
  submitSequence(sessionId: string, questionId: string, order: string[]): Promise<AnswerResult>
  completeSession(sessionId: string): Promise<CompleteResult>
  usePowerUp(sessionId: string, questionId: string, item: string): Promise<PowerUpResult>
  purchase(itemId: string, idempotencyKey: string): Promise<PurchaseResult>
  setEquipped(itemId: string, equipped: boolean): Promise<void>
  getLeaderboard(period: 'daily' | 'weekly'): Promise<LeaderRow[]>
  reportQuestion(questionId: string, reason: string): Promise<void>
  getPlayerStats(): Promise<PlayerStats>
  /** Permanently delete the signed-in account and its data (cloud), or this device's data (local). */
  deleteAccount(): Promise<void>
}

export const ERROR_MESSAGES: Record<string, string> = {
  insufficient_gems: 'You do not have enough gems for this item yet.',
  already_owned: 'You already own this item.',
  not_owned: 'You need to own this item first.',
  chapter_locked: 'Complete the previous chapter to unlock this one.',
  bonus_required: 'This arena is unlocked by the Expert Gauntlet bonus in the store.',
  daily_expired: 'That daily challenge has ended. Today\'s challenge is ready.',
  no_published_content: 'No published questions are available here yet.',
  session_closed: 'This round has already finished.',
  already_answered: 'That question was already answered.',
  none_owned: 'You do not have any of that power-up. Visit the store to get more.',
  item_not_found: 'That item is not available right now.',
  not_authenticated: 'Please start a guest session or sign in to play.',
  offline: 'You appear to be offline. Reconnect to continue.',
  forbidden: 'You do not have permission to do that.',
  nothing_to_review: 'Nothing to review right now. Questions you miss will appear here.',
}
export function friendlyError(e: unknown): string {
  const code = e instanceof GameError ? e.code : e instanceof Error ? e.message : String(e)
  for (const k of Object.keys(ERROR_MESSAGES)) if (code.includes(k)) return ERROR_MESSAGES[k]
  return 'Something went wrong. Please try again.'
}
