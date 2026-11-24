import { expect, test } from '@playwright/test'
// Help buttons sit above the answers and stay in the game (also run on drafts with BASE_URL=<draft>).
test('remove two: shown above the answers, no link out of the game', async ({ page }) => {
  await page.goto('./#/game/' + encodeURIComponent('scripture:1:1'))
  const options = page.getByRole('group', { name: 'Answer options' })
  await expect(options).toBeVisible({ timeout: 30000 })
  const helper = page.getByTestId('power-eliminate_two')
  await expect(helper).toContainText(/Remove two wrong answers/)
  expect(await page.getByTestId('helpers').getByRole('link').count()).toBe(0)
  expect((await helper.boundingBox())!.y).toBeLessThan((await options.boundingBox())!.y)
})
