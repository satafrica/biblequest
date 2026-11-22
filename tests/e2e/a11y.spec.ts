import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const theme of ['light', 'dark'] as const) {
  for (const route of ['', 'play', 'play/picture', 'game/picture%3A1%3A1', 'store', 'settings', 'adventures', 'mystery', 'parables', 'master', 'community', 'play/geography', 'game/geography%3A1%3A1', 'game/hidden%3A1%3A1', 'daily', 'arena', 'profile', 'about', 'privacy', 'terms', 'admin']) {
    test(`WCAG A/AA scan: /${route} (${theme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
      await page.goto(`./#/${route}`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(400)
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
      const summary = r.violations.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)
      expect(summary).toEqual([])
    })
  }
}
