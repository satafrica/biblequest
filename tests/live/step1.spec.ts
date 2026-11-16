import { expect, test, type Page } from '@playwright/test'
import { writeFileSync } from 'node:fs'
const EMAIL = process.env.TEST_EMAIL!
async function balance(page: Page) {
  const l = await page.getByRole('link', { name: /Gem balance:/ }).getAttribute('aria-label')
  return Number(l!.match(/Gem balance: (\d+)/)![1])
}
test('guest plays a live level, then adds an email', async ({ page, context }) => {
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  await expect(page.getByRole('heading', { name: /Explore Scripture/ })).toBeVisible()
  await expect.poll(() => balance(page), { timeout: 15000 }).toBe(0)
  await page.goto('./#/game/picture%3A1%3A1')
  const options = page.getByRole('group', { name: 'Answer options' })
  let answered = 0
  for (let i = 0; i < 20; i++) {
    await expect(options).toBeVisible({ timeout: 15000 })
    await options.getByRole('button').first().click()
    const next = page.getByRole('button', { name: /Next question|See results/ })
    await expect(next).toBeVisible({ timeout: 15000 }); answered++
    const last = (await next.textContent())!.includes('See results')
    await next.click(); if (last) break
  }
  await expect(page.getByRole('heading', { name: /of \d+ correct/ })).toBeVisible({ timeout: 15000 })
  const gems = await balance(page)
  await page.reload()
  await expect.poll(() => balance(page), { timeout: 15000 }).toBe(gems)
  await page.goto('./#/account')
  await page.getByLabel('Display name').fill('Live Tester')
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByRole('button', { name: 'Create account' }).last().click()
  const done = page.getByRole('heading', { name: 'You are signed in' }).or(page.getByRole('status')).or(page.getByRole('alert'))
  await expect(done.first()).toBeVisible({ timeout: 15000 })
  const text = await done.first().textContent()
  await context.storageState({ path: 'tests/live/state.json' })
  writeFileSync('tests/live/step1.json', JSON.stringify({ answered, gems, signupMessage: text, errors }))
})
