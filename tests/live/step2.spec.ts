import { expect, test, type Page, chromium } from '@playwright/test'
import { writeFileSync, readFileSync } from 'node:fs'
const EMAIL = process.env.TEST_EMAIL!, PW = process.env.TEST_PW!
async function balance(page: Page) {
  const l = await page.getByRole('link', { name: /Gem balance:/ }).getAttribute('aria-label')
  return Number(l!.match(/Gem balance: (\d+)/)![1])
}
test.use({ storageState: 'tests/live/state.json' })
test('confirmed account sets a password and syncs to a second device', async ({ page, browser }) => {
  const s1 = JSON.parse(readFileSync('tests/live/step1.json', 'utf8'))
  await page.goto('./#/profile')
  await page.reload()
  await page.getByRole('link', { name: 'Change password' }).click()
  await page.getByLabel('New password').fill(PW)
  await page.getByLabel('Repeat password').fill(PW)
  await page.getByRole('button', { name: 'Save password' }).click()
  await expect(page.getByText('Password updated.')).toBeVisible({ timeout: 15000 })
  const gemsA = await balance(page)
  // unlock a hint on device A
  await page.goto('./#/rewards')
  await page.getByRole('button', { name: /Unlock Lamp of Insight for 30 gems/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Confirm unlock' })
  await dialog.getByRole('button', { name: 'Unlock for 30 gems' }).click()
  await expect(dialog).toBeHidden({ timeout: 15000 })
  await expect.poll(() => balance(page), { timeout: 15000 }).toBe(gemsA - 30)
  // device B: brand-new browser context
  const ctxB = await browser.newContext({ storageState: undefined })
  const b = await ctxB.newPage()
  await b.goto('./#/account')
  await b.getByRole('tab', { name: 'Sign in' }).click()
  await b.getByLabel('Email').fill(EMAIL)
  await b.getByLabel('Password').fill(PW)
  await b.getByRole('button', { name: 'Sign in' }).last().click()
  await expect(b).toHaveURL(/#\/profile/, { timeout: 15000 })
  await expect.poll(() => balance(b), { timeout: 15000 }).toBe(gemsA - 30)
  await b.goto('./#/rewards')
  const owned = await b.getByText(/Owned|owned|In inventory|×\s*1|x1/).count()
  writeFileSync('tests/live/step2.json', JSON.stringify({ s1, gemsA, gemsB: await balance(b), ownedMarkers: owned }))
  await ctxB.close()
})
