import { describe, expect, it } from 'vitest'
import { rankVoices, speechChunks, spokenText } from '../speech'

const v = (name: string, lang = 'en-US', localService = true) => ({ name, lang, localService, voiceURI: name })

describe('narrator voice choice', () => {
  it('prefers natural, enhanced and Google voices over basic or robotic ones', () => {
    const r = rankVoices([v('Fred'), v('eSpeak English'), v('Microsoft David - English (United States)'), v('Google US English', 'en-US', false),
      v('Microsoft Aria Online (Natural) - English (United States)', 'en-US', false), v('Samantha (Enhanced)'), v('Thomas', 'fr-FR')])
    expect(r.map((x) => x.name)).toEqual(['Microsoft Aria Online (Natural) - English (United States)', 'Samantha (Enhanced)', 'Google US English',
      'Microsoft David - English (United States)', 'eSpeak English', 'Fred'])
  })
  it('uses only English voices', () => {
    expect(rankVoices([v('Amélie', 'fr-CA'), v('Daniel', 'en-GB')]).map((x) => x.name)).toEqual(['Daniel'])
  })
})

describe('spoken text', () => {
  it('reads Bible references naturally', () => {
    expect(spokenText('Acts 26:28 · KJV')).toBe('Acts chapter 26, verse 28, King James Version')
    expect(spokenText('1 Samuel 1:9-13')).toBe('First Samuel chapter 1, verses 9 to 13')
    expect(spokenText('Psalms 23:1')).toBe('Psalm chapter 23, verse 1')
  })
  it('does not spell out small capitals or symbols', () => {
    expect(spokenText('The LORD is my shepherd. MENE, MENE, TEKEL, UPHARSIN \u2026')).toBe('The Lord is my shepherd. Mene, Mene, Tekel, Upharsin')
    expect(spokenText('A \u2192 B')).toBe('A, then B')
    expect(spokenText('I said')).toBe('I said')
  })
  it('splits long text at sentence ends, never inside a reference', () => {
    const t = spokenText('Genesis 1:3-5: And God said, Let there be light: and there was light. ' + 'And God saw the light, that it was good. '.repeat(8))
    const c = speechChunks(t)
    expect(c.length).toBeGreaterThan(1)
    expect(c[0].startsWith('Genesis chapter 1, verses 3 to 5:')).toBe(true)
    expect(c.every((x) => x.length <= 260)).toBe(true)
    expect(c.join(' ')).toBe(t)
  })
})
