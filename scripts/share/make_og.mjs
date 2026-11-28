// Renders public/og-image.png (then saved as og-image.jpg) (1200×630), the picture shown when a MyBibleGem link is pasted into a message or post.
import { chromium } from '@playwright/test'
import { fileURLToPath } from 'node:url'
const html = new URL('./og.html', import.meta.url)
const out = fileURLToPath(new URL('../../public/og-image.png (then saved as og-image.jpg)', import.meta.url))
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1200, height: 630 } })
await p.goto(html.href, { waitUntil: 'networkidle' })
await p.evaluate(() => document.fonts.ready)
await p.screenshot({ path: out, type: 'png' })
await b.close()
console.log('wrote', out)
