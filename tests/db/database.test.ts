/**
 * Database integration tests: run the real Supabase migrations + seed against a real
 * PostgreSQL server (embedded-postgres) with a minimal Supabase auth stub, then exercise
 * the gem economy, anti-farming rules, RLS and the editorial workflow as real roles.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import EmbeddedPostgres from 'embedded-postgres'
import pg from 'pg'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const ROOT = path.resolve(__dirname, '../..')
const PORT = 54000 + Math.floor(Math.random() * 900)
let server: EmbeddedPostgres
let admin: pg.Client
const cfg = { host: '127.0.0.1', port: PORT, user: 'postgres', password: 'pw', database: 'postgres' }

async function sql(text: string, params: unknown[] = []) { return admin.query(text, params) }

/** Run a function as a specific user, in its own connection + transaction, like PostgREST does. */
async function asUser<T>(userId: string | null, fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const c = new pg.Client(cfg); await c.connect()
  try {
    await c.query('begin')
    await c.query(`set local role ${userId ? 'authenticated' : 'anon'}`)
    await c.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? ''])
    const out = await fn(c)
    await c.query('commit')
    return out
  } catch (e) { await c.query('rollback').catch(() => {}); throw e } finally { await c.end() }
}
const rpc = (uid: string | null, fnName: string, args: unknown[]) =>
  asUser(uid, async c => {
    const ph = args.map((_, i) => `$${i + 1}`).join(',')
    return (await c.query(`select public.${fnName}(${ph}) as r`, args)).rows[0].r
  })

async function newUser(role: 'player' | 'editor' | 'admin' = 'player') {
  const id = randomUUID()
  await sql(`insert into auth.users (id, email) values ($1, $2)`, [id, `${id.slice(0, 8)}@test.local`])
  if (role !== 'player') await sql(`update public.profiles set role = $2 where id = $1`, [id, role])
  return id
}
const balance = async (uid: string) => Number((await sql('select balance from public.gem_wallets where user_id=$1', [uid])).rows[0].balance)
const answerKey = async (qid: string) => (await sql('select correct_index from public.questions where id=$1', [qid])).rows[0].correct_index as number
async function playLevel(uid: string, level: string, allCorrect = true) {
  const s = await rpc(uid, 'start_session', [level])
  for (const q of s.questions) {
    if (q.game_mode === 'sequence') {
      const correct = (await sql('select options from public.questions where id=$1', [q.id])).rows[0].options
      await rpc(uid, 'submit_sequence', [s.session_id, q.id, JSON.stringify(allCorrect ? correct : [...correct].reverse())])
    } else {
      const k = await answerKey(q.id)
      await rpc(uid, 'submit_answer', [s.session_id, q.id, allCorrect ? k : (k + 1) % q.options.length, 1])
    }
  }
  return { session: s, result: await rpc(uid, 'complete_session', [s.session_id]) }
}

beforeAll(async () => {
  const dir = `/tmp/bq-pg-${PORT}`
  fs.rmSync(dir, { recursive: true, force: true })
  server = new EmbeddedPostgres({ databaseDir: dir, user: 'postgres', password: 'pw', port: PORT, persistent: false, onLog: () => {} })
  await server.initialise(); await server.start()
  admin = new pg.Client(cfg); await admin.connect()
  await sql(fs.readFileSync(path.join(ROOT, 'supabase/tests/supabase_auth_stub.sql'), 'utf8'))
  for (const f of fs.readdirSync(path.join(ROOT, 'supabase/migrations')).sort())
    await sql(fs.readFileSync(path.join(ROOT, 'supabase/migrations', f), 'utf8'))
  await sql(fs.readFileSync(path.join(ROOT, 'supabase/seed.sql'), 'utf8'))
  // Simulate editorial sign-off for the test database only.
  await sql(`update public.questions set status='published'`)
  await sql(`update public.question_assets set review_status='published'`)
  await sql(`update public.adventures set status='published'`)
  await sql(`update public.adventure_chapters set status='published'`)
}, 120_000)

afterAll(async () => { await admin?.end(); await server?.stop() })

describe('seed + schema', () => {
  it('loads 300+ questions, all seeded as review (never auto-published)', async () => {
    const fresh = fs.readFileSync(path.join(ROOT, 'supabase/seed.sql'), 'utf8')
    expect(fresh).not.toMatch(/'published'/)
    const n = (await sql('select count(*)::int n from public.questions')).rows[0].n
    expect(n).toBeGreaterThanOrEqual(300)
  })
  it('new auth user gets a profile and an empty wallet', async () => {
    const u = await newUser()
    expect(await balance(u)).toBe(0)
    const p = (await sql('select role, display_name from public.profiles where id=$1', [u])).rows[0]
    expect(p.role).toBe('player')
  })
  it('wallet balance can never go negative, even for the database owner', async () => {
    const u = await newUser()
    await expect(sql('update public.gem_wallets set balance = -1 where user_id=$1', [u])).rejects.toThrow(/check/)
  })
})

describe('security + RLS', () => {
  it('players cannot read answers from the questions table', async () => {
    const u = await newUser()
    const rows = await asUser(u, async c => (await c.query('select * from public.questions limit 5')).rows)
    expect(rows.length).toBe(0)
  })
  it('the public view never exposes correct answers or explanations', async () => {
    const cols = await asUser(null, async c => (await c.query('select * from public.published_questions limit 1')).fields.map(f => f.name))
    expect(cols).not.toContain('correct_index'); expect(cols).not.toContain('explanation')
  })
  it('players cannot write wallets, transactions or inventory directly', async () => {
    const u = await newUser()
    await expect(asUser(u, c => c.query('update public.gem_wallets set balance = 99999 where user_id = auth.uid()'))).rejects.toThrow(/permission denied/)
    await expect(asUser(u, c => c.query(`insert into public.gem_transactions (user_id, amount, kind, reason, idempotency_key, balance_after) values (auth.uid(), 500, 'earn', 'x', 'x', 500)`))).rejects.toThrow(/permission denied/)
    await expect(asUser(u, c => c.query(`insert into public.player_inventory (user_id, item_id) values (auth.uid(), 'badge_crown')`))).rejects.toThrow(/permission denied/)
  })
  it('players cannot call the internal ledger function', async () => {
    const u = await newUser()
    await expect(asUser(u, c => c.query(`select * from public._apply_gems(auth.uid(), 1000, 'x', null, null, 'hack')`))).rejects.toThrow(/permission denied/)
  })
  it('players can rename themselves but cannot promote themselves', async () => {
    const u = await newUser()
    await asUser(u, c => c.query(`update public.profiles set display_name = 'Ruth' where id = auth.uid()`))
    await expect(asUser(u, c => c.query(`update public.profiles set role = 'admin' where id = auth.uid()`))).rejects.toThrow(/permission denied/)
  })
  it('players only see their own wallet and transactions', async () => {
    const a = await newUser(); const b = await newUser()
    await playLevel(a, 'picture:1:1')
    const seen = await asUser(b, async c => (await c.query('select * from public.gem_transactions')).rows)
    expect(seen.length).toBe(0)
  })
  it('anonymous (signed-out) callers cannot start sessions', async () => {
    await expect(rpc(null, 'start_session', ['picture:1:1'])).rejects.toThrow(/permission denied/)
  })
})

describe('gameplay scoring + gem earning', () => {
  it('correct answer awards 10, wrong answer awards 0, explanation returned after answering', async () => {
    const u = await newUser()
    const s = await rpc(u, 'start_session', ['picture:1:1'])
    expect(s.questions).toHaveLength(8)
    expect(s.questions[0]).not.toHaveProperty('correct_index')
    const [q1, q2] = s.questions
    const ok = await rpc(u, 'submit_answer', [s.session_id, q1.id, await answerKey(q1.id), 1])
    expect(ok).toMatchObject({ correct: true, gems_awarded: 10, balance: 10 })
    expect(ok.explanation.length).toBeGreaterThan(10)
    const bad = await rpc(u, 'submit_answer', [s.session_id, q2.id, ((await answerKey(q2.id)) + 1) % 4, 1])
    expect(bad).toMatchObject({ correct: false, gems_awarded: 0, balance: 10 })
  })
  it('the same question cannot be answered twice in one session', async () => {
    const u = await newUser()
    const s = await rpc(u, 'start_session', ['scripture:1:1'])
    const q = s.questions[0]
    await rpc(u, 'submit_answer', [s.session_id, q.id, await answerKey(q.id), 1])
    await expect(rpc(u, 'submit_answer', [s.session_id, q.id, await answerKey(q.id), 1])).rejects.toThrow(/already_answered/)
  })
  it('replaying a level does not re-award question, level or perfect gems (no farming)', async () => {
    const u = await newUser()
    const first = await playLevel(u, 'picture:1:1')
    expect(first.result.bonuses.map((b: any) => b.gems)).toEqual([50, 100])
    expect(await balance(u)).toBe(8 * 10 + 50 + 100)
    const second = await playLevel(u, 'picture:1:1')
    expect(second.result.bonuses).toEqual([])
    expect(await balance(u)).toBe(230)
  })
  it('a level cannot be completed until every question is answered', async () => {
    const u = await newUser()
    const s = await rpc(u, 'start_session', ['whoami:1:1'])
    await expect(rpc(u, 'complete_session', [s.session_id])).rejects.toThrow(/session_incomplete/)
  })
  it('imperfect round earns level bonus but not perfect bonus', async () => {
    const u = await newUser()
    const r = await playLevel(u, 'whoami:1:1', false)
    expect(r.result.bonuses).toEqual([{ reason: 'Level completed', gems: 50 }])
  })
  it('story sequencing is validated on the server', async () => {
    const u = await newUser()
    const r = await playLevel(u, 'sequence:1:1')
    expect(r.result.correct).toBe(r.result.total)
  })
  it('Who Am I scores higher with fewer clues', async () => {
    const u = await newUser()
    const s = await rpc(u, 'start_session', ['whoami:1:1'])
    const a = await rpc(u, 'submit_answer', [s.session_id, s.questions[0].id, await answerKey(s.questions[0].id), 1])
    const b = await rpc(u, 'submit_answer', [s.session_id, s.questions[1].id, await answerKey(s.questions[1].id), 4])
    expect(a.points).toBe(100); expect(b.points).toBe(40)
  })
  it('concurrent correct answers to the same question in two sessions award gems once', async () => {
    const u = await newUser()
    const s1 = await rpc(u, 'start_session', ['picture:2:1'])
    const s2 = await rpc(u, 'start_session', ['picture:2:1'])
    const q = s1.questions[0]; const k = await answerKey(q.id)
    const results = await Promise.all([
      rpc(u, 'submit_answer', [s1.session_id, q.id, k, 1]), rpc(u, 'submit_answer', [s2.session_id, q.id, k, 1])])
    expect(results.map(r => r.gems_awarded).sort()).toEqual([0, 10])
    expect(await balance(u)).toBe(10)
  })
  it('unpublished questions are never served', async () => {
    const u = await newUser()
    await sql(`update public.questions set status='review' where game_mode='picture' and difficulty=4`)
    await expect(rpc(u, 'start_session', ['picture:4:1'])).rejects.toThrow(/no_published_content/)
    await sql(`update public.questions set status='published' where game_mode='picture' and difficulty=4`)
  })
  it('daily challenge awards 25 once per day', async () => {
    const u = await newUser()
    const today = (await sql(`select current_date::text d`)).rows[0].d
    const r1 = await playLevel(u, `daily:${today}`)
    expect(r1.result.bonuses).toEqual([{ reason: 'Daily challenge', gems: 25 }])
    const r2 = await playLevel(u, `daily:${today}`)
    expect(r2.result.bonuses).toEqual([])
    await expect(rpc(u, 'start_session', ['daily:2001-01-01'])).rejects.toThrow(/daily_expired/)
  })
  it('adventure chapters unlock in order and the full adventure awards 250 once', async () => {
    const u = await newUser()
    await expect(rpc(u, 'start_session', ['adv:ot-2'])).rejects.toThrow(/chapter_locked/)
    let last: any
    for (const ch of ['ot-1', 'ot-2', 'ot-3', 'ot-4', 'ot-5', 'ot-6']) last = (await playLevel(u, `adv:${ch}`, false)).result
    expect(last.bonuses).toContainEqual({ reason: 'Adventure completed', gems: 250 })
    const again = (await playLevel(u, 'adv:ot-6', false)).result
    expect(again.bonuses).toEqual([])
  })
  it('achievements are granted by the server', async () => {
    const u = await newUser()
    const r = await playLevel(u, 'scripture:1:1')
    expect(r.result.new_achievements).toEqual(expect.arrayContaining(['first_light', 'levels_1', 'perfect_1']))
  })
})

describe('store + spending', () => {
  async function richUser(gems: number) {
    const u = await newUser()
    await sql(`select * from public._apply_gems($1, $2, 'test grant', null, null, $3)`, [u, gems, 'grant:' + randomUUID()])
    return u
  }
  it('purchase deducts the price and records a transaction', async () => {
    const u = await richUser(100)
    const r = await rpc(u, 'purchase_item', ['hint', randomUUID()])
    expect(r).toMatchObject({ ok: true, balance: 70, quantity: 1 })
    const tx = (await sql(`select amount from public.gem_transactions where user_id=$1 and kind='spend'`, [u])).rows
    expect(tx).toEqual([{ amount: -30 }])
  })
  it('insufficient gems: purchase rejected, nothing changes', async () => {
    const u = await richUser(20)
    await expect(rpc(u, 'purchase_item', ['badge_crown', randomUUID()])).rejects.toThrow(/insufficient_gems/)
    expect(await balance(u)).toBe(20)
    expect((await sql('select count(*)::int n from public.player_inventory where user_id=$1', [u])).rows[0].n).toBe(0)
  })
  it('retrying the same purchase request (double click / network retry) charges once', async () => {
    const u = await richUser(1000); const key = randomUUID()
    const a = await rpc(u, 'purchase_item', ['frame_gold', key])
    const b = await rpc(u, 'purchase_item', ['frame_gold', key])
    expect(a.replayed).toBe(false); expect(b.replayed).toBe(true)
    expect(await balance(u)).toBe(600)
  })
  it('non-consumable items cannot be bought twice', async () => {
    const u = await richUser(1000)
    await rpc(u, 'purchase_item', ['badge_dove', randomUUID()])
    await expect(rpc(u, 'purchase_item', ['badge_dove', randomUUID()])).rejects.toThrow(/already_owned/)
    expect(await balance(u)).toBe(750)
  })
  it('concurrent purchases never overspend or go negative', async () => {
    const u = await richUser(100)   // enough for exactly 3 hints (90)
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => rpc(u, 'purchase_item', ['hint', randomUUID()])))
    const ok = results.filter(r => r.status === 'fulfilled').length
    expect(ok).toBe(3)
    expect(await balance(u)).toBe(10)
    expect((await sql(`select quantity from public.player_inventory where user_id=$1 and item_id='hint'`, [u])).rows[0].quantity).toBe(3)
  })
  it('concurrent double purchase of one non-consumable charges once', async () => {
    const u = await richUser(1000)
    const r = await Promise.allSettled([rpc(u, 'purchase_item', ['frame_mosaic', randomUUID()]), rpc(u, 'purchase_item', ['frame_mosaic', randomUUID()])])
    expect(r.filter(x => x.status === 'fulfilled').length).toBe(1)
    expect(await balance(u)).toBe(200)
  })
  it('power-ups are consumed once per question and require ownership', async () => {
    const u = await richUser(100)
    await rpc(u, 'purchase_item', ['eliminate_two', randomUUID()])
    const s = await rpc(u, 'start_session', ['picture:1:1'])
    const q = s.questions[0]
    const e1 = await rpc(u, 'use_power_up', [s.session_id, q.id, 'eliminate_two'])
    expect(e1.eliminated).toHaveLength(2)
    expect(e1.eliminated).not.toContain(await answerKey(q.id))
    const e2 = await rpc(u, 'use_power_up', [s.session_id, q.id, 'eliminate_two'])   // repeat = free replay
    expect(e2.eliminated).toEqual(e1.eliminated)
    expect((await sql(`select quantity from public.player_inventory where user_id=$1 and item_id='eliminate_two'`, [u])).rows[0].quantity).toBe(0)
    await expect(rpc(u, 'use_power_up', [s.session_id, s.questions[1].id, 'eliminate_two'])).rejects.toThrow(/none_owned/)
  })
  it('an interrupted operation leaves no partial state (atomic rollback)', async () => {
    const u = await richUser(500)
    const c = new pg.Client(cfg); await c.connect()
    await c.query('begin'); await c.query('set local role authenticated')
    await c.query(`select set_config('request.jwt.claim.sub', $1, true)`, [u])
    await c.query(`select public.purchase_item('badge_anchor', $1)`, [randomUUID()])
    await c.query('rollback'); await c.end()       // connection dropped mid-flight
    expect(await balance(u)).toBe(500)
    expect((await sql('select count(*)::int n from public.player_inventory where user_id=$1', [u])).rows[0].n).toBe(0)
  })
  it('equipping a cosmetic requires owning it', async () => {
    const u = await richUser(1000)
    await expect(rpc(u, 'set_item_equipped', ['theme_temple', true])).rejects.toThrow(/not_owned/)
    await rpc(u, 'purchase_item', ['theme_temple', randomUUID()])
    await rpc(u, 'set_item_equipped', ['theme_temple', true])
    expect((await sql(`select equipped from public.player_inventory where user_id=$1 and item_id='theme_temple'`, [u])).rows[0].equipped).toBe(true)
  })
})

describe('admin + editorial workflow', () => {
  it('players are forbidden from admin functions', async () => {
    const u = await newUser()
    await expect(rpc(u, 'admin_stats', [])).rejects.toThrow(/forbidden/)
    await expect(rpc(u, 'admin_set_question_status', ['who-noah', 'draft', null])).rejects.toThrow(/forbidden/)
    await expect(rpc(u, 'admin_update_store_item', ['hint', 1, true])).rejects.toThrow(/forbidden/)
  })
  it('draft -> review -> approved -> published; editors cannot publish; no skipping review', async () => {
    const editor = await newUser('editor'); const boss = await newUser('admin')
    const id = await rpc(editor, 'admin_upsert_question', [JSON.stringify({ game_mode: 'picture', book_id: 1, chapter: 1, verse_start: 1,
      reference_label: 'Genesis 1:1', difficulty: 1, prompt: 'Test?', options: ['a', 'b', 'c', 'd'], correct_index: 0, explanation: 'Because.' })])
    await expect(rpc(boss, 'admin_set_question_status', [id, 'published', null])).rejects.toThrow(/invalid_transition/)
    await rpc(editor, 'admin_set_question_status', [id, 'review', null])
    await rpc(editor, 'admin_set_question_status', [id, 'approved', 'checked'])
    await expect(rpc(editor, 'admin_set_question_status', [id, 'published', null])).rejects.toThrow(/invalid_transition/)
    await rpc(boss, 'admin_set_question_status', [id, 'published', null])
    const log = (await sql(`select to_status from public.content_reviews where content_id=$1 order by id`, [id])).rows.map(r => r.to_status)
    expect(log).toEqual(['review', 'approved', 'published'])
    expect((await sql(`select count(*)::int n from public.admin_audit_log where target_id=$1`, [id])).rows[0].n).toBe(4)
  })
  it('editing a published question sends it back to draft', async () => {
    const boss = await newUser('admin')
    await rpc(boss, 'admin_upsert_question', [JSON.stringify({ id: 'who-noah', game_mode: 'whoami', book_id: 1, chapter: 6, verse_start: 14,
      reference_label: 'Genesis 6:14', difficulty: 1, prompt: 'Who am I?', options: ['Noah', 'Lot', 'Enoch', 'Abraham'], correct_index: 0, explanation: 'Edited' })])
    expect((await sql(`select status from public.questions where id='who-noah'`)).rows[0].status).toBe('draft')
  })
  it('admins can change prices and reward rules; values are validated', async () => {
    const boss = await newUser('admin')
    await rpc(boss, 'admin_update_store_item', ['badge_lamp', 220, true])
    expect((await sql(`select price from public.store_items where id='badge_lamp'`)).rows[0].price).toBe(220)
    await expect(rpc(boss, 'admin_update_store_item', ['badge_lamp', 0, true])).rejects.toThrow(/invalid_price/)
    await expect(rpc(boss, 'admin_update_reward_rule', ['correct_answer', -5])).rejects.toThrow(/invalid_amount/)
  })
  it('admin stats returns real aggregates', async () => {
    const boss = await newUser('admin')
    const s = await rpc(boss, 'admin_stats', [])
    expect(s.players).toBeGreaterThan(5); expect(s.sessions_7d).toBeGreaterThan(5)
  })
  it('leaderboard includes only players who opted in', async () => {
    const shy = await newUser(); const bold = await newUser()
    await sql(`update public.profiles set leaderboard_opt_in = true, display_name = 'Bold' where id=$1`, [bold])
    for (const u of [shy, bold]) await playLevel(u, 'arena:1')
    const board = await asUser(null, async c => (await c.query(`select * from public.get_leaderboard('weekly')`)).rows)
    expect(board.map(r => r.display_name)).toEqual(['Bold'])
  })
})
