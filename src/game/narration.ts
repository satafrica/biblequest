import type { AnswerResult, PublicQuestion } from '../engine/types'

// What is read aloud for a question and for its feedback, split into parts. The device voice reads
// the parts joined together; recorded narration has one recording per part (see speakParts), so
// the split decides what can be recorded once and reused:
//  - Who Am I?: the prompt with clue 1, then each later clue on its own (clues are revealed one at
//    a time, so a recording never gives away a clue early), then the options.
//  - Feedback: "Correct." or "Not quite.", then the answer, reference, verse and explanation.
// The recording script (scripts/narration) imports these same functions, so the words match.

type Q = Pick<PublicQuestion, 'game_mode' | 'prompt' | 'clues' | 'options' | 'extra'>

export function questionSpeechParts(q: Q | null | undefined, cluesShown: number, order: string[] = [], eliminated: number[] = []): string[] {
  if (!q) return []
  if (q.game_mode === 'whoami' && q.clues && q.clues.length) {
    const shown = q.clues.slice(0, Math.max(1, cluesShown))
    const parts = [`${q.prompt} Clue 1. ${shown[0]}`, ...shown.slice(1).map((c, i) => `Clue ${i + 2}. ${c}`)]
    const opts = q.options.map((o, i) => (eliminated.includes(i) ? '' : `Option ${i + 1}. ${o}.`)).filter(Boolean)
    if (opts.length) parts.push(opts.join(' '))
    return parts
  }
  const parts = [q.prompt]
  if (q.game_mode === 'mystery' && q.extra?.clue) parts.unshift(`Case file: ${q.extra.case_title}. Stage ${q.extra.stage} of ${q.extra.stages}. ${q.extra.clue}`)
  // Sequence: the events are shown in a shuffled order, so each event is its own part (one
  // recording each) and the parts follow the order on screen.
  if (q.game_mode === 'sequence') return [endSentence(q.prompt), ...order.map((o) => endSentence(o))]
  if (q.game_mode === 'hidden') parts.push('Tap the object in the picture.')
  else {
    // Choice questions: the prompt and the options are separate parts (one recording each). After a
    // 50/50 the options part has no recording, so the device voice reads the question instead; the
    // device voice reads the same words either way.
    const opts = q.options.map((o, i) => (eliminated.includes(i) ? '' : `Option ${i + 1}. ${o}.`)).filter(Boolean)
    return opts.length ? [parts.join(' '), opts.join(' ')] : [parts.join(' ')]
  }
  return [parts.join(' ')]
}

type R = Pick<AnswerResult, 'correct' | 'correct_index' | 'reference' | 'verse_text' | 'explanation'>

/** Adds a full stop when a text has no closing punctuation, so the voice ends the sentence. */
export const endSentence = (t: string) => (/[.!?:;\u201d"')]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`)

const words = (s: string) => s.toLowerCase().replace(/\u2019/g, "'").match(/[a-z']+/g) ?? []

/**
 * True when an explanation mostly repeats what was just read (the verse, and the reference if
 * given), so read-aloud does not say it twice. "This verse is Acts 9:4 (KJV)." adds nothing after
 * the reference has been read. Exported for tests.
 */
export function repeatsVerse(explanation: string, verse: string, reference = ''): boolean {
  const e = words(explanation)
  if (!e.length) return false
  const v = new Set(words(verse))
  if (reference) for (const w of [...words(reference), 'this', 'verse', 'is', 'kjv']) v.add(w)
  return e.filter((w) => v.has(w)).length / e.length >= 0.7
}

/** The part after "Correct."/"Not quite." for a choice question; the same whether the answer was right or wrong. */
export function answerDetail(answer: string | undefined, reference: string | undefined, verse: string | null | undefined, explanation: string | undefined): string {
  const parts: string[] = []
  if (answer) parts.push(`The answer is ${answer}.`)
  // When the answer is the reference ("Where is this verse found?"), it is not read twice.
  if (reference && reference !== answer) parts.push(`${reference}.`)
  if (verse) parts.push(verse.replace(/\n/g, '. ').replace(/\u2026/g, ''))
  if (explanation && !(verse && repeatsVerse(explanation, verse, reference))) parts.push(explanation)
  return parts.join(' ')
}

export function feedbackSpeechParts(q: Pick<PublicQuestion, 'game_mode' | 'options'> | null | undefined, r: R | null | undefined): string[] {
  if (!q || !r) return []
  const verdict = r.correct ? 'Correct.' : 'Not quite.'
  if (q.game_mode === 'hidden' || q.game_mode === 'sequence') {
    // The verdict (with the hidden-object hint) and the detail are separate parts, so the detail
    // has one recording whether the answer was right or wrong.
    const lead = !r.correct && q.game_mode === 'hidden' ? `${verdict} The object is outlined in the picture.` : verdict
    const detail = answerDetail(undefined, r.reference, r.verse_text, r.explanation)
    return detail ? [lead, detail] : [lead]
  }
  const answer = r.correct_index !== undefined ? q.options[r.correct_index] : undefined
  const detail = answerDetail(answer, r.reference, r.verse_text, r.explanation)
  return detail ? [verdict, detail] : [verdict]
}
