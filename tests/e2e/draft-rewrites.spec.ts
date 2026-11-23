import { expect, test, type Page } from '@playwright/test'
// Final check of the 37 rewritten questions on a draft deploy (run with BASE_URL=<draft>).
async function next(page: Page) {
  const btn = page.getByRole('button', { name: /Next question|See results/ })
  await expect(btn).toBeVisible()
  const last = (await btn.textContent())!.includes('See results')
  await btn.click()
  return last
}
async function tapAt(page: Page, fx: number, fy: number) {
  const scene = page.getByTestId('hidden-scene')
  await expect(scene.locator('img')).toBeVisible()
  const r = (await scene.boundingBox())!
  await page.mouse.click(r.x + r.width * fx / 100, r.y + r.height * fy / 100)
}
/** Plays a hidden-object level; for the listed prompts taps the given spot and expects "Correct". */
async function playHidden(page: Page, key: string, spots: Record<string, [number, number]>) {
  await page.goto(`./#/game/${encodeURIComponent(key)}`)
  const hit = new Set<string>()
  for (let i = 0; i < 20; i++) {
    const scene = page.getByTestId('hidden-scene'); await expect(scene).toBeVisible()
    const prompt = Object.keys(spots).find((p) => p)
    let matched: string | undefined
    for (const p of Object.keys(spots)) if (await page.getByText(p, { exact: true }).isVisible()) matched = p
    if (matched) { await tapAt(page, ...spots[matched]); await expect(page.getByText(/^Correct$/)).toBeVisible(); hit.add(matched) }
    else { const b = (await scene.locator('button[data-area]').first().boundingBox())!; await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) }
    void prompt
    if (await next(page)) break
  }
  expect([...hit].sort()).toEqual(Object.keys(spots).sort())
}
test('redrawn areas: left wall of water and the right half of the ark count', async ({ page }) => {
  await playHidden(page, 'hidden:1:6', { 'Find a wall of water.': [10, 8], 'Find the ark.': [55, 25] })
})
test('Noah: any beast leaving the ark counts (zebras)', async ({ page }) => {
  await playHidden(page, 'hidden:2:5', { 'Find a beast going forth out of the ark.': [85, 72] })
})
/** Plays an options level to the results screen; calls look() on each question before answering. */
async function playOptions(page: Page, key: string, look: () => Promise<void>) {
  await page.goto(`./#/game/${encodeURIComponent(key)}`)
  const done = page.getByRole('heading', { name: /of \d+ correct/ })
  for (let i = 0; i < 20; i++) {
    const opts = page.getByRole('group', { name: 'Answer options' })
    await expect(opts.getByRole('button').first()).toBeEnabled()
    await look()
    await opts.getByRole('button').first().click()
    const btn = page.getByRole('button', { name: /Next question|See results/ })
    await expect(btn).toBeVisible()
    const last = (await btn.textContent())!.includes('See results')
    await btn.click()
    if (last) break
  }
  await expect(done).toBeVisible()
}
test('Scripture: 1 Peter 5:7 shows the new choices', async ({ page }) => {
  let seen = false
  await playOptions(page, 'scripture:2:18', async () => {
    if (await page.getByText(/Casting all your care upon him/).isVisible()) {
      const opts = page.getByRole('group', { name: 'Answer options' })
      for (const o of ['1 Peter 5:7', '1 Peter 5:6', '1 Peter 5:10', 'Psalms 55:22']) await expect(opts.getByRole('button', { name: o })).toBeVisible()
      seen = true
    }
  })
  expect(seen).toBe(true)
})
test('Geography: the Dothan question replaces the Gaza repeat', async ({ page }) => {
  let dothan = false
  await playOptions(page, 'geography:2:2', async () => { if (await page.getByText(/Which marker shows Dothan\?/).isVisible()) dothan = true })
  expect(dothan).toBe(true)
})
test('Mystery: the case is now The Spies in Jericho', async ({ page }) => {
  await page.goto('./#/adventures/cases-ot')
  await expect(page.getByText('The Spies in Jericho').first()).toBeVisible()
  await expect(page.getByText('The Spies on the Roof')).toHaveCount(0)
})
