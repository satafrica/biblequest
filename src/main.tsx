import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { installMonitor } from './lib/monitor'

installMonitor()
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
