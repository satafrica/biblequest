import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { installMonitor } from './lib/monitor'

installMonitor()

// Offline support. Some embedded previews forbid service workers, so failures are ignored.
window.addEventListener('load', () => {
  try { navigator.serviceWorker?.register('./sw.js').catch(() => {}) } catch { /* not allowed here */ }
})
// When a newly published version takes over from an older saved copy, reload once so the
// player sees it straight away instead of on the next visit. Gems and progress are saved, so nothing is lost.
try {
  const sw = navigator.serviceWorker
  if (sw && sw.controller) {
    let reloaded = false
    sw.addEventListener('controllerchange', () => {
      if (reloaded) return
      reloaded = true
      window.location.reload()
    })
  }
} catch { /* service workers unavailable */ }
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
