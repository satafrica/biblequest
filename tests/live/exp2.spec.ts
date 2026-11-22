import { expect, test, type Page } from '@playwright/test'
import { writeFileSync } from 'node:fs'
// Live check after content expansion 2 on mybiblegem.com.
async function play(page: Page, key: string, seen: string[]) {
  await page.goto(`./#/game/${encodeURIComponent(key)}`)
  for (let i = 0; i < 20; i++) {
    const seq = page.getByRole('button', { name: 'Check order' })
    const opts = page.getByRole('group', { name: 'Answer options' })
    await expect(seq.or(opts)).toBeVisible({ timeout: 20000 })
    if (await seq.isVisible()) {
      seen.push(...(await page.getByRole('list', { name: 'Events to order' }).locator('li').allTextContents()))
      await seq.click()
    } else {
      seen.push(...(await page.getByRole('list', { name: 'Clues' }).locator('li').allTextContents()))
      await opts.getByRole('button').first().click()
    }
    const next = page.getByRole('button', { name: /Next question|See results/ })
    await expect(next).toBeVisible({ timeout: 15000 })
    const last = (await next.textContent())!.includes('See results')
    await next.click(); if (last) break
  }
  await expect(page.getByRole('heading', { name: /of \d+ correct/ })).toBeVisible({ timeout: 15000 })
}
test('expansion 2 live', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  const body = page.locator('body')
  await expect(body).toContainText(/716 questions/, { timeout: 20000 })
  const countText = (await body.textContent())!.match(/[^.\n]{0,40}716 questions[^.\n]{0,30}/)?.[0]
  const seen: string[] = []
  await play(page, 'whoami:4:1', seen)
  await play(page, 'sequence:3:1', seen)
  const uid = await page.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.includes('auth-token')); return k ? JSON.parse(localStorage.getItem(k)!).user?.id : null })
  writeFileSync('tests/live/exp2.json', JSON.stringify({ countText, seen, uid, errors }, null, 1))
  expect(errors).toEqual([])
})
