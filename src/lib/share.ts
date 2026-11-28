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

/** The public home of MyBibleGem. Invites always point here, even when opened from a preview copy. */
export const SITE_URL = 'https://mybiblegem.com/'

export const APP_SHARE = {
  title: 'MyBibleGem',
  text: 'Free Bible games for adults: picture quizzes, Who Am I?, Scripture challenges and journeys through the whole Bible. No ads, nothing to buy.',
  url: SITE_URL,
}

export type ShareTarget = { title: string; text: string; url: string }

/** Invite links open MyBibleGem with the code already filled in. */
export const inviteUrl = {
  friend: (code: string) => `${SITE_URL}#/community?friend=${encodeURIComponent(code)}`,
  group: (code: string) => `${SITE_URL}#/community?group=${encodeURIComponent(code)}`,
  challenge: (code: string) => `${SITE_URL}#/community/challenge/${encodeURIComponent(code)}`,
}

/** Direct links to common apps. Each opens the app or site with the message ready to send. */
export function shareLinks(t: ShareTarget) {
  const msg = `${t.text} ${t.url}`
  const e = encodeURIComponent
  return {
    whatsapp: `https://wa.me/?text=${e(msg)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${e(t.url)}`,
    email: `mailto:?subject=${e(t.title)}&body=${e(msg)}`,
    sms: `sms:?&body=${e(msg)}`,
  }
}

/** Opens the phone's share menu; falls back to copying the message and link. */
export async function shareTarget(t: ShareTarget): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  try {
    if (typeof navigator.share === 'function') { await navigator.share({ title: t.title, text: t.text, url: t.url }); return 'shared' }
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return 'cancelled'
  }
  try { await navigator.clipboard.writeText(`${t.text} ${t.url}`); return 'copied' } catch { return 'failed' }
}
