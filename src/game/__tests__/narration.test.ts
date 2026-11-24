import { describe, expect, it } from 'vitest'
import { feedbackSpeechParts, questionSpeechParts, repeatsVerse } from '../narration'
import { _setNarrationManifest, hasRecording, narrationKey, setRecordedNarration, spokenText } from '../../lib/speech'

const who = { game_mode: 'whoami' as const, prompt: 'Who am I?', clues: ['A', 'B', 'C', 'D'], options: ['Joshua', 'Aaron'], extra: null }

describe('narration parts', () => {
  it('splits Who Am I so later clues are separate and never read early', () => {
    expect(questionSpeechParts(who, 1)).toEqual(['Who am I? Clue 1. A', 'Option 1. Joshua. Option 2. Aaron.'])
    expect(questionSpeechParts(who, 3)).toEqual(['Who am I? Clue 1. A', 'Clue 2. B', 'Clue 3. C', 'Option 1. Joshua. Option 2. Aaron.'])
    expect(questionSpeechParts(who, 1, [], [0])).toEqual(['Who am I? Clue 1. A', 'Option 2. Aaron.'])
  })
  it('splits choice questions into the prompt and the options', () => {
    const sq = { game_mode: 'scripture' as const, prompt: 'Q?', clues: null, options: ['x', 'y'], extra: null }
    expect(questionSpeechParts(sq, 1)).toEqual(['Q?', 'Option 1. x. Option 2. y.'])
    expect(questionSpeechParts(sq, 1, [], [0])).toEqual(['Q?', 'Option 2. y.'])
  })
  it('reads each Sequence event as its own part, in the order on screen', () => {
    const seq = { game_mode: 'sequence' as const, prompt: 'Put these events in order: Creation', clues: null, options: ['a', 'b'], extra: null }
    expect(questionSpeechParts(seq, 1, ['b', 'a'])).toEqual(['Put these events in order: Creation.', 'b.', 'a.'])
  })
  it('Hidden Object and Sequence feedback: verdict, then the same detail', () => {
    const r = { correct: true, reference: 'Genesis 8:11', verse_text: 'V', explanation: 'E' }
    expect(feedbackSpeechParts({ game_mode: 'hidden', options: [] }, r)).toEqual(['Correct.', 'Genesis 8:11. V E'])
    expect(feedbackSpeechParts({ game_mode: 'hidden', options: [] }, { ...r, correct: false })).toEqual(['Not quite. The object is outlined in the picture.', 'Genesis 8:11. V E'])
    expect(feedbackSpeechParts({ game_mode: 'sequence', options: [] }, { ...r, correct: false })).toEqual(['Not quite.', 'Genesis 8:11. V E'])
  })
  it('reads a fill-in blank as the word blank', () => {
    expect(spokenText('the _____ and the earth')).toBe('the blank and the earth')
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
  it('Scripture Quiz feedback does not repeat the reference', () => {
    const sq = { game_mode: 'scripture' as const, options: ['Luke', 'Acts', 'John 3:16'] }
    const v = 'And he fell to the earth.'
    expect(feedbackSpeechParts(sq, { correct: true, correct_index: 1, reference: 'Acts 9:4', verse_text: v, explanation: 'This verse is Acts 9:4 (KJV).' }))
      .toEqual(['Correct.', `The answer is Acts. Acts 9:4. ${v}`])
    expect(feedbackSpeechParts(sq, { correct: false, correct_index: 2, reference: 'John 3:16', verse_text: v, explanation: `“${v}” is John 3:16 (KJV).` }))
      .toEqual(['Not quite.', `The answer is John 3:16. ${v}`])
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
  it('plays a list in one voice: the first voice that has every part', () => {
    const q1 = ['Q1?', 'Option 1. a.']
    const q2 = ['Q2?', 'Option 1. b.']
    _setNarrationManifest({ scripture: { charon: [...q1, 'Correct.'].map(narrationKey), kore: [...q2, 'Correct.'].map(narrationKey) } })
    expect(hasRecording('scripture', q1)).toBe(true)
    expect(hasRecording('scripture', q2)).toBe(true)
    expect(hasRecording('scripture', ['Correct.', 'Q2?'])).toBe(true)
    expect(hasRecording('scripture', ['Q1?', 'Option 1. b.'])).toBe(false)
    _setNarrationManifest(null)
  })
  it('keys are stable and depend on the spoken words', () => {
    expect(narrationKey('Psalms 23:1')).toBe(narrationKey('Psalm chapter 23, verse 1'))
    expect(narrationKey('a')).not.toBe(narrationKey('b'))
  })
})
