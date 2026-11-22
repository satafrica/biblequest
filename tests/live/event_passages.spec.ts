import { expect, test } from '@playwright/test'
import { writeFileSync } from 'node:fs'
// Live check: Story Sequencing shows the full Scripture behind each event (correct order) after answering.
test('event passages after answering', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./#/game/' + encodeURIComponent(process.env.LEVEL ?? 'sequence:1:1'))
  const out: { events: number; passages: number; cut: boolean; shortBox: number }[] = []
  for (let i = 0; i < 8; i++) {
    const check = page.getByRole('button', { name: 'Check order' })
    await expect(check).toBeVisible({ timeout: 20000 })
    const events = await page.getByRole('list', { name: 'Events to order' }).locator('li').count()
    await check.click()
    const next = page.getByRole('button', { name: /Next question|See results/ })
    await expect(next).toBeVisible({ timeout: 15000 })
    const d = page.getByTestId('event-passages')
    const n = await d.count()
    const items = n ? await d.getByRole('list', { name: 'Scripture for each event' }).locator('> li').count() : 0
    const txt = n ? (await d.textContent()) ?? '' : ''
    if (i === 0) await page.screenshot({ path: 'tests/live/event_passages.png', fullPage: true })
    out.push({ events, passages: items, cut: txt.includes('\u2026'), shortBox: await page.getByTestId('verse-text').count() })
    const last = (await next.textContent())!.includes('See results')
    await next.click(); if (last) break
  }
  const uid = await page.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.includes('auth-token')); return k ? JSON.parse(localStorage.getItem(k)!).user?.id : null })
  writeFileSync('tests/live/event_passages.json', JSON.stringify({ out, uid, errors }, null, 1))
  expect(out.length).toBeGreaterThan(0)
  expect(out.every((o) => o.passages === o.events && !o.cut && o.shortBox === 0)).toBe(true)
  expect(errors).toEqual([])
})
