import { beforeEach, describe, expect, it } from 'vitest'
import { LocalBackend } from '../local'
import { ADVENTURES, QUESTIONS, STORE } from '../content'
import { countsFor, describeLevelKey, levelCount, levelKey, parseLevelKey, recommendDifficulty } from '../levels'
import { todayUTC } from '../../lib/ids'
import type { Progress } from '../types'

const byId = new Map(QUESTIONS.map((q) => [q.id, q]))

async function play(b: LocalBackend, key: string, opts: { allCorrect?: boolean } = { allCorrect: true }) {
  const s = await b.startSession(key)
  let gems = 0
  for (const [i, q] of s.questions.entries()) {
    const full = byId.get(q.id)!
    const right = opts.allCorrect !== false || i > 0
    if (q.game_mode === 'sequence') {
      const order = right ? full.options : [...full.options].reverse()
      gems += (await b.submitSequence(s.session_id, q.id, order)).gems_awarded
    } else {
      const choice = right ? full.correct_index : (full.correct_index + 1) % full.options.length
      gems += (await b.submitAnswer(s.session_id, q.id, choice, 1)).gems_awarded
    }
  }
  const done = await b.completeSession(s.session_id)
  return { s, gems, done }
}

let b: LocalBackend
beforeEach(async () => { localStorage.clear(); b = new LocalBackend(); await b.init(); b.reset() })

describe('content', () => {
  it('ships at least 300 questions across the five playable families, each with a reference', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(300)
    for (const q of QUESTIONS) { expect(q.reference_label).toMatch(/\d/); expect(q.explanation.length).toBeGreaterThan(10) }
  })
})

describe('gem rewards', () => {
  it('awards 10 per first-correct answer and level/perfect bonuses once', async () => {
    const first = await play(b, 'picture:1:1')
    const n = first.s.questions.length
    expect(first.gems).toBe(10 * n)
    expect(first.done.bonuses.map((x) => x.gems).sort()).toEqual([100, 50])
    expect((await b.getWallet()).balance).toBe(10 * n + 150)

    const replay = await play(b, 'picture:1:1')
    expect(replay.gems).toBe(0)
    expect(replay.done.bonuses).toEqual([])
    expect((await b.getWallet()).balance).toBe(10 * n + 150)
  })

  it('does not give the perfect bonus when a question is missed', async () => {
    const r = await play(b, 'scripture:1:1', { allCorrect: false })
    expect(r.done.bonuses.map((x) => x.reason)).toEqual(['Level completed'])
  })

  it('rejects answering the same question twice', async () => {
    const s = await b.startSession('whoami:1:1')
    const q = byId.get(s.questions[0].id)!
    await b.submitAnswer(s.session_id, q.id, q.correct_index, 1)
    await expect(b.submitAnswer(s.session_id, q.id, q.correct_index, 1)).rejects.toMatchObject({ code: 'already_answered' })
  })

  it('awards the daily challenge 25 gems only once per day', async () => {
    const key = `daily:${todayUTC()}`
    const a = await play(b, key)
    expect(a.done.bonuses).toEqual([{ reason: 'Daily challenge', gems: 25 }])
    const again = await play(b, key)
    expect(again.done.bonuses).toEqual([])
    await expect(b.startSession('daily:2000-01-01')).rejects.toMatchObject({ code: 'daily_expired' })
  })

  it('locks adventure chapters in order and awards 250 once when the adventure is complete', async () => {
    const adv = ADVENTURES[0]
    await expect(b.startSession(`adv:${adv.chapters[1].id}`)).rejects.toMatchObject({ code: 'chapter_locked' })
    let last
    for (const ch of adv.chapters) last = await play(b, `adv:${ch.id}`)
    expect(last!.done.bonuses.find((x) => x.reason === 'Adventure completed')?.gems).toBe(250)
    const again = await play(b, `adv:${adv.chapters.at(-1)!.id}`)
    expect(again.done.bonuses).toEqual([])
  })
})

describe('store', () => {
  async function earn(min: number) { let set = 1; while ((await b.getWallet()).balance < min) await play(b, `scripture:1:${set++}`) }

  it('refuses purchases without enough gems and never goes negative', async () => {
    await expect(b.purchase('hint', 'key-00000001')).rejects.toMatchObject({ code: 'insufficient_gems' })
    expect((await b.getWallet()).balance).toBe(0)
  })

  it('charges once for a replayed idempotency key', async () => {
    await earn(100)
    const before = (await b.getWallet()).balance
    const price = STORE.find((s) => s.id === 'hint')!.price
    const r1 = await b.purchase('hint', 'key-aaaaaaaa')
    const r2 = await b.purchase('hint', 'key-aaaaaaaa')
    expect(r1.replayed).toBe(false); expect(r2.replayed).toBe(true)
    expect((await b.getWallet()).balance).toBe(before - price)
    expect((await b.getInventory()).find((i) => i.item_id === 'hint')!.quantity).toBe(1)
  })

  it('prevents buying a permanent item twice', async () => {
    const perm = STORE.filter((s) => !s.consumable).sort((x, y) => x.price - y.price)[0]
    await earn(perm.price)
    await b.purchase(perm.id, 'key-perm-0001')
    await expect(b.purchase(perm.id, 'key-perm-0002')).rejects.toMatchObject({ code: 'already_owned' })
  })

  it('consumes a power-up once per question even if used again', async () => {
    await earn(100)
    await b.purchase('hint', 'key-hint-0001')
    const s = await b.startSession('picture:2:1')
    const q = s.questions[0].id
    const h1 = await b.usePowerUp(s.session_id, q, 'hint')
    await b.usePowerUp(s.session_id, q, 'hint')
    expect(h1.hint).toBeTruthy()
    expect((await b.getInventory()).find((i) => i.item_id === 'hint')!.quantity).toBe(0)
    await expect(b.usePowerUp(s.session_id, s.questions[1].id, 'hint')).rejects.toMatchObject({ code: 'none_owned' })
  })

  it('requires the Expert Gauntlet bonus for the expert arena', async () => {
    await expect(b.startSession('arena:4')).rejects.toMatchObject({ code: 'bonus_required' })
    const s = await b.startSession('arena:1')
    expect(s.questions.length).toBe(10)
  })
})

describe('Old / New Testament choice', () => {
  it('limits level questions and the arena to the chosen testament', async () => {
    const cat = await b.getCatalog()
    for (const t of ['ot', 'nt'] as const) {
      const n = levelCount(countsFor(cat, t), 'picture', 1)
      expect(n).toBeGreaterThan(0)
      const seen = new Set<string>()
      for (let set = 1; set <= n; set++) {
        const s = await b.startSession(levelKey('picture', 1, set, t))
        for (const q of s.questions) { expect(byId.get(q.id)!.book_id <= 39 ? 'ot' : 'nt').toBe(t); seen.add(q.id) }
      }
      expect(seen.size).toBe(countsFor(cat, t).picture[1])
      const a = await b.startSession(`arena:2:${t}`)
      expect(a.questions.length).toBeGreaterThan(0)
      for (const q of a.questions) expect(byId.get(q.id)!.book_id <= 39 ? 'ot' : 'nt').toBe(t)
    }
    const total = (m: string, d: number) => (cat.testamentCounts.ot[m]?.[d] ?? 0) + (cat.testamentCounts.nt[m]?.[d] ?? 0)
    expect(total('scripture', 2)).toBe(cat.levelCounts.scripture[2])
    await expect(b.startSession('picture:1:1:xx')).rejects.toMatchObject({ code: 'invalid_level' })
  })
  it('keeps whole-Bible keys unchanged and labels testament levels', () => {
    expect(levelKey('picture', 1, 2)).toBe('picture:1:2')
    expect(levelKey('picture', 1, 2, 'nt')).toBe('picture:1:2:nt')
    expect(parseLevelKey('picture:1:2:ot')).toEqual({ mode: 'picture', diff: 1, set: 2, testament: 'ot' })
    expect(parseLevelKey('picture:1:2:zz')).toBeNull()
    expect(describeLevelKey('whoami:2:1:ot')).toBe('Who Am I? · Intermediate 1 · Old Testament')
    expect(describeLevelKey('arena:3:nt')).toContain('New Testament')
  })
})

describe('adaptive difficulty', () => {
  const row = (key: string, best: number, at: string): Progress => ({ level_key: key, game_mode: key.split(':')[0], best_correct: best, total_questions: 8, times_completed: 1, last_played_at: at })
  it('starts at Beginner, moves up at 85%+ and down under 50%', () => {
    expect(recommendDifficulty([], 'picture')).toBe(1)
    expect(recommendDifficulty([row('picture:2:1', 8, '2026-01-02'), row('picture:2:2', 7, '2026-01-01')], 'picture')).toBe(3)
    expect(recommendDifficulty([row('picture:3:1', 2, '2026-01-02')], 'picture')).toBe(2)
    expect(recommendDifficulty([row('picture:3:1', 5, '2026-01-02')], 'picture')).toBe(3)
  })
})

describe('gameplay upgrades (local preview)', () => {
  it('returns the KJV verse text with each answer', async () => {
    const s = await b.startSession('scripture:1:1')
    const q = byId.get(s.questions[0].id)!
    expect('verse_text' in s.questions[0]).toBe(false)
    const r = await b.submitAnswer(s.session_id, q.id, q.correct_index, 1)
    expect(r.verse_text && r.verse_text.length).toBeGreaterThan(10)
    expect(r.verse_text).not.toMatch(/ [,.;:]/)
  })
  it('review mode replays missed questions until answered correctly', async () => {
    await expect(b.startSession('review')).rejects.toThrow(/nothing_to_review/)
    const s = await b.startSession('picture:1:1')
    const first = byId.get(s.questions[0].id)!
    for (const q of s.questions) { const f = byId.get(q.id)!; await b.submitAnswer(s.session_id, q.id, (f.correct_index + 1) % f.options.length, 1) }
    await b.completeSession(s.session_id)
    expect((await b.getPlayerStats()).review_count).toBe(s.questions.length)
    const rv = await b.startSession('review')
    expect(rv.questions.length).toBe(s.questions.length)
    await b.submitAnswer(rv.session_id, first.id, first.correct_index, 1)
    expect((await b.getPlayerStats()).review_count).toBe(s.questions.length - 1)
  })
  it('computes streaks like the server', async () => {
    const { computeStats } = await import('../local')
    const st = computeStats(['2026-11-10', '2026-11-13', '2026-11-14', '2026-11-15'], '2026-11-16', 0)
    expect(st.current_streak).toBe(3); expect(st.best_streak).toBe(3); expect(st.played_today).toBe(false)
    expect(computeStats(['2026-11-13'], '2026-11-16', 0).current_streak).toBe(0)
    expect(computeStats(['2026-11-15', '2026-11-16'], '2026-11-16', 0)).toMatchObject({ current_streak: 2, played_today: true })
    await play(b, 'picture:1:1')
    const mine = await b.getPlayerStats()
    expect(mine.current_streak).toBe(1); expect(mine.played_today).toBe(true)
  })
  it('share text shows the score pattern but no answers', async () => {
    const { resultText } = await import('../../lib/share')
    const t = resultText('Picture Bible Quiz · Beginner 1', [true, false, true])
    expect(t).toContain('2/3 correct'); expect(t).toContain('\u25A0\u25A1\u25A0')
    expect(t.split('\n').length).toBe(2)
  })
})
