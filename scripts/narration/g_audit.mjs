import jitiPkg from 'jiti'
const createJiti = jitiPkg.createJiti ?? jitiPkg
import { readFileSync } from 'node:fs'
const jiti = createJiti(import.meta.url)
const { narrationKey } = await jiti.import('/home/user/workspace/biblequest/src/lib/speech.ts')
const { questionSpeechParts, feedbackSpeechParts } = await jiti.import('/home/user/workspace/biblequest/src/game/narration.ts')
const man = await (await fetch('https://zosmfpridatotdrvbqrx.supabase.co/storage/v1/object/public/narration/manifest-next.json')).json()
const qs = JSON.parse(readFileSync('/tmp/narr/others.json', 'utf8'))
const res = {}
for (const q of qs) {
  const keys = new Set(man.modes[q.game_mode].clips)
  const order = q.game_mode === 'sequence' ? [...q.options].reverse() : []
  const r = { correct_index: q.correct_index, reference: q.reference_label, verse_text: q.verse_text, explanation: q.explanation }
  const all = [...questionSpeechParts(q, 1, order), ...feedbackSpeechParts(q, { ...r, correct: true }), ...feedbackSpeechParts(q, { ...r, correct: false })]
  const miss = all.filter((t) => !keys.has(narrationKey(t)))
  const s = (res[q.game_mode] ??= { questions: 0, full: 0, missing: [] }); s.questions++
  if (miss.length) s.missing.push(q.id + ': ' + miss[0].slice(0, 60)); else s.full++
}
for (const [m, s] of Object.entries(res)) console.log(m, s.questions, 'questions,', s.full, 'fully recorded', s.missing.slice(0, 3))
