import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/*
 * Easy sign-in test on the ONLINE site (skipped unless SIGNIN_LIVE=1 and BASE_URL is set).
 * A fresh guest creates an account in one step (no email to confirm), keeps the same player id,
 * signs out, comes back to a Sign in form with the email already filled in, sees a clear message
 * for a wrong password, and signs in. The account email is printed so it can be deleted afterwards.
 * Screenshots go to tests/review/signin/.
 */
const OUT = 'tests/review/signin'
test.skip(!process.env.SIGNIN_LIVE || !process.env.BASE_URL, 'Needs SIGNIN_LIVE=1 and BASE_URL (online site)')
test.setTimeout(120_000)

const sessionUserId = (page: import('@playwright/test').Page) => page.evaluate(() => {
  const k = Object.keys(localStorage).find((x) => /^sb-.*-auth-token$/.test(x))
  return k ? (JSON.parse(localStorage.getItem(k)!).user?.id as string) : null
})

test('guest creates an account in one step, signs out and signs back in', async ({ page }, info) => {
  mkdirSync(OUT, { recursive: true })
  const tag = info.project.name
  const email = `signin-test-${tag}-${Date.now()}@mybiblegem.com`
  const password = 'Gem-Test-2026!'
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('./')
  const headerSignIn = page.getByRole('banner').getByRole('link', { name: 'Sign in' })
  await expect(headerSignIn).toBeVisible({ timeout: 30_000 })
  await page.screenshot({ path: `${OUT}/${tag}-1-home-header.png` })
  // Play one question so the guest has a saved player and progress to carry over.
  await page.goto('./#/game/picture%3A1%3A1')
  const options = page.getByRole('group', { name: 'Answer options' })
  await expect(options).toBeVisible({ timeout: 30_000 })
  await options.getByRole('button').first().click()
  await expect(page.getByRole('button', { name: /Next question|See results/ })).toBeVisible({ timeout: 30_000 })
  await expect.poll(() => sessionUserId(page), { timeout: 30_000 }).not.toBeNull()
  const guestId = await sessionUserId(page)
  await page.goto('./')

  await headerSignIn.click()
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
  await expect(page.getByText('no email to confirm')).toBeVisible()
  await page.getByLabel('Display name').fill('Sign-in Test')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Show' }).click()
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text')
  await page.screenshot({ path: `${OUT}/${tag}-2-create-account.png` })
  await page.locator('form').getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/#\/profile/, { timeout: 30_000 })
  await expect(page.getByText(email)).toBeVisible()
  expect(await sessionUserId(page)).toBe(guestId) // same player: guest progress kept
  await expect(headerSignIn).toHaveCount(0)
  await page.screenshot({ path: `${OUT}/${tag}-3-signed-in-profile.png` })

  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.goto('./#/account')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByLabel('Email')).toHaveValue(email)
  await page.getByLabel('Password', { exact: true }).fill('wrong-password-1')
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toContainText('do not match an account')
  await page.screenshot({ path: `${OUT}/${tag}-4-wrong-password.png` })
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/#\/profile/, { timeout: 30_000 })
  await expect(page.getByText(email)).toBeVisible()
  expect(await sessionUserId(page)).toBe(guestId)
  await page.screenshot({ path: `${OUT}/${tag}-5-signed-back-in.png` })
  console.log(`SIGNIN_TEST_ACCOUNT ${guestId} ${email}`)
  expect(errors).toEqual([])
})
