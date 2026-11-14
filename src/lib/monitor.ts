// Privacy-respecting error monitoring. Captures uncaught errors without personal data:
// no answers, emails, tokens or query strings. Sends only if VITE_ERROR_ENDPOINT is set
// (for example a Netlify Function or an error service that accepts JSON); otherwise logs.
const endpoint = import.meta.env.VITE_ERROR_ENDPOINT as string | undefined
const version = import.meta.env.VITE_APP_VERSION as string | undefined
let sent = 0

function scrub(s: string): string {
  return s
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[token]')
    .replace(/\?[^\s)]*/g, '')
    .slice(0, 2000)
}

export function report(err: unknown, context = 'error') {
  const e = err instanceof Error ? err : new Error(String(err))
  const payload = { context, message: scrub(e.message), stack: scrub(e.stack ?? ''), route: location.hash.split('?')[0], version, at: new Date().toISOString() }
  if (!endpoint || sent >= 10) { console.error('[BibleQuest]', payload); return }
  sent++
  try { navigator.sendBeacon?.(endpoint, JSON.stringify(payload)) || fetch(endpoint, { method: 'POST', body: JSON.stringify(payload), keepalive: true }) } catch { /* never throw from the reporter */ }
}

export function installMonitor() {
  window.addEventListener('error', (ev) => report(ev.error ?? ev.message, 'window.error'))
  window.addEventListener('unhandledrejection', (ev) => report(ev.reason, 'unhandledrejection'))
}
