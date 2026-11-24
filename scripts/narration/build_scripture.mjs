// Scripture Quiz: part texts per question, with five voices taking turns (one voice per question).
// Input: /tmp/narr/scripture.json (published Scripture Quiz questions). Output: /tmp/narr/sq/perq.json
// (question -> voice and parts) and /tmp/narr/sq/todo.json (voice -> unique parts to record).
import jitiPkg from 'jiti'
const createJiti = jitiPkg.createJiti ?? jitiPkg
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
const jiti = createJiti(import.meta.url)
const { spokenText, narrationKey } = await jiti.import('/home/user/workspace/biblequest/src/lib/speech.ts')
const { questionSpeechParts, feedbackSpeechParts } = await jiti.import('/home/user/workspace/biblequest/src/game/narration.ts')
export const VOICES = ['charon', 'algieba', 'vindemiatrix', 'kore', 'gacrux']
const qs = JSON.parse(readFileSync('/tmp/narr/scripture.json', 'utf8')).sort((a, b) => (a.id < b.id ? -1 : 1))
mkdirSync('/tmp/narr/sq', { recursive: true })
const todo = Object.fromEntries(VOICES.map((v) => [v, new Map()]))
const perQ = []
qs.forEach((q, i) => {
  const voice = VOICES[i % VOICES.length]
  const qp = questionSpeechParts(q, 1)
  const r = { correct: true, correct_index: q.correct_index, reference: q.reference_label, verse_text: q.verse_text, explanation: q.explanation }
  const fb = feedbackSpeechParts(q, r)
  if (qp.length !== 2 || fb.length !== 2) throw new Error('unexpected parts ' + q.id)
  const list = [['head', qp[0]], ['options', qp[1]], ['detail', fb[1]]]
  for (const [, t] of list) todo[voice].set(narrationKey(t), spokenText(t))
  perQ.push({ id: q.id, voice, segs: list.map(([kind, t]) => ({ kind, key: narrationKey(t), spoken: spokenText(t) })) })
})
for (const v of VOICES) for (const t of ['Correct.', 'Not quite.']) todo[v].set(narrationKey(t), spokenText(t))
writeFileSync('/tmp/narr/sq/perq.json', JSON.stringify(perQ, null, 1))
writeFileSync('/tmp/narr/sq/todo.json', JSON.stringify(Object.fromEntries(VOICES.map((v) => [v, [...todo[v]].map(([key, spoken]) => ({ key, spoken }))])), null, 1))
let chars = 0, n = 0
for (const v of VOICES) { const a = [...todo[v].values()]; n += a.length; chars += a.reduce((s, t) => s + t.length, 0); console.log(v, perQ.filter((p) => p.voice === v).length, 'questions', a.length, 'clips') }
console.log('total clips', n, 'chars', chars, 'max part bytes', Math.max(...perQ.flatMap((p) => p.segs.map((s) => Buffer.byteLength(s.spoken)))))
for (const k of ['scr-cv-genesis-1-1', 'scr-bk-acts-9-4', 'scr-rf-john-3-16']) { const p = perQ.find((x) => x.id === k); console.log(p.id, p.voice); p.segs.forEach((s) => console.log('  ', s.kind, ':', s.spoken)) }
const odd = perQ.flatMap((p) => p.segs.filter((s) => /_|[A-Z]{3,}|\(|\[|http|\d/.test(s.spoken.replace(/chapter \d+, verses? \d+( to \d+)?|Option \d/g, ''))).map((s) => p.id + ' ' + s.kind + ': ' + s.spoken.slice(0, 140)))
console.log('odd', odd.length); console.log(odd.slice(0, 15).join('\n'))
