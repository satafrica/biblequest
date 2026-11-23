import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/*
 * Guest "keep your progress" message after a round, on the ONLINE site (skipped unless BASE_URL is set).
 * Each test signs up one fresh guest; delete those guests afterwards.
 */
test.skip(!process.env.BASE_URL, 'Needs BASE_URL (online site)')
test.setTimeout(180_000)
const OUT = 'tests/review/guest-prompt'

async function playLevel(page: Page, key: string) {
  await page.goto(`./#/game/${encodeURIComponent(key)}`)
  const options = page.getByRole('group', { name: 'Answer options' })
  for (let i = 0; i < 20; i++) {
    await expect(options).toBeVisible({ timeout: 30_000 })
    await options.getByRole('button').first().click()
    const next = page.getByRole('button', { name: /Next question|See results/ })
    await expect(next).toBeVisible({ timeout: 30_000 })
    const last = (await next.textContent())!.includes('See results')
    await next.click()
    if (last) break
  }
  await expect(page.getByRole('heading', { name: /of \d+ correct/ })).toBeVisible({ timeout: 30_000 })
}

test('guest sees the free-account message after the first round, and it opens Create account', async ({ page }, info) => {
  mkdirSync(OUT, { recursive: true })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await playLevel(page, 'picture:1:1')
  const prompt = page.getByTestId('guest-save-prompt')
  await expect(prompt).toBeVisible({ timeout: 30_000 })
  await expect(prompt.getByRole('heading', { name: 'Keep your progress on any device' })).toBeVisible()
  await expect(prompt).toContainText(/\d+ gems/)
  await expect(prompt).toContainText('no email to confirm')
  await expect(prompt).not.toContainText(/buy|purchase|\$|price/i)
  // Achievement notices (one combined notice) sit clear of the message, its buttons and the header.
  const notice = page.getByTestId('notices').getByRole('status').filter({ hasText: /achievement/i })
  await expect(notice).toHaveCount(1, { timeout: 10_000 })
  await prompt.scrollIntoViewIfNeeded()
  const nb = (await notice.boundingBox())!
  const hb = (await page.getByRole('banner').boundingBox())!
  expect(nb.y).toBeGreaterThanOrEqual(hb.y + hb.height - 1)
  for (const el of [prompt, page.getByRole('link', { name: /Next level/ })]) {
    const b = (await el.boundingBox())!
    const overlap = !(nb.x + nb.width <= b.x || b.x + b.width <= nb.x || nb.y + nb.height <= b.y || b.y + b.height <= nb.y)
    expect(overlap, 'notice must not cover the results').toBe(false)
  }
  await page.screenshot({ path: `${OUT}/${info.project.name}-prompt.png` })
  await prompt.getByRole('link', { name: 'Create free account' }).click()
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
  await expect(page.getByText('Your guest progress, gems and items come with you')).toBeVisible()
  expect(errors).toEqual([])
})

test('"Not now" hides the message, and it stays hidden after the next round', async ({ page }) => {
  await playLevel(page, 'picture:1:1')
  const prompt = page.getByTestId('guest-save-prompt')
  await expect(prompt).toBeVisible({ timeout: 30_000 })
  await prompt.getByRole('button', { name: 'Not now' }).click()
  await expect(prompt).toHaveCount(0)
  await playLevel(page, 'picture:1:2')
  await expect(page.getByText(/Gems this round/)).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('guest-save-prompt')).toHaveCount(0)
  await page.reload()
  await expect(page.getByTestId('guest-save-prompt')).toHaveCount(0)
})
