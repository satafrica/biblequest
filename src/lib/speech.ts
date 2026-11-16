// Read-aloud using the browser's built-in speech synthesis (no audio files, works offline
// where the device has voices). Everything read aloud is also shown on screen.

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function'
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => v.lang === 'en-US' && v.localService) ?? voices.find((v) => v.lang?.startsWith('en'))
}

/** Speak text, replacing anything already being read. Returns false when unsupported. */
export function speak(text: string, opts: { rate?: number; onEnd?: () => void } = {}): boolean {
  if (!speechSupported() || !text.trim()) return false
  const synth = window.speechSynthesis
  synth.cancel()
  // Long passages are split at sentence ends; some engines stop reading after ~15 seconds of one utterance.
  const parts = text.replace(/\s+/g, ' ').match(/[^.!?;:]+[.!?;:]*\s*/g) ?? [text]
  const chunks: string[] = []
  for (const p of parts) {
    const last = chunks[chunks.length - 1]
    if (last && last.length + p.length < 220) chunks[chunks.length - 1] = last + p
    else chunks.push(p)
  }
  const voice = pickVoice()
  chunks.forEach((c, i) => {
    const u = new SpeechSynthesisUtterance(c.trim())
    u.rate = opts.rate ?? 1
    u.lang = voice?.lang ?? 'en-US'
    if (voice) u.voice = voice
    if (i === chunks.length - 1 && opts.onEnd) { u.onend = opts.onEnd; u.onerror = opts.onEnd }
    synth.speak(u)
  })
  return true
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel()
}
