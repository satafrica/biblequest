// Supabase backend. Every score, gem award and purchase is decided by PostgreSQL
// functions (see supabase/migrations). The browser only sends the player's choices.
import type { PostgrestError, SupabaseClient, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import {
  GameError,
  type Achievement, type Adventure, type AnswerResult, type Asset, type Backend, type Catalog, type CompleteResult,
  type EarnedAchievement, type InventoryItem, type LeaderRow, type PlayerStats, type PowerUpResult, type Profile, type Progress,
  type PurchaseResult, type SessionStart, type StoreItem, type Transaction, type Wallet,
} from './types'

function fail(e: PostgrestError | Error | { message: string } | null): never {
  const msg = e?.message ?? 'unknown_error'
  if (/fetch|network|Failed to fetch|NetworkError/i.test(msg)) throw new GameError('offline', msg)
  const known = msg.match(/[a-z]+(?:_[a-z]+)+/)
  throw new GameError(known ? known[0] : msg, msg)
}

/** True when the server says the signed-in account does not exist any more. */
function isGoneAccount(e: { status?: number; code?: string; message: string }) {
  return e.code === 'user_not_found' || /does not exist|user_not_found/i.test(e.message) || e.status === 403
}

export class CloudBackend implements Backend {
  readonly kind = 'cloud' as const
  readonly persistent = true
  private sb: SupabaseClient = supabase()
  private current: User | null = null
  private listeners = new Set<() => void>()

  async init() {
    const { data } = await this.sb.auth.getSession()
    this.current = data.session?.user ?? null
    // A saved sign-in can outlive its account (for example after the account was deleted on
    // another device). Check it with the server and drop it, so the player gets a fresh start
    // instead of every round failing. Network errors keep the session so offline play still works.
    if (this.current) {
      const { error } = await this.sb.auth.getUser()
      if (error && isGoneAccount(error)) await this.forgetSession()
    }
    this.sb.auth.onAuthStateChange((event, session) => {
      this.current = session?.user ?? null
      if (event === 'PASSWORD_RECOVERY' && typeof window !== 'undefined') window.location.hash = '#/account/new-password'
      this.listeners.forEach((l) => l())
    })
  }
  user() {
    return this.current ? { id: this.current.id, email: this.current.email ?? null, isAnonymous: Boolean(this.current.is_anonymous) } : null
  }
  onAuthChange(cb: () => void) { this.listeners.add(cb); return () => { this.listeners.delete(cb) } }

  /** Guests play under a Supabase anonymous account so their progress can be saved and later linked. */
  async ensurePlayer() {
    if (this.current) return
    const { data, error } = await this.sb.auth.signInAnonymously()
    if (error) fail(error)
    this.current = data.user
  }
  private redirect() { return `${window.location.origin}${window.location.pathname}` }

  async signUp(email: string, password: string, displayName: string) {
    if (this.current?.is_anonymous) {
      // Link the guest account to an email: progress, gems and inventory stay with the same user id.
      const { error } = await this.sb.auth.updateUser({ email, data: { display_name: displayName } }, { emailRedirectTo: this.redirect() })
      if (error) fail(error)
      if (displayName) await this.updateProfile({ display_name: displayName })
      return { needsConfirmation: true }
    }
    const { data, error } = await this.sb.auth.signUp({ email, password, options: { data: { display_name: displayName }, emailRedirectTo: this.redirect() } })
    if (error) fail(error)
    return { needsConfirmation: !data.session }
  }
  async signIn(email: string, password: string) {
    const { error } = await this.sb.auth.signInWithPassword({ email, password })
    if (error) fail(error)
  }
  async signOut() { await this.sb.auth.signOut() }
  async requestPasswordReset(email: string) {
    const { error } = await this.sb.auth.resetPasswordForEmail(email, { redirectTo: this.redirect() })
    if (error) fail(error)
  }
  async updatePassword(password: string) {
    const { error } = await this.sb.auth.updateUser({ password })
    if (error) fail(error)
  }

  async getCatalog(): Promise<Catalog> {
    const [qs, advs, chs, store, ach, assets, rules] = await Promise.all([
      this.sb.rpc('published_question_counts'),
      this.sb.from('adventures').select('*').eq('status', 'published').order('sort_order'),
      this.sb.from('adventure_chapters').select('*').eq('status', 'published').order('position'),
      this.sb.from('store_items').select('*').eq('active', true).order('sort_order'),
      this.sb.from('achievements').select('id,name,description,icon'),
      this.sb.from('question_assets').select('*').eq('review_status', 'published'),
      this.sb.from('reward_rules').select('id,gems'),
    ])
    for (const r of [qs, advs, chs, store, ach, assets, rules]) if (r.error) fail(r.error)
    const levelCounts: Catalog['levelCounts'] = {}
    const testamentCounts: Catalog['testamentCounts'] = { ot: {}, nt: {} }
    let totalQuestions = 0
    for (const q of (qs.data ?? []) as { game_mode: string; difficulty: number; testament?: string; n: number }[]) {
      const n = Number(q.n)
      levelCounts[q.game_mode] ??= {}
      levelCounts[q.game_mode][q.difficulty] = (levelCounts[q.game_mode][q.difficulty] ?? 0) + n
      const t = q.testament?.toLowerCase()
      if (t === 'ot' || t === 'nt') {
        testamentCounts[t][q.game_mode] ??= {}
        testamentCounts[t][q.game_mode][q.difficulty] = (testamentCounts[t][q.game_mode][q.difficulty] ?? 0) + n
      }
      totalQuestions += n
    }
    const assetMap: Record<string, Asset> = {}
    for (const a of assets.data as Record<string, string | number | null>[]) {
      assetMap[a.id as string] = { id: a.id as string, description: a.description as string, reference: (a.bible_reference as string) ?? '', alt: a.alt_text as string, path: a.storage_path as string, width: a.width as number, height: a.height as number, interpretation_note: (a.interpretation_note as string) ?? '' }
    }
    const adventures: Adventure[] = (advs.data as Record<string, unknown>[]).map((a) => ({
      id: a.id as string, title: a.title as string, testament: a.testament as string, image_id: a.image_id as string | null, summary: a.summary as string,
      chapters: (chs.data as Record<string, unknown>[]).filter((c) => c.adventure_id === a.id).map((c) => ({
        id: c.id as string, title: c.title as string, reference_label: c.reference_label as string, image_id: c.image_id as string | null,
        narrative: c.narrative as string, position: c.position as number, question_ids: c.question_ids as string[],
      })),
    })).filter((a) => a.chapters.length > 0)
    const storeItems: StoreItem[] = (store.data as Record<string, unknown>[]).map((s) => ({
      id: s.id as string, name: s.name as string, description: s.description as string, category: s.category as StoreItem['category'],
      price: s.price as number, consumable: s.consumable as boolean, sort: s.sort_order as number, image: s.image_path as string | null, image_alt: s.image_alt as string | null,
    }))
    return {
      levelCounts, testamentCounts, adventures, store: storeItems, achievements: ach.data as Achievement[], assets: assetMap,
      rewards: Object.fromEntries((rules.data as { id: string; gems: number }[]).map((r) => [r.id, r.gems])),
      totalQuestions,
    }
  }

  private uid(): string { if (!this.current) throw new GameError('not_authenticated'); return this.current.id }

  async getProfile(): Promise<Profile | null> {
    if (!this.current) return null
    const { data, error } = await this.sb.from('profiles').select('id,display_name,avatar_id,role,leaderboard_opt_in,preferences').eq('id', this.current.id).maybeSingle()
    if (error) fail(error)
    return data as Profile | null
  }
  async updateProfile(patch: Partial<Profile>) {
    const { error } = await this.sb.from('profiles').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', this.uid())
    if (error) fail(error)
  }
  async getWallet(): Promise<Wallet> {
    if (!this.current) return { balance: 0, lifetime_earned: 0 }
    const { data, error } = await this.sb.from('gem_wallets').select('balance,lifetime_earned').eq('user_id', this.current.id).maybeSingle()
    if (error) fail(error)
    return { balance: Number(data?.balance ?? 0), lifetime_earned: Number(data?.lifetime_earned ?? 0) }
  }
  async getTransactions(limit = 50): Promise<Transaction[]> {
    if (!this.current) return []
    const { data, error } = await this.sb.from('gem_transactions').select('id,amount,kind,reason,ref_id,balance_after,created_at').eq('user_id', this.current.id).order('id', { ascending: false }).limit(limit)
    if (error) fail(error)
    return (data ?? []).map((t) => ({ ...t, balance_after: Number(t.balance_after) })) as Transaction[]
  }
  async getInventory(): Promise<InventoryItem[]> {
    if (!this.current) return []
    const { data, error } = await this.sb.from('player_inventory').select('item_id,quantity,equipped,acquired_at').eq('user_id', this.current.id)
    if (error) fail(error)
    return data as InventoryItem[]
  }
  async getProgress(): Promise<Progress[]> {
    if (!this.current) return []
    const { data, error } = await this.sb.from('player_progress').select('level_key,game_mode,best_correct,total_questions,times_completed,last_played_at').eq('user_id', this.current.id)
    if (error) fail(error)
    return data as Progress[]
  }
  async getAchievements(): Promise<EarnedAchievement[]> {
    if (!this.current) return []
    const { data, error } = await this.sb.from('player_achievements').select('achievement_id,earned_at').eq('user_id', this.current.id)
    if (error) fail(error)
    return data as EarnedAchievement[]
  }

  private async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.sb.rpc(fn, args)
    if (error) fail(error)
    return data as T
  }

  async startSession(levelKey: string) {
    await this.ensurePlayer()
    try {
      return await this.rpc<SessionStart>('start_session', { p_level_key: levelKey })
    } catch (e) {
      // The account behind this guest sign-in no longer exists: start again as a new guest, once.
      if (!(e instanceof GameError) || !/user_id_fkey|user_not_found/.test(`${e.code} ${e.message}`) || !this.current?.is_anonymous) throw e
      await this.forgetSession()
      await this.ensurePlayer()
      return this.rpc<SessionStart>('start_session', { p_level_key: levelKey })
    }
  }

  /** Clears a sign-in on this device only. */
  private async forgetSession() {
    await this.sb.auth.signOut({ scope: 'local' }).catch(() => {})
    this.current = null
    this.listeners.forEach((l) => l())
  }

  /**
   * If the connection drops after the server stored an answer, a retry returns
   * already_answered. Recover the stored outcome instead of awarding anything again.
   */
  private async recover(sessionId: string, questionId: string): Promise<AnswerResult> {
    const { data } = await this.sb.from('session_answers').select('is_correct,points').eq('session_id', sessionId).eq('question_id', questionId).maybeSingle()
    const w = await this.getWallet()
    return { correct: Boolean(data?.is_correct), points: data?.points ?? 0, explanation: 'This answer had already been saved before the connection dropped.', reference: '', gems_awarded: 0, first_time_award: false, balance: w.balance }
  }

  async submitAnswer(sessionId: string, questionId: string, choice: number, cluesUsed: number) {
    try {
      return await this.rpc<AnswerResult>('submit_answer', { p_session: sessionId, p_question: questionId, p_choice: choice, p_clues_used: cluesUsed })
    } catch (e) {
      if (e instanceof GameError && e.code === 'already_answered') return this.recover(sessionId, questionId)
      throw e
    }
  }
  async submitSequence(sessionId: string, questionId: string, order: string[]) {
    try {
      return await this.rpc<AnswerResult>('submit_sequence', { p_session: sessionId, p_question: questionId, p_order: order })
    } catch (e) {
      if (e instanceof GameError && e.code === 'already_answered') return this.recover(sessionId, questionId)
      throw e
    }
  }
  async completeSession(sessionId: string) { return this.rpc<CompleteResult>('complete_session', { p_session: sessionId }) }
  async usePowerUp(sessionId: string, questionId: string, item: string) { return this.rpc<PowerUpResult>('use_power_up', { p_session: sessionId, p_question: questionId, p_item: item }) }
  async purchase(itemId: string, key: string) {
    await this.ensurePlayer()
    const r = await this.rpc<PurchaseResult>('purchase_item', { p_item: itemId, p_idempotency_key: key })
    return { ...r, balance: Number(r.balance) }
  }
  async setEquipped(itemId: string, equipped: boolean) { await this.rpc('set_item_equipped', { p_item: itemId, p_equipped: equipped }) }
  async getLeaderboard(period: 'daily' | 'weekly') { return this.rpc<LeaderRow[]>('get_leaderboard', { p_period: period }) }
  async getPlayerStats() {
    if (!this.current) return { today: '', current_streak: 0, best_streak: 0, played_today: false, active_days: [], review_count: 0 }
    let tz = 'UTC'
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } catch { /* keep UTC */ }
    return this.rpc<PlayerStats>('get_player_stats', { p_tz: tz })
  }
  async deleteAccount() {
    this.uid()
    await this.rpc('delete_my_account', {})
    await this.sb.auth.signOut({ scope: 'local' }).catch(() => {})
    try { for (const k of Object.keys(localStorage)) if (k.startsWith('bq.active')) localStorage.removeItem(k) } catch { /* storage blocked */ }
  }
  async reportQuestion(questionId: string, reason: string) {
    const { error } = await this.sb.from('reports').insert({ reporter_id: this.uid(), target_type: 'question', target_id: questionId, reason })
    if (error) fail(error)
  }

  client() { return this.sb }
}
