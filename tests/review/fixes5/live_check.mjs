globalThis.WebSocket = globalThis.WebSocket || class {}
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.online','utf8').split('\n').filter(l=>l.includes('=')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const plan = JSON.parse(fs.readFileSync('/tmp/rv4/live_plan.json','utf8'))
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false }, global: { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/159.0.8154.6 Safari/537.36' } } })
const { data: au, error: ae } = await sb.auth.signInAnonymously(); if (ae) throw ae
console.log('guest', au.user.id)
const seen = {}
const norm = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, kk) => (o[kk] = x[kk], o), {}) : x)
const take = qs => { for (const q of qs || []) if (plan.want[q.id]) seen[q.id] = q }
for (const k of Object.keys(plan.keys)) { const { data, error } = await sb.rpc('start_session', { p_level_key: k }); if (error) { console.log(k, error.message); continue } take(data.questions) }
for (const a of plan.advs) for (const ch of a.chapters) {
  const { data, error } = await sb.rpc('start_session', { p_level_key: 'adv:' + ch }); if (error) { console.log(ch, error.message); break }
  take(data.questions)
  for (const q of data.questions) { const r = await sb.rpc('submit_answer', { p_session: data.session_id, p_question: q.id, p_choice: 0, p_clues_used: 0 }); if (r.error) console.log('ans', q.id, r.error.message) }
  const c = await sb.rpc('complete_session', { p_session: data.session_id }); if (c.error) { console.log('complete', ch, c.error.message); break }
}
const bad = []
for (const [id, w] of Object.entries(plan.want)) {
  const g = seen[id]; if (!g) { bad.push(id + ': not served'); continue }
  for (const f of ['prompt', 'options', 'hint', 'clues', 'extra']) if (f in g && norm(g[f] ?? null) !== norm(w[f] ?? null)) bad.push(id + ': ' + f)
}
const t = (await sb.from('adventure_chapters').select('title').eq('id', 'case-m4')).data
console.log('served', Object.keys(seen).length, 'of', Object.keys(plan.want).length, 'problems', JSON.stringify(bad), 'case-m4', JSON.stringify(t))
console.log('fields', Object.keys(Object.values(seen)[0] || {}).join(','))
