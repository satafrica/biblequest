import { describe, expect, it } from 'vitest'
import { feedbackSpeechParts, questionSpeechParts, repeatsVerse } from '../narration'
import { _setNarrationManifest, hasRecording, narrationKey, setRecordedNarration } from '../../lib/speech'

const who = { game_mode: 'whoami' as const, prompt: 'Who am I?', clues: ['A', 'B', 'C', 'D'], options: ['Joshua', 'Aaron'], extra: null }

describe('narration parts', () => {
  it('splits Who Am I so later clues are separate and never read early', () => {
    expect(questionSpeechParts(who, 1)).toEqual(['Who am I? Clue 1. A', 'Option 1. Joshua. Option 2. Aaron.'])
    expect(questionSpeechParts(who, 3)).toEqual(['Who am I? Clue 1. A', 'Clue 2. B', 'Clue 3. C', 'Option 1. Joshua. Option 2. Aaron.'])
    expect(questionSpeechParts(who, 1, [], [0])).toEqual(['Who am I? Clue 1. A', 'Option 2. Aaron.'])
  })
  it('keeps other games as one part', () => {
    expect(questionSpeechParts({ game_mode: 'scripture', prompt: 'Q?', clues: null, options: ['x', 'y'], extra: null }, 1)).toEqual(['Q? Option 1. x. Option 2. y.'])
  })
  it('feedback is a verdict plus the same detail whether right or wrong', () => {
    const r = { correct: true, correct_index: 1, reference: 'Numbers 17:8', verse_text: 'V', explanation: 'E' }
    expect(feedbackSpeechParts(who, r)).toEqual(['Correct.', 'The answer is Aaron. Numbers 17:8. V E'])
    expect(feedbackSpeechParts(who, { ...r, correct: false })).toEqual(['Not quite.', 'The answer is Aaron. Numbers 17:8. V E'])
  })
  it('skips an explanation that only repeats the verse', () => {
    const verse = 'Then Agrippa said unto Paul, Almost thou persuadest me to be a Christian.'
    expect(repeatsVerse('Agrippa said unto Paul, Almost thou persuadest me to be a Christian.', verse)).toBe(true)
    expect(repeatsVerse('Festus thought Paul was mad because of his learning.', verse)).toBe(false)
    const r = { correct: true, correct_index: 1, reference: 'Acts 26:28', verse_text: verse, explanation: 'Agrippa said unto Paul, Almost thou persuadest me.' }
    expect(feedbackSpeechParts(who, r)).toEqual(['Correct.', `The answer is Aaron. Acts 26:28. ${verse}`])
  })
  it('only uses recordings when every part has one', () => {
    const parts = questionSpeechParts(who, 2)
    _setNarrationManifest({ whoami: parts.map(narrationKey) })
    expect(hasRecording('whoami', parts)).toBe(true)
    expect(hasRecording('whoami', questionSpeechParts(who, 3))).toBe(false)
    expect(hasRecording('scripture', parts)).toBe(false)
    setRecordedNarration(false)
    expect(hasRecording('whoami', parts)).toBe(false)
    setRecordedNarration(true)
    _setNarrationManifest(null)
  })
  it('keys are stable and depend on the spoken words', () => {
    expect(narrationKey('Psalms 23:1')).toBe(narrationKey('Psalm chapter 23, verse 1'))
    expect(narrationKey('a')).not.toBe(narrationKey('b'))
  })
})
