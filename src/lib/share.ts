// Share a round result without revealing any answers: only the score and a right/wrong pattern.

export function resultText(title: string, correct: boolean[], url?: string): string {
  const n = correct.filter(Boolean).length
  const pattern = correct.map((c) => (c ? '\u25A0' : '\u25A1')).join('')
  return [`MyBibleGem \u00B7 ${title}`, `${n}/${correct.length} correct  ${pattern}`, url].filter(Boolean).join('\n')
}

/** The public address of this app, or undefined for local files and previews without one. */
export function appUrl(): string | undefined {
  if (typeof location === 'undefined' || !/^https?:$/.test(location.protocol) || /^(localhost|127\.)/.test(location.hostname)) return undefined
  return location.origin + location.pathname
}

export async function shareResult(text: string): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  try {
    if (typeof navigator.share === 'function') { await navigator.share({ text }); return 'shared' }
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return 'cancelled'
  }
  try { await navigator.clipboard.writeText(text); return 'copied' } catch { return 'failed' }
}
