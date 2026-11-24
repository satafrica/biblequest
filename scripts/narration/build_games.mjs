// One recorded voice per game (24 Nov 2026 plan). Input: /tmp/narr/others.json (published questions
// of these games, exported from the live database). Output: /tmp/narr/g/perq.json (question -> parts)
// and /tmp/narr/g/todo.json (game -> voice and unique parts to record).
import jitiPkg from 'jiti'
const createJiti = jitiPkg.createJiti ?? jitiPkg
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
const jiti = createJiti(import.meta.url)
const { spokenText, narrationKey } = await jiti.import('/home/user/workspace/biblequest/src/lib/speech.ts')
const { questionSpeechParts, feedbackSpeechParts } = await jiti.import('/home/user/workspace/biblequest/src/game/narration.ts')
export const PLAN = { picture: 'kore', hidden: 'vindemiatrix', mystery: 'charon', wisdom: 'gacrux', parables: 'algieba', geography: 'kore', sequence: 'gacrux' }
const qs = JSON.parse(readFileSync('/tmp/narr/others.json', 'utf8')).sort((a, b) => (a.id < b.id ? -1 : 1))
mkdirSync('/tmp/narr/g', { recursive: true })
const todo = Object.fromEntries(Object.keys(PLAN).map((m) => [m, new Map()]))
const perQ = []
for (const q of qs) {
  const m = q.game_mode
  const r = { correct: true, correct_index: q.correct_index, reference: q.reference_label, verse_text: q.verse_text, explanation: q.explanation }
  const qp = questionSpeechParts(q, 1, m === 'sequence' ? q.options : [])
  const fb = feedbackSpeechParts(q, r)
  const verdicts = [...new Set([...fb.slice(0, 1), ...feedbackSpeechParts(q, { ...r, correct: false }).slice(0, 1)])]
  const list = [...qp.map((t, i) => [i === 0 ? 'head' : m === 'sequence' ? 'event' : 'options', t]), ...fb.slice(1).map((t) => ['detail', t]), ...verdicts.map((t) => ['verdict', t])]
  if (fb.length !== 2) throw new Error('unexpected feedback ' + q.id)
  for (const [, t] of list) todo[m].set(narrationKey(t), spokenText(t))
  perQ.push({ id: q.id, mode: m, voice: PLAN[m], segs: list.map(([kind, t]) => ({ kind, key: narrationKey(t), spoken: spokenText(t) })) })
}
writeFileSync('/tmp/narr/g/perq.json', JSON.stringify(perQ, null, 1))
writeFileSync('/tmp/narr/g/todo.json', JSON.stringify(Object.fromEntries(Object.entries(PLAN).map(([m, v]) => [m, { voice: v, parts: [...todo[m]].map(([key, spoken]) => ({ key, spoken })) }])), null, 1))
let tot = 0, tc = 0
for (const m of Object.keys(PLAN)) { const a = [...todo[m].values()]; const c = a.reduce((s, t) => s + t.length, 0); tot += a.length; tc += c; console.log(m, PLAN[m], perQ.filter((p) => p.mode === m).length, 'q', a.length, 'clips', c, 'chars') }
console.log('total', tot, 'clips', tc, 'chars; max part bytes', Math.max(...perQ.flatMap((p) => p.segs.map((s) => Buffer.byteLength(s.spoken)))))
for (const m of Object.keys(PLAN)) { const p = perQ.find((x) => x.mode === m); console.log('--', p.id); p.segs.forEach((s) => console.log('  ', s.kind, ':', s.spoken.slice(0, 220))) }
const odd = perQ.flatMap((p) => p.segs.filter((s) => /_|[A-Z]{3,}|\(|\[|http|\d|→|&|\//.test(s.spoken.replace(/chapter \d+, verses? \d+( to \d+)?|Option \d|Stage \d of \d/g, ''))).map((s) => p.id + ' ' + s.kind + ': ' + s.spoken.slice(0, 160)))
console.log('odd', odd.length); console.log(odd.slice(0, 25).join('\n'))
