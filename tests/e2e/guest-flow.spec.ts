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
    await expect(next).toBeVisible()
    const last = (await next.textContent())!.includes('See results')
    await next.click()
    if (last) break
  }
  await expect(page.getByRole('heading', { name: /of \d+ correct/ })).toBeVisible()
}

test('guest completes a full picture level, earns persistent gems and unlocks a hint', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  await expect(page.getByRole('heading', { name: /Explore Scripture/ })).toBeVisible()
  expect(await balance(page)).toBe(0)

  await playLevel(page, 'picture:1:1')
  await expect(page.getByText('Level completed')).toBeVisible()
  const earned = await balance(page)
  expect(earned).toBeGreaterThanOrEqual(50)

  // Gems survive a reload (device storage in the local preview).
  await page.reload()
  await expect.poll(() => balance(page)).toBe(earned)

  // Replaying the same level earns nothing more.
  await playLevel(page, 'picture:1:1')
  await expect(page.getByText(/Gems are awarded once per question/)).toBeVisible()
  expect(await balance(page)).toBe(earned)

  // Unlock a hint with confirmation.
  await page.goto('./#/rewards')
  await page.getByRole('button', { name: /Unlock Lamp of Insight for 30 gems/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Confirm unlock' })
  await dialog.getByRole('button', { name: 'Unlock for 30 gems' }).click()
  await expect(dialog).toBeHidden()
  await expect.poll(() => balance(page)).toBe(earned - 30)
  expect(errors).toEqual([])
})

test('dark mode and text size apply and persist', async ({ page }) => {
  await page.goto('./#/settings')
  await page.getByRole('radio', { name: 'Dark' }).check({ force: true })
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.getByRole('radio', { name: 'Extra large' }).check({ force: true })
  await expect(page.locator('html')).toHaveAttribute('data-text', /xl|x-large|extra/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('locked content is honest: expert arena, and community needs the online version', async ({ page }) => {
  await page.goto('./#/arena')
  await expect(page.getByRole('link', { name: /Unlock in Gem Rewards/ }).or(page.getByRole('button', { name: /Unlock in Gem Rewards/ }))).toBeVisible()
  await page.goto('./#/community')
  await expect(page.getByTestId('community-gate')).toBeVisible()
  await expect(page.getByTestId('community-gate')).toContainText(/online version|free account/)
})
