// Screenshots of the share window and an invite note, for visual checks (needs `npm run preview` on :4173).
import { chromium, devices } from '@playwright/test'
const b = await chromium.launch()
for (const [name, opts] of [['phone', devices['Pixel 7']], ['desktop', { viewport: { width: 1280, height: 800 } }]]) {
  const p = await b.newPage(opts)
  await p.goto('http://localhost:4173/'); await p.waitForTimeout(1200)
  await p.getByRole('button', { name: 'Share with a friend' }).click(); await p.waitForTimeout(900)
  await p.screenshot({ path: `/tmp/share-${name}.png` })
  await p.goto('http://localhost:4173/#/community?friend=xy34zz'); await p.waitForTimeout(1200)
  await p.screenshot({ path: `/tmp/invite-${name}.png` })
}
await b.close()
