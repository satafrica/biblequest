import { expect, test } from '@playwright/test'

test('share MyBibleGem: link, app links and QR code', async ({ page, context }, info) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
  await page.addInitScript(() => { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }) })
  await page.goto('./')
  await page.getByRole('button', { name: 'Share with a friend' }).click()
  const dlg = page.getByRole('dialog', { name: 'Share MyBibleGem' })
  await expect(dlg.getByTestId('share-url')).toHaveText('https://mybiblegem.com/')
  await expect(dlg.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=.*mybiblegem\.com/)
  await expect(dlg.getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', /facebook\.com\/sharer\/sharer\.php\?u=https%3A%2F%2Fmybiblegem\.com%2F/)
  await expect(dlg.getByRole('link', { name: 'Email' })).toHaveAttribute('href', /^mailto:\?subject=MyBibleGem/)
  await expect(dlg.getByRole('link', { name: 'Text message' })).toHaveAttribute('href', /^sms:/)
  await expect(dlg.getByTestId('share-qr')).toBeVisible()
  await expect(dlg.getByRole('link', { name: 'Download QR code' })).toHaveAttribute('download', 'mybiblegem-qr.png')
  await dlg.getByRole('button', { name: 'Copy link' }).click()
  await expect(dlg.getByRole('status')).toContainText(/Link copied|Copy this link/)
  await page.screenshot({ path: `test-results/share-${info.project.name}.png` })
  await page.keyboard.press('Escape')
  // The header share button is on every page.
  await page.goto('./#/play')
  await page.getByRole('banner').getByRole('button', { name: 'Share MyBibleGem' }).click()
  await expect(page.getByRole('dialog', { name: 'Share MyBibleGem' })).toBeVisible()
})

test('link preview tags point to the picture', async ({ page, request }) => {
  await page.goto('./')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://mybiblegem.com/og-image.jpg')
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')
  const img = await request.get('./og-image.jpg')
  expect(img.status()).toBe(200)
  expect(img.headers()['content-type']).toContain('image/jpeg')
})

test('invite link is remembered and explained', async ({ page }) => {
  await page.goto('./#/community?group=ab12cd')
  await expect(page.getByTestId('invite-note')).toContainText('You were invited to join a group')
  await expect(page.getByTestId('invite-note')).toContainText('AB12CD')
  await page.goto('./#/community')
  await expect(page.getByTestId('invite-note')).toContainText('AB12CD')
})
