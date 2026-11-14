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
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
