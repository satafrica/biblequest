import { expect, test, type Page } from '@playwright/test'

// Record speech, vibration and share calls instead of producing real output.
async function instrument(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>
    w.__spoken = []; w.__vibrations = []; w.__shared = []
    class FakeUtterance { text: string; rate = 1; lang = ''; voice: unknown = null; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(t: string) { this.text = t } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: FakeUtterance, configurable: true })
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      speak: (u: FakeUtterance) => { (w.__spoken as string[]).push(u.text) },
      cancel: () => {}, getVoices: () => [], speaking: false,
    } })
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: (p: unknown) => { (w.__vibrations as unknown[]).push(p); return true } })
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (d: { text: string }) => { (w.__shared as string[]).push(d.text) } })
  })
}
const get = (page: Page, k: string) => page.evaluate((key) => (window as unknown as Record<string, unknown>)[key], k)

async function answer(page: Page, which: 'first' | 'correct' | 'wrong' = 'first') {
  const options = page.getByRole('group', { name: 'Answer options' })
  await expect(options).toBeVisible()
  await options.getByRole('button').first().click()
  void which
}
async function finishRound(page: Page) {
  for (let i = 0; i < 20; i++) {
    const options = page.getByRole('group', { name: 'Answer options' })
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

test('after answering, the KJV verse is shown and can be read aloud; answers vibrate', async ({ page }) => {
  await instrument(page)
  await page.goto(`./#/game/${encodeURIComponent('scripture:1:1')}`)
  await page.getByRole('button', { name: 'Read question aloud' }).click()
  const prompt = await page.locator('#q-heading').textContent()
  expect(((await get(page, '__spoken')) as string[]).join(' ')).toContain(prompt!.slice(0, 20))
  await answer(page)
  const verse = page.getByTestId('verse-text')
  await expect(verse).toBeVisible()
  await expect(verse).toContainText('King James Version')
  expect(((await get(page, '__vibrations')) as unknown[]).length).toBe(1)
  await page.getByRole('button', { name: 'Read aloud', exact: true }).click()
  const spoken = ((await get(page, '__spoken')) as string[]).join(' ')
  expect(spoken).toMatch(/Correct\.|Not quite\./)
})

test('vibration can be turned off and questions can be read automatically', async ({ page }) => {
  await instrument(page)
  await page.goto('./#/settings')
  await page.getByLabel(/Vibration/).uncheck()
  await page.getByLabel(/Read each question aloud automatically/).check()
  await page.goto(`./#/game/${encodeURIComponent('picture:1:1')}`)
  await expect(page.locator('#q-heading')).toBeVisible()
  await expect.poll(async () => ((await get(page, '__spoken')) as string[]).length).toBeGreaterThan(0)
  await answer(page)
  await expect(page.getByTestId('verse-text')).toBeVisible()
  expect(((await get(page, '__vibrations')) as unknown[]).length).toBe(0)
})

test('missed questions appear in Review my mistakes; streak and calendar update; results can be shared', async ({ page }) => {
  await instrument(page)
  await page.goto('./')
  await expect(page.getByTestId('review-card')).toContainText('Nothing to review')
  await expect(page.getByTestId('streak-card')).toContainText('0 days')

  await page.goto(`./#/game/${encodeURIComponent('picture:1:1')}`)
  await finishRound(page)
  const heading = (await page.getByRole('heading', { name: /of \d+ correct/ }).textContent())!
  const [right, total] = heading.match(/(\d+) of (\d+)/)!.slice(1).map(Number)

  await page.getByRole('button', { name: 'Share result' }).click()
  const shared = ((await get(page, '__shared')) as string[])[0]
  expect(shared).toContain(`${right}/${total} correct`)
  expect(shared).toMatch(/^BibleQuest · Picture Bible Quiz/)
  expect(shared.split('\n').length).toBe(2) // no URL on localhost, and no answers

  await page.goto('./')
  await expect(page.getByTestId('streak-card')).toContainText('1 day')
  const missed = total - right
  if (missed > 0) {
    await expect(page.getByTestId('review-card')).toContainText(`${missed} question`)
    await page.getByTestId('review-card').click()
    await expect(page.getByText('Review My Mistakes').first()).toBeVisible()
    await expect(page.getByRole('group', { name: 'Answer options' })).toBeVisible()
  }
  await page.goto('./#/profile')
  await expect(page.getByTestId('streak-calendar')).toContainText('Current streak 1')
})

test('privacy and terms pages describe real data handling and are linked', async ({ page }) => {
  await page.goto('./#/privacy')
  await expect(page.getByRole('heading', { name: 'Privacy policy' })).toBeVisible()
  await expect(page.getByText('You are using the offline preview')).toBeVisible()
  await expect(page.getByText(/no advertising/i).first()).toBeVisible()
  await page.goto('./#/terms')
  await expect(page.getByRole('heading', { name: 'Terms of use' })).toBeVisible()
  await expect(page.getByText(/no monetary value/)).toBeVisible()
  await page.goto('./#/settings')
  await page.getByRole('link', { name: 'Privacy', exact: true }).last().click()
  await expect(page).toHaveURL(/#\/privacy/)
  // account deletion is only offered with the online backend
  await page.goto('./#/profile')
  await expect(page.getByRole('button', { name: 'Delete my account' })).toHaveCount(0)
})

test('players can choose Old Testament, New Testament or the whole Bible', async ({ page }) => {
  const OT = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi']
  const isOT = (ref: string) => OT.some((b) => ref.startsWith(b + ' '))
  await page.goto('./#/play')
  const picker = page.getByTestId('testament-picker')
  await expect(picker.getByRole('radio', { name: 'Whole Bible' })).toHaveAttribute('aria-checked', 'true')
  await picker.getByRole('radio', { name: 'New Testament' }).click()
  await expect(picker.getByRole('radio', { name: 'New Testament' })).toHaveAttribute('aria-checked', 'true')

  // the choice carries into a game's level list and is remembered after reload
  await page.goto('./#/play/picture'); await page.reload()
  await expect(page.getByTestId('testament-picker').getByRole('radio', { name: 'New Testament' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText(/questions from the New Testament at this level/)).toBeVisible()
  const level1 = page.getByRole('link', { name: /Level 1/ }).first()
  await expect(level1).toHaveAttribute('href', /picture%3A\d%3A1%3Ant$/)
  await level1.click()
  await expect(page.getByText(/New Testament/).first()).toBeVisible()
  for (let i = 0; i < 3; i++) {
    await page.getByRole('group', { name: 'Answer options' }).getByRole('button').first().click()
    const ref = (await page.getByTestId('answer-reference').textContent())!
    expect(isOT(ref), ref).toBe(false)
    await page.getByRole('button', { name: /Next question|See results/ }).click()
  }

  // Old Testament from Settings applies to the Arena
  await page.goto('./#/settings')
  await page.getByText('Old Testament', { exact: true }).click()
  await page.goto('./#/arena')
  await expect(page.getByTestId('testament-picker').getByRole('radio', { name: 'Old Testament' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('link', { name: 'Enter' }).first().click()
  await expect(page.getByText(/Old Testament/).first()).toBeVisible()
  await page.getByRole('group', { name: 'Answer options' }).getByRole('button').first().click()
  expect(isOT((await page.getByTestId('answer-reference').textContent())!)).toBe(true)
})
