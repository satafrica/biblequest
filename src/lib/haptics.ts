// Short vibrations for answers on phones that support them (Android browsers; iPhone
// Safari does not offer web vibration). Purely extra: results are always shown on screen.
type Pattern = 'correct' | 'wrong' | 'complete' | 'tap'
const PATTERNS: Record<Pattern, number | number[]> = { correct: 35, wrong: [70, 50, 70], complete: [30, 40, 30, 40, 60], tap: 10 }

export function hapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}
export function vibrate(kind: Pattern, enabled = true) {
  if (!enabled || !hapticsSupported()) return
  try { navigator.vibrate(PATTERNS[kind]) } catch { /* some browsers block vibration without a recent tap */ }
}
