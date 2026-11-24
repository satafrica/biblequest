import { expect, test, type Page } from '@playwright/test'

async function balance(page: Page): Promise<number> {
  const label = await page.getByRole('link', { name: /Gem balance:/ }).getAttribute('aria-label')
  return Number(label!.match(/Gem balance: (\d+)/)![1])
}
async function playLevel(page: Page, key: string) {
  await page.goto(`./#/game/${encodeURIComponent(key)}`)
  const options = page.getByRole('group', { name: 'Answer options' })
  for (let i = 0; i < 20; i++) {
    await expect(options).toBeVisible()
    await options.getByRole('button').first().click()
    const next = page.getByRole('button', { name: /Next question|See results/ })
    const last = (await next.textContent())!.includes('See results')
    await next.click()
    if (last) break
  }
  await expect(page.getByRole('heading', { name: /of \d+ correct/ })).toBeVisible()
}

test('Remove two: unlock and use it inside the game, shown above the answers', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  await expect.poll(() => balance(page)).toBe(0)

  // With no gems, the button says how many more are needed (no link out of the game).
  await page.goto(`./#/game/${encodeURIComponent('scripture:1:1')}`)
  await expect(page.getByTestId('power-eliminate_two')).toContainText(/Remove two wrong answers: earn 40 more gems/)

  await playLevel(page, 'picture:1:1')
  const before = await balance(page)
  expect(before).toBeGreaterThanOrEqual(40)

  await page.goto(`./#/game/${encodeURIComponent('scripture:1:1')}`)
  const options = page.getByRole('group', { name: 'Answer options' })
  await expect(options).toBeVisible()
  const btn = page.getByRole('button', { name: 'Remove two wrong answers for 40 gems' })
  await expect(btn).toBeVisible()
  // The help buttons sit above the answers, so they are seen before choosing.
  const by = (await btn.boundingBox())!.y, oy = (await options.boundingBox())!.y
  expect(by).toBeLessThan(oy)

  await btn.click()
  const dialog = page.getByRole('dialog', { name: 'Remove two wrong answers from this question?' })
  await expect(dialog).toContainText('never cost real money')
  await dialog.getByRole('button', { name: 'Yes, use 40 gems' }).click()
  await expect(dialog).toBeHidden()

  await expect(page.getByTestId('removed-note')).toHaveText(/Pick from the 2 answers left./)
  await expect(options.locator('button[data-state="eliminated"]')).toHaveCount(2)
  await expect(options.locator('button[data-state="eliminated"]').first()).toBeDisabled()
  await expect(options.locator('button[data-state="eliminated"]').first()).toContainText('Removed')
  await expect(options.locator('button:not([disabled])')).toHaveCount(2)
  await expect(page.getByTestId('power-eliminate_two')).toHaveText(/Two wrong answers removed/)
  await expect.poll(() => balance(page)).toBe(before - 40)
  await page.screenshot({ path: `test-results/remove-two-${info.project.name}.png` })

  // Answering works, and the next question offers it again.
  await options.locator('button:not([disabled])').first().click()
  await page.getByRole('button', { name: /Next question/ }).click()
  await expect(page.getByTestId('removed-note')).toHaveCount(0)
  await expect(page.getByTestId('power-eliminate_two')).toBeVisible()

  // Unlocked in Gem Rewards, it is used straight away and shows how many are left.
  await playLevel(page, 'picture:1:2')
  await page.goto('./#/rewards')
  await page.getByRole('button', { name: /Unlock Remove Two Wrong Answers for 40 gems/ }).click()
  await page.getByRole('dialog', { name: 'Confirm unlock' }).getByRole('button', { name: 'Unlock for 40 gems' }).click()
  await page.goto(`./#/game/${encodeURIComponent('whoami:1:1')}`)
  await page.getByRole('button', { name: 'Remove two wrong answers (1 left)' }).click()
  await expect(page.getByRole('group', { name: 'Answer options' }).locator('button[data-state="eliminated"]')).toHaveCount(2)
  expect(errors).toEqual([])
})
