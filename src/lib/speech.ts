// Read-aloud using the device's built-in speech synthesis (no audio files). Everything read aloud
// is also shown on screen. Devices often offer several English voices; we prefer the most natural
// one (or the player's choice in Settings) and fall back to an offline voice if an online one fails.

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function'
}

type VoiceLike = Pick<SpeechSynthesisVoice, 'name' | 'lang' | 'localService' | 'voiceURI'>

// Joke/effect voices and old formant voices (eSpeak, Apple's Eloquence and novelty voices) sound robotic.
const ROBOTIC = /espeak|compact|novelty|eloquence|\b(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|eddy|flo|fred|good news|grandma|grandpa|hysterical|jester|junior|kathy|organ|pipe organ|ralph|reed|rocko|sandy|shelley|superstar|trinoids|whisper|wobble|zarvox)\b/i
const GOOD_NAMES = /\b(samantha|ava|allison|susan|zoe|evan|nathan|joelle|noelle|tom|daniel|karen|moira|tessa|serena|kate|oliver|aria|jenny|guy|michelle|libby|sonia|ryan|natasha|william|emma|brian|andrew|christopher|eric|steffan|roger)\b/i

/** Higher is more natural-sounding. Exported for tests. */
export function voiceScore(v: VoiceLike): number {
  const lang = (v.lang || '').replace('_', '-').toLowerCase()
  if (!lang.startsWith('en')) return -1000
  const name = v.name || ''
  let s = lang === 'en-us' ? 3 : /^en-(gb|au|ca|ie|nz|za|in)$/.test(lang) ? 2 : 1
  if (/natural|neural/i.test(name)) s += 12
  if (/premium/i.test(name)) s += 10
  if (/enhanced/i.test(name)) s += 8
  if (/siri/i.test(name)) s += 7
  if (/online/i.test(name)) s += 5
  if (/google/i.test(name)) s += 5
  if (GOOD_NAMES.test(name)) s += 3
  if (ROBOTIC.test(name)) s -= 30
  return s
}

/** English voices, most natural first. */
export function rankVoices<T extends VoiceLike>(voices: T[]): T[] {
  return voices.filter((v) => voiceScore(v) > -1000).sort((a, b) => voiceScore(b) - voiceScore(a) || Number(b.localService) - Number(a.localService) || a.name.localeCompare(b.name))
}

export function englishVoices(): SpeechSynthesisVoice[] {
  return speechSupported() ? rankVoices(window.speechSynthesis.getVoices()) : []
}

/** Voices load asynchronously in some browsers; calls back whenever the list changes. */
export function onVoicesChanged(cb: () => void): () => void {
  if (!speechSupported()) return () => {}
  const s = window.speechSynthesis
  s.addEventListener?.('voiceschanged', cb)
  return () => s.removeEventListener?.('voiceschanged', cb)
}

let preferredURI = ''
/** '' means automatic (the most natural voice on this device). */
export function setPreferredVoice(uri: string) { preferredURI = uri || '' }

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = englishVoices()
  return (preferredURI && voices.find((v) => v.voiceURI === preferredURI)) || voices[0]
}

const NUMBERED: Record<string, string> = { '1': 'First', '2': 'Second', '3': 'Third' }
const NUMBERED_BOOKS = 'Samuel|Kings|Chronicles|Corinthians|Thessalonians|Timothy|Peter|John'

/** How text should be spoken: Bible references, small capitals (LORD) and symbols read naturally. Exported for tests. */
export function spokenText(text: string): string {
  return text
    .replace(/\u2026/g, '')
    // A fill-in blank ("_____") is read as the word "blank".
    .replace(/_{2,}/g, ' blank ')
    .replace(/\s*\u2192\s*/g, ', then ')
    .replace(/\s+\u00b7\s+/g, ', ')
    .replace(/&/g, ' and ')
    .replace(/\bKJV\b/g, 'King James Version')
    .replace(new RegExp(`\\b([1-3]) (${NUMBERED_BOOKS})\\b`, 'g'), (_, n: string, b: string) => `${NUMBERED[n]} ${b}`)
    .replace(/\bPsalms (\d+)(?=:)/g, 'Psalm $1')
    .replace(/(\d+):(\d+)\s*[-\u2013]\s*(\d+)/g, 'chapter $1, verses $2 to $3')
    .replace(/(\d+):(\d+)/g, 'chapter $1, verse $2')
    // All-capital words such as LORD or MENE are otherwise spelled out by some voices.
    .replace(/\b([A-Z])([A-Z]{1,})\b/g, (w, a: string, rest: string) => (w === 'I' ? w : a + rest.toLowerCase()))
    .replace(/\s+/g, ' ')
    .trim()
}

/** Splits at sentence and clause ends (never inside a reference); some engines stop after ~15 seconds of one utterance. */
export function speechChunks(text: string, max = 220): string[] {
  const parts = text.split(/(?<=[.!?;:])\s+/).filter(Boolean)
  const chunks: string[] = []
  for (const p of parts) {
    const last = chunks[chunks.length - 1]
    if (last && last.length + p.length + 1 < max) chunks[chunks.length - 1] = `${last} ${p}`
    else chunks.push(p)
  }
  return chunks
}

let session = 0

/** Speak text, replacing anything already being read. Returns false when unsupported. */
export function speak(text: string, opts: { rate?: number; onEnd?: () => void } = {}): boolean {
  if (!speechSupported() || !text.trim()) return false
  stopAudio()
  const synth = window.speechSynthesis
  synth.cancel()
  const chunks = speechChunks(spokenText(text))
  const run = (from: number, voice: SpeechSynthesisVoice | undefined) => {
    const id = ++session
    for (let i = from; i < chunks.length; i++) {
      const u = new SpeechSynthesisUtterance(chunks[i])
      u.rate = opts.rate ?? 1
      u.lang = voice?.lang ?? 'en-US'
      if (voice) u.voice = voice
      const last = i === chunks.length - 1
      u.onend = () => { if (last && id === session) opts.onEnd?.() }
      u.onerror = (e) => {
        if (id !== session) return
        const offline = e.error !== 'interrupted' && e.error !== 'canceled' && voice && !voice.localService
          ? englishVoices().find((v) => v.localService) : undefined
        // An online voice can fail without a connection: carry on from this sentence with the best offline voice.
        if (offline) { session++; synth.cancel(); run(i, offline) } else opts.onEnd?.()
      }
      synth.speak(u)
    }
  }
  run(0, pickVoice())
  return true
}

export function stopSpeaking() {
  stopAudio()
  if (speechSupported()) { session++; window.speechSynthesis.cancel() }
}

// ---------------------------------------------------------------------------------------------
// Recorded narration. Some games have studio-style recordings (an AI-generated voice) stored in
// Supabase Storage. Each recording is one "part" of what is read aloud (for example the opening
// clue, a later clue, or the options), named by a hash of the exact spoken text, so a recording
// is only ever played for text it matches. If any part has no recording, or playback fails, the
// device voice reads the text instead.
// ---------------------------------------------------------------------------------------------

/** Short stable id for spoken text (FNV-1a, 32 bit, plus the length). Exported for tests and the recording script. */
export function narrationKey(text: string): string {
  const s = spokenText(text)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  return `${h.toString(16).padStart(8, '0')}${s.length.toString(36)}`
}

// manifest.json lists the recordings per game. Either one voice for the whole game
//   { voice, clips: [key…] }            -> <mode>/<key>.mp3
// or several voices (Scripture Quiz takes turns between voices, one voice per question)
//   { voices: { <voice>: [key…] } }      -> <mode>/<voice>/<key>.mp3
// A list of parts is played in one voice only: the first voice that has every part.
type ModeEntry = { voice?: string; clips?: string[]; voices?: Record<string, string[]> }
interface NarrationManifest { version: number; modes: Record<string, ModeEntry> }
type VoiceSet = { path: string; keys: Set<string> }
function toSets(mode: string, v: ModeEntry | string[]): VoiceSet[] {
  if (Array.isArray(v)) return [{ path: mode, keys: new Set(v) }]
  if (v.voices && typeof v.voices === 'object') return Object.entries(v.voices).map(([voice, keys]) => ({ path: `${mode}/${voice}`, keys: new Set(keys ?? []) }))
  return [{ path: mode, keys: new Set(v.clips ?? []) }]
}
const NARRATION_BASE = (() => {
  const url = (import.meta.env?.VITE_SUPABASE_URL as string | undefined) ?? ''
  return url ? `${url.replace(/\/$/, '')}/storage/v1/object/public/narration` : ''
})()
let manifest: { modes: Record<string, VoiceSet[]> } | null = null
let manifestLoading: Promise<void> | null = null
let recordedEnabled = true

/** Player setting: use recorded narration when it exists (default on). */
export function setRecordedNarration(on: boolean) { recordedEnabled = on }

/** Fetch the list of recordings once; safe to call repeatedly. Failure just means the device voice is used. */
export function loadNarration(base = NARRATION_BASE): Promise<void> {
  if (!base || typeof fetch !== 'function') return Promise.resolve()
  if (!manifestLoading) {
    manifestLoading = fetch(`${base}/manifest.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((m: NarrationManifest | null) => {
        if (!m || typeof m !== 'object' || !m.modes) return
        manifest = { modes: Object.fromEntries(Object.entries(m.modes).map(([k, v]) => [k, toSets(k, v)])) }
      })
      .catch(() => { manifestLoading = null })
  }
  return manifestLoading ?? Promise.resolve()
}

/** True when every part has a recording for this game (and the player has not turned recordings off). */
export function hasRecording(mode: string, parts: string[]): boolean {
  return recordingPath(mode, parts) !== null
}

/** Storage folder of the first voice that has every part, or null. */
function recordingPath(mode: string, parts: string[]): string | null {
  const sets = recordedEnabled && manifest ? manifest.modes[mode] : undefined
  if (!sets || !parts.length) return null
  const keys = parts.map(narrationKey)
  return sets.find((s) => keys.every((k) => s.keys.has(k)))?.path ?? null
}

/** Test hook: install a manifest directly (a key list for one voice, or { voice: keys } for several). */
export function _setNarrationManifest(modes: Record<string, string[] | Record<string, string[]>> | null) {
  manifest = modes ? { modes: Object.fromEntries(Object.entries(modes).map(([k, v]) => [k, toSets(k, Array.isArray(v) ? v : { voices: v })])) } : null
}

let audioEl: HTMLAudioElement | null = null
let audioSession = 0
function stopAudio() {
  audioSession++
  if (audioEl) { audioEl.onended = null; audioEl.onerror = null; audioEl.pause() }
}

/**
 * Read a list of parts aloud: with the recorded voice when every part has a recording for this
 * game, otherwise with the device voice (same words). Returns false when nothing can be read.
 */
export function speakParts(mode: string, parts: string[], opts: { rate?: number; onEnd?: () => void } = {}): boolean {
  const clean = parts.filter((p) => p && p.trim())
  if (!clean.length) return false
  stopAudio()
  if (speechSupported()) { session++; window.speechSynthesis.cancel() }
  const path = recordingPath(mode, clean)
  if (!path || typeof Audio === 'undefined') return speak(clean.join(' '), opts)
  const id = ++audioSession
  if (!audioEl) audioEl = new Audio()
  const el = audioEl
  el.preload = 'auto'
  const fallback = (from: number) => {
    if (id !== audioSession) return
    stopAudio()
    if (!speak(clean.slice(from).join(' '), opts)) opts.onEnd?.()
  }
  const play = (i: number) => {
    if (id !== audioSession) return
    if (i >= clean.length) { opts.onEnd?.(); return }
    el.onended = () => play(i + 1)
    el.onerror = () => fallback(i)
    el.src = `${NARRATION_BASE}/${path}/${narrationKey(clean[i])}.mp3`
    el.playbackRate = opts.rate ?? 1
    ;(el as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true
    const p = el.play()
    if (p && typeof p.catch === 'function') p.catch(() => fallback(i))
  }
  play(0)
  return true
}

/** True when read-aloud can work at all here (device voice or a recording). */
export function readAloudAvailable(mode?: string, parts?: string[]): boolean {
  return speechSupported() || Boolean(mode && parts && hasRecording(mode, parts))
}
