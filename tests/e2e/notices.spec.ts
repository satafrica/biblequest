import { expect, test } from '@playwright/test'

test('a page notice closes when the player moves to another page', async ({ page }) => {
  await page.goto('./#/profile')
  const name = page.locator('#dn')
  await name.fill('Notice Tester')
  await page.locator('form').filter({ has: name }).getByRole('button', { name: 'Save' }).click()
  // Offline preview: "Profile saved". Online without a session yet: "Not saved" (start a guest session first).
  // Either way it is a page notice and must close on the next page.
  const notice = page.getByRole('status').filter({ hasText: /Profile saved|Not saved/ })
  await expect(notice).toBeVisible()
  await page.goto('./#/settings')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(notice).toHaveCount(0)
  // Going back does not bring the old notice back.
  await page.goto('./#/profile')
  await expect(page.locator('#dn')).toBeVisible()
  await expect(notice).toHaveCount(0)
})
