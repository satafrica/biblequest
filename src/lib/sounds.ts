// Answer sounds, generated with the Web Audio API.
// They need no audio files, have no licensing issues and work offline.
// Players can turn them off in Settings. Sounds never carry information that isn't
// also shown on screen, so the game works fully without them.

type Sound = 'correct' | 'wrong' | 'complete'

let ctx: AudioContext | null = null
function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    return ctx
  } catch { return null }
}

/** Call from a click or key press so mobile browsers allow sound later (e.g. when an arena timer runs out). */
export function unlockAudio() { audio() }

/** A soft bell-like tone: a sine with a quieter octave overtone and a smooth decay. */
function bell(ac: BaseAudioContext, out: AudioNode, freq: number, at: number, dur: number, peak: number) {
  for (const [mult, gainMult] of [[1, 1], [2, 0.25], [3, 0.08]] as const) {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq * mult, at)
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(peak * gainMult, at + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    osc.connect(g).connect(out)
    osc.start(at); osc.stop(at + dur + 0.05)
  }
}

/** A bright, glassy "ting": a sine plus a slightly detuned twin for shimmer and a high sparkle partial. */
function sparkle(ac: BaseAudioContext, out: AudioNode, freq: number, at: number, dur: number, peak: number) {
  for (const [mult, gainMult, d] of [[1, 1, dur], [1.004, 0.5, dur], [4, 0.12, dur * 0.4]] as const) {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq * mult, at)
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(peak * gainMult, at + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, at + d)
    osc.connect(g).connect(out)
    osc.start(at); osc.stop(at + d + 0.05)
  }
}

/** A gentle, low "not quite" tone: a softened triangle wave sliding down. */
function soft(ac: BaseAudioContext, out: AudioNode, from: number, to: number, at: number, dur: number, peak: number) {
  const osc = ac.createOscillator()
  const g = ac.createGain()
  const lp = ac.createBiquadFilter()
  osc.type = 'triangle'
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(1500, at)
  osc.frequency.setValueAtTime(from, at)
  osc.frequency.exponentialRampToValueAtTime(to, at + dur)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(peak, at + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(lp).connect(g).connect(out)
  osc.start(at); osc.stop(at + dur + 0.05)
}

export function playSound(kind: Sound, volume = 1) {
  const ac = audio()
  if (!ac || volume <= 0) return
  schedule(ac, kind, volume)
}

function schedule(ac: BaseAudioContext, kind: Sound, volume: number) {
  const out = ac.createGain()
  out.gain.value = Math.min(1, volume) * 0.6
  out.connect(ac.destination)
  const t = ac.currentTime + 0.01
  if (kind === 'correct') {
    // Bright "ting-TING": a quick B5 leaping up a fourth to a ringing E6,
    // with a soft G#5 underneath for warmth.
    sparkle(ac, out, 987.77, t, 0.22, 0.3)
    sparkle(ac, out, 1318.51, t + 0.08, 0.7, 0.34)
    bell(ac, out, 830.61, t + 0.08, 0.5, 0.12)
  } else if (kind === 'wrong') {
    // Two low descending notes: clear, but not harsh.
    // Pitched high enough to be heard on phone speakers.
    soft(ac, out, 466.16, 415.3, t, 0.2, 0.5)
    soft(ac, out, 392.0, 329.63, t + 0.15, 0.36, 0.48)
  } else {
    // Round complete: C major arpeggio.
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(ac, out, f, t + i * 0.1, 0.8, 0.28))
  }
}

/** Renders a sound offline (used to export previews and in tests). */
export async function renderSound(kind: Sound, volume = 1, sampleRate = 44100): Promise<AudioBuffer> {
  const ac = new OfflineAudioContext(1, Math.ceil(sampleRate * 1.4), sampleRate)
  schedule(ac, kind, volume)
  return ac.startRendering()
}
