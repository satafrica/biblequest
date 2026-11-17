import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

// Records the first note of every oscillator so the test can tell which sound played.
const recorder = () => {
  const w = window as unknown as { __notes: number[] }
  w.__notes = []
  const orig = AudioParam.prototype.setValueAtTime
  AudioParam.prototype.setValueAtTime = function (v: number, t: number) {
    if (v > 100) w.__notes.push(Math.round(v))
    return orig.call(this, v, t)
  }
}
const notes = (page: Page) => page.evaluate(() => (window as unknown as { __notes: number[] }).__notes.slice())

const KEY: { prompt: string; options: string[]; correct_index: number }[] =
  JSON.parse(readFileSync(new URL('../../src/content/generated/questions.json', import.meta.url), 'utf8'))

async function choose(page: Page, wantCorrect: boolean) {
  const group = page.getByRole('group', { name: 'Answer options' })
  await expect(group).toBeVisible()
  const prompt = (await page.locator('#q-heading').textContent())!.trim()
  const q = KEY.find((k) => k.prompt === prompt)!
  const target = wantCorrect ? q.correct_index : (q.correct_index + 1) % q.options.length
  await page.evaluate(() => { (window as unknown as { __notes: number[] }).__notes = [] })
  await group.getByRole('button').nth(target).click()
  await expect(page.getByRole('button', { name: /Next question|See results/ })).toBeVisible()
  return notes(page)
}

test('a correct answer plays the bright sparkle, a wrong answer plays the low tone', async ({ page }) => {
  await page.addInitScript(recorder)
  await page.goto('./#/game/scripture%3A1%3A1')
  const right = await choose(page, true)
  expect(right).toContain(988) // B5, first note of the correct sparkle
  expect(right).not.toContain(466)
  await page.getByRole('button', { name: /Next question/ }).click()
  const wrong = await choose(page, false)
  expect(wrong).toContain(466) // low tone of the incorrect sound
  expect(wrong).not.toContain(988)
})

test('no sounds play when sound effects are off', async ({ page }) => {
  await page.addInitScript(recorder)
  await page.goto('./#/settings')
  const off = page.getByRole('radio', { name: 'Off' })
  await page.locator('label', { hasText: /^Off$/ }).click()
  await expect(off).toBeChecked()
  await page.goto('./#/game/scripture%3A1%3A2')
  const group = page.getByRole('group', { name: 'Answer options' })
  await expect(group).toBeVisible()
  await page.evaluate(() => { (window as unknown as { __notes: number[] }).__notes = [] })
  await group.getByRole('button').first().click()
  await expect(page.getByRole('button', { name: /Next question|See results/ })).toBeVisible()
  expect(await notes(page)).toEqual([])
})
