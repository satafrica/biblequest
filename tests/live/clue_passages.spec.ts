import { expect, test } from '@playwright/test'
import { writeFileSync } from 'node:fs'
// Live check: Who Am I? shows the Scripture behind each clue after answering (cloud backend).
test('clue passages after answering', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./#/game/' + encodeURIComponent(process.env.LEVEL ?? 'whoami:4:1'))
  const out: { first: string; passages: number; clueItems: number }[] = []
  for (let i = 0; i < 8; i++) {
    const opts = page.getByRole('group', { name: 'Answer options' })
    await expect(opts).toBeVisible({ timeout: 20000 })
    const first = (await page.getByRole('list', { name: 'Clues' }).locator('li').first().textContent()) ?? ''
    await opts.getByRole('button').first().click()
    const next = page.getByRole('button', { name: /Next question|See results/ })
    await expect(next).toBeVisible({ timeout: 15000 })
    const d = page.getByTestId('clue-passages')
    const passages = await d.count()
    const clueItems = passages ? await d.getByRole('list', { name: 'Scripture for each clue' }).locator('> li').count() : 0
    if (passages && out.filter((o) => o.passages).length === 0) await page.screenshot({ path: 'tests/live/clue_passages.png', fullPage: true })
    out.push({ first, passages, clueItems })
    const last = (await next.textContent())!.includes('See results')
    await next.click(); if (last) break
  }
  const uid = await page.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.includes('auth-token')); return k ? JSON.parse(localStorage.getItem(k)!).user?.id : null })
  writeFileSync('tests/live/clue_passages.json', JSON.stringify({ out, uid, errors }, null, 1))
  expect(out.some((o) => o.passages === 1 && o.clueItems === 4)).toBe(true)
  if (process.env.EXPECT_ALL) expect(out.every((o) => o.passages === 1 && o.clueItems === 4)).toBe(true)
  expect(errors).toEqual([])
})
