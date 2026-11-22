import { expect, test, type Page } from '@playwright/test'

// Simulated device voices: the app should pick the most natural one, honour the player's choice,
// read references naturally, and switch to an offline voice if an online voice fails.
async function voices(page: Page, opts: { failOnline?: boolean } = {}) {
  await page.addInitScript((failOnline) => {
    const w = window as unknown as Record<string, unknown>
    const V = (name: string, lang: string, localService: boolean) => ({ name, lang, localService, voiceURI: 'uri:' + name, default: false })
    const list = [V('Fred', 'en-US', true), V('Microsoft David - English (United States)', 'en-US', true), V('Google US English', 'en-US', false),
      V('Samantha (Enhanced)', 'en-US', true), V('Thomas', 'fr-FR', true)]
    w.__said = []
    class U { text: string; rate = 1; lang = ''; voice: { name: string; localService: boolean } | null = null; onend: (() => void) | null = null; onerror: ((e: { error: string }) => void) | null = null; constructor(t: string) { this.text = t } }
    let queue: U[] = []
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: U, configurable: true })
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => list, speaking: false, addEventListener: () => {}, removeEventListener: () => {},
      cancel: () => { const q = queue; queue = []; q.forEach((u) => u.onerror?.({ error: 'canceled' })) },
      speak: (u: U) => {
        queue.push(u)
        setTimeout(() => {
          if (!queue.includes(u)) return
          queue = queue.filter((x) => x !== u)
          if (failOnline && u.voice && !u.voice.localService) { u.onerror?.({ error: 'network' }); return }
          ;(w.__said as unknown[]).push({ text: u.text, voice: u.voice?.name ?? null }); u.onend?.()
        }, 5)
      },
    } })
  }, opts.failOnline ?? false)
}
const said = (page: Page) => page.evaluate(() => (window as unknown as { __said: { text: string; voice: string | null }[] }).__said)

test('automatic voice is the most natural one; references and LORD are read naturally', async ({ page }) => {
  await voices(page)
  await page.goto('./#/settings')
  const select = page.getByLabel('Narrator voice')
  await expect(select).toBeVisible()
  await expect(select.locator('option')).toHaveCount(5) // automatic + 4 English voices (French excluded)
  await expect(page.getByTestId('narrator-now')).toContainText('Samantha (Enhanced)')
  await page.getByRole('button', { name: 'Test voice' }).click()
  await expect.poll(async () => (await said(page)).length).toBeGreaterThan(0)
  const s = await said(page)
  expect(s.every((x) => x.voice === 'Samantha (Enhanced)')).toBe(true)
  expect(s.map((x) => x.text).join(' ')).toContain('Genesis chapter 1, verse 1')
})

test('a chosen voice is remembered and used in games', async ({ page }) => {
  await voices(page)
  await page.goto('./#/settings')
  await page.getByLabel('Narrator voice').selectOption({ label: 'Microsoft David - English (United States) (en-US)' })
  await page.reload()
  await expect(page.getByLabel('Narrator voice')).toHaveValue('uri:Microsoft David - English (United States)')
  await page.goto(`./#/game/${encodeURIComponent('scripture:1:1')}`)
  await page.getByRole('group', { name: 'Answer options' }).getByRole('button').first().click()
  await page.getByRole('button', { name: 'Read aloud', exact: true }).click()
  await expect.poll(async () => (await said(page)).some((x) => /chapter \d+, verses? \d+/.test(x.text))).toBe(true)
  const s = await said(page)
  expect(s.every((x) => x.voice === 'Microsoft David - English (United States)')).toBe(true)
  expect(s.map((x) => x.text).join(' ')).not.toMatch(/\d+:\d+|LORD|\u2026/)
})

test('if an online voice fails, reading continues with an offline voice', async ({ page }) => {
  await voices(page, { failOnline: true })
  await page.goto('./#/settings')
  await page.getByLabel('Narrator voice').selectOption({ label: 'Google US English (en-US) · needs internet' })
  await expect.poll(async () => (await said(page)).length).toBeGreaterThan(0)
  const s = await said(page)
  expect(s[0].voice).toBe('Samantha (Enhanced)')
  expect(s.map((x) => x.text).join(' ')).toContain('In the beginning God created')
})
