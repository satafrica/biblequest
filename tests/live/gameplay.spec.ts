import { expect, test, type Page } from '@playwright/test'
import { writeFileSync } from 'node:fs'

// Live check of the gameplay upgrades against the real Supabase project.
// Requires picture questions to be (temporarily) published.
async function balance(page: Page) {
  const l = await page.getByRole('link', { name: /Gem balance:/ }).getAttribute('aria-label')
  return Number(l!.match(/Gem balance: (\d+)/)![1])
}

async function playRound(page: Page, key: string, pick: 'first' | 'last') {
  await page.goto(`./#/game/${encodeURIComponent(key)}`)
  const options = page.getByRole('group', { name: 'Answer options' })
  let verses = 0, answered = 0
  for (let i = 0; i < 20; i++) {
    await expect(options).toBeVisible({ timeout: 15000 })
    const btns = options.getByRole('button')
    await (pick === 'first' ? btns.first() : btns.last()).click()
    const next = page.getByRole('button', { name: /Next question|See results/ })
    await expect(next).toBeVisible({ timeout: 15000 }); answered++
    if (await page.getByTestId('verse-text').isVisible()) verses++
    const last = (await next.textContent())!.includes('See results')
    await next.click(); if (last) break
  }
  await expect(page.getByRole('heading', { name: /of \d+ correct/ })).toBeVisible({ timeout: 15000 })
  return { answered, verses }
}

test('guest: verse after answers, streak, review, delete account', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  await expect.poll(() => balance(page), { timeout: 15000 }).toBe(0)

  const round = await playRound(page, 'picture:1:1', 'first')
  const shareVisible = await page.getByRole('button', { name: /Share result/ }).isVisible()

  await page.goto('./')
  const streak = page.getByTestId('streak-card')
  await expect(streak).toBeVisible({ timeout: 15000 })
  await expect(streak).toContainText('1 day')
  const review = page.getByTestId('review-card')
  await expect(review).toBeVisible()
  const reviewText = (await review.textContent()) ?? ''

  let reviewRound: { answered: number; verses: number } | null = null
  if (/review/i.test(reviewText) && (await review.evaluate((el) => el.tagName)) === 'A') {
    reviewRound = await playRound(page, 'review', 'last')
  }

  await page.goto('./#/profile')
  await expect(page.getByTestId('streak-calendar')).toBeVisible({ timeout: 15000 })
  const gemsBefore = await balance(page)
  await page.getByRole('button', { name: 'Delete my account' }).click()
  const dlg = page.getByRole('dialog', { name: 'Delete your account?' })
  await dlg.getByLabel('Type DELETE to confirm').fill('DELETE')
  await dlg.getByRole('button', { name: 'Delete permanently' }).click()
  await expect(page.getByText('Account deleted')).toBeVisible({ timeout: 15000 })
  await page.goto('./'); await page.reload()
  await expect.poll(() => balance(page), { timeout: 15000 }).toBe(0)

  writeFileSync('tests/live/gameplay.json', JSON.stringify({ round, shareVisible, reviewText, reviewRound, gemsBefore, errors }, null, 1))
  expect(round.verses).toBe(round.answered)
  expect(errors).toEqual([])
})
