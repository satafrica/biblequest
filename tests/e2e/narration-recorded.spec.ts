import { expect, test, type Page } from '@playwright/test'

/*
 * Recorded narration in Who Am I?, on the ONLINE site (skipped unless BASE_URL is set).
 * Checks that read-aloud plays the recordings part by part (prompt + clue 1, then the options),
 * that a newly revealed clue has its own recording, that feedback uses "Correct."/"Not quite."
 * plus the answer, and that turning the setting off goes back to the device voice.
 * Each test signs up one fresh guest; delete those guests afterwards.
 */
test.skip(!process.env.BASE_URL, 'Needs BASE_URL (online site)')
test.setTimeout(180_000)

async function deviceVoiceSpy(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>
    w.__said = []
    class U { text: string; rate = 1; lang = ''; voice = null; onend: (() => void) | null = null; onerror: ((e: { error: string }) => void) | null = null; constructor(t: string) { this.text = t } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: U, configurable: true })
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [{ name: 'Test', lang: 'en-US', localService: true, voiceURI: 'test', default: true }], speaking: false,
      addEventListener: () => {}, removeEventListener: () => {}, cancel: () => {},
      speak: (u: U) => { (w.__said as string[]).push(u.text); setTimeout(() => u.onend?.(), 5) },
    } })
  })
}
const said = (page: Page) => page.evaluate(() => (window as unknown as { __said: string[] }).__said)

function clipLog(page: Page) {
  const clips: { url: string; status: number }[] = []
  page.on('response', (r) => { if (/\/narration\/whoami\/[0-9a-z]+\.mp3/.test(r.url())) clips.push({ url: r.url(), status: r.status() }) })
  return clips
}
const distinct = (clips: { url: string }[]) => [...new Set(clips.map((c) => c.url.replace(/[?#].*$/, '')))]

test('Who Am I? reads the question, a new clue and the feedback with the recorded voice', async ({ page }) => {
  await deviceVoiceSpy(page)
  const clips = clipLog(page)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`./#/game/${encodeURIComponent('whoami:1:1')}`)
  const options = page.getByRole('group', { name: 'Answer options' })
  await expect(options).toBeVisible({ timeout: 30_000 })

  // Question: prompt + clue 1, then (after it finishes) the options.
  await page.getByRole('button', { name: 'Read question aloud' }).click()
  await expect(page.getByRole('button', { name: 'Stop reading' })).toBeVisible()
  await expect.poll(() => distinct(clips).length, { timeout: 30_000 }).toBeGreaterThanOrEqual(2)
  await expect(page.getByRole('button', { name: 'Read question aloud' })).toBeVisible({ timeout: 40_000 })
  expect(clips.every((c) => c.status === 200 || c.status === 206)).toBe(true)
  expect(await said(page)).toEqual([])

  // Reveal clue 2: reading again plays prompt + clue 1, clue 2, options (3 distinct clips, one new).
  const before = distinct(clips).length
  await page.getByRole('button', { name: /Reveal next clue/ }).click()
  await page.getByRole('button', { name: 'Read question aloud' }).click()
  await expect.poll(() => distinct(clips).length, { timeout: 30_000 }).toBe(before + 1)
  await page.getByRole('button', { name: 'Stop reading' }).click()

  // Feedback: verdict, then answer + reference + verse.
  await options.getByRole('button').first().click()
  const n0 = distinct(clips).length
  await page.getByRole('button', { name: 'Read aloud', exact: true }).click()
  await expect.poll(() => distinct(clips).length, { timeout: 30_000 }).toBeGreaterThanOrEqual(n0 + 2)
  await page.getByRole('button', { name: 'Stop reading' }).click()
  expect(await said(page)).toEqual([])
  expect(errors).toEqual([])
})

test('with the recorded voice turned off, Who Am I? uses the device voice', async ({ page }) => {
  await deviceVoiceSpy(page)
  const clips = clipLog(page)
  await page.goto('./#/settings')
  const box = page.getByLabel(/Use the recorded voice where available/)
  await expect(box).toBeChecked()
  await box.uncheck()
  await page.goto(`./#/game/${encodeURIComponent('whoami:1:1')}`)
  await expect(page.getByRole('group', { name: 'Answer options' })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Read question aloud' }).click()
  await expect.poll(async () => (await said(page)).join(' '), { timeout: 10_000 }).toContain('Clue 1.')
  expect(clips).toEqual([])
})

// Scripture Quiz: five voices take turns, one voice per question. Each question and its feedback
// are read in that question's voice; over a few questions more than one voice is heard.
test('Scripture Quiz reads each question and its feedback in one recorded voice', async ({ page }) => {
  await deviceVoiceSpy(page)
  const clips: { url: string; status: number }[] = []
  page.on('response', (r) => { if (/\/narration\/scripture\/[a-z]+\/[0-9a-z]+\.mp3/.test(r.url())) clips.push({ url: r.url(), status: r.status() }) })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`./#/game/${encodeURIComponent('scripture:1:1')}`)
  const options = page.getByRole('group', { name: 'Answer options' })
  const voiceOf = (u: string) => u.match(/\/narration\/scripture\/([a-z]+)\//)![1]
  const voicesHeard = new Set<string>()
  for (let qn = 0; qn < 4; qn++) {
    await expect(options).toBeVisible({ timeout: 30_000 })
    const i0 = clips.length
    const mine = () => distinct(clips.slice(i0))
    await page.getByRole('button', { name: 'Read question aloud' }).click()
    await expect.poll(() => mine().length, { timeout: 30_000 }).toBeGreaterThanOrEqual(2)
    await page.getByRole('button', { name: 'Stop reading' }).click().catch(() => {})
    const q = mine().length
    await options.getByRole('button').first().click()
    await page.getByRole('button', { name: 'Read aloud', exact: true }).click()
    // The answer detail is new for every question ("Correct."/"Not quite." may come from the cache).
    await expect.poll(() => mine().length, { timeout: 30_000 }).toBeGreaterThanOrEqual(q + 1)
    await page.getByRole('button', { name: 'Stop reading' }).click().catch(() => {})
    const vs = new Set(mine().map(voiceOf))
    expect(vs.size, `one voice per question: ${mine().join(' ')}`).toBe(1)
    voicesHeard.add([...vs][0])
    await page.getByRole('button', { name: /Next question|See results/ }).click()
  }
  expect(clips.every((c) => c.status === 200 || c.status === 206)).toBe(true)
  expect(voicesHeard.size).toBeGreaterThanOrEqual(2)
  expect(await said(page)).toEqual([])
  expect(errors).toEqual([])
})
