import jitiPkg from 'jiti'
const createJiti = jitiPkg.createJiti ?? jitiPkg
import { readFileSync, writeFileSync } from 'node:fs'
const jiti = createJiti(import.meta.url)
const { spokenText, narrationKey } = await jiti.import('/home/user/workspace/biblequest/src/lib/speech.ts')
const { questionSpeechParts, feedbackSpeechParts } = await jiti.import('/home/user/workspace/biblequest/src/game/narration.ts')
const qs = JSON.parse(readFileSync('/tmp/narr/whoami.json', 'utf8'))
const segs = new Map()
const add = (qid, kind, t) => { const k = narrationKey(t); if (!segs.has(k)) segs.set(k, { key: k, qid, kind, text: t, spoken: spokenText(t) }) }
const perQ = []
for (const q of qs) {
  const full = questionSpeechParts(q, q.clues.length)
  const r = { correct: true, correct_index: q.correct_index, reference: q.reference_label, verse_text: q.verse_text, explanation: q.explanation }
  const fb = feedbackSpeechParts(q, r)
  const fbw = feedbackSpeechParts(q, { ...r, correct: false })
  const list = [['head', full[0]], ...full.slice(1, -1).map((t, i) => [`clue${i + 2}`, t]), ['options', full[full.length - 1]], ['detail', fb[1]]]
  list.forEach(([k, t]) => add(q.id, k, t))
  add('shared', 'verdict', fb[0]); add('shared', 'verdict', fbw[0])
  perQ.push({ id: q.id, segs: list.map(([k, t]) => ({ kind: k, key: narrationKey(t), spoken: spokenText(t) })) })
}
writeFileSync('/tmp/narr/segments.json', JSON.stringify([...segs.values()], null, 1))
writeFileSync('/tmp/narr/perq.json', JSON.stringify(perQ, null, 1))
const all = [...segs.values()]
console.log('unique segments', all.length, 'chars', all.reduce((a, s) => a + s.spoken.length, 0), 'max', Math.max(...all.map((s) => Buffer.byteLength(s.spoken))))
console.log(perQ[0].segs.map((s) => s.kind + ': ' + s.spoken).join('\n'))
const odd = all.filter((s) => /_{2,}|[A-Z]{3,}|\(|\[|http/.test(s.spoken)).slice(0, 10).map((s) => s.qid + ' ' + s.kind + ': ' + s.spoken.slice(0, 160))
console.log('odd', odd.length, odd.join('\n'))
