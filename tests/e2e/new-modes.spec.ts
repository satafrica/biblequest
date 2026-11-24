import { expect, test, type Page } from '@playwright/test'

async function next(page: Page) {
  const btn = page.getByRole('button', { name: /Next question|See results/ })
  await expect(btn).toBeVisible()
  const last = (await btn.textContent())!.includes('See results')
  await btn.click()
  return last
}
/** Answers whatever kind of question is on screen: options, story order, or a hidden-object picture. */
async function answerAny(page: Page) {
  const opts = page.getByRole('group', { name: 'Answer options' })
  const order = page.getByRole('button', { name: 'Check order' })
  const scene = page.getByTestId('hidden-scene')
  await expect(opts.or(order).or(scene).first()).toBeVisible()
  if (await order.isVisible()) return order.click()
  if (await scene.isVisible()) {
    await expect(scene.locator('img')).toBeVisible()
    const b = (await scene.locator('button[data-area]').first().boundingBox())!
    return page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  }
  await opts.getByRole('button').first().click()
}
async function finishOptions(page: Page) {
  for (let i = 0; i < 20; i++) {
    await answerAny(page)
    if (await next(page)) break
  }
  await expect(page.getByRole('heading', { name: /of \d+ correct/ })).toBeVisible()
}

test('home lists every game mode as playable, with nothing marked in development', async ({ page }) => {
  await page.goto('./')
  for (const name of ['Bible Mystery', 'Bible Geography Explorer', 'Hidden Object Adventure', 'Bible Wisdom Decisions', 'Parables Explorer', 'Bible Master Challenge'])
    await expect(page.getByRole('link', { name: new RegExp(name) }).first()).toBeVisible()
  await expect(page.getByText('In development')).toHaveCount(0)
})

test('geography: a map is shown and a full level can be completed', async ({ page }) => {
  await page.goto('./#/play/geography')
  await expect(page.getByText(/OpenBible\.info/).or(page.getByText(/Each question shows a map/))).toBeVisible()
  await page.getByRole('link', { name: /Level 1/ }).first().click()
  await expect(page.locator('svg[role="img"]').first()).toBeVisible()
  await expect(page.getByText(/Natural Earth/)).toBeVisible()
  await finishOptions(page)
})

test('hidden object: tapping empty space asks to keep looking; tapping an object answers', async ({ page }) => {
  await page.goto('./#/play/hidden')
  await page.getByRole('link', { name: /Level 1/ }).first().click()
  const scene = page.getByTestId('hidden-scene')
  await expect(scene).toBeVisible()
  await expect(page.getByRole('group', { name: 'Answer options' })).toHaveCount(0)
  // A tap on empty picture space is not an answer.
  await expect(scene.locator('img')).toBeVisible()
  await scene.scrollIntoViewIfNeeded()
  const empty = await scene.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const boxes = JSON.parse(el.getAttribute('data-boxes') ?? '[]') as [number, number, number, number][]
    for (let fy = 10; fy < 92; fy += 3) for (let fx = 10; fx < 92; fx += 3) {
      if (boxes.every(([bx, by, bw, bh]) => fx < bx - 5 || fx > bx + bw + 5 || fy < by - 5 || fy > by + bh + 5))
        return { x: r.left + r.width * fx / 100, y: r.top + r.height * fy / 100 }
    }
    return null
  })
  if (empty) {
    await page.mouse.click(empty.x, empty.y)
    await expect(page.getByText(/Nothing to find there/)).toBeVisible()
    await expect(page.getByTestId('hidden-answer')).toHaveCount(0)
  }
  for (let i = 0; i < 20; i++) {
    await expect(scene.locator('img')).toBeVisible()
    const area = scene.locator('button[data-area]').first()
    await scene.scrollIntoViewIfNeeded()
    const b = (await area.boundingBox())!
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
    await expect(page.getByTestId('hidden-answer')).toBeVisible()
    if (await next(page)) break
  }
  await expect(page.getByRole('heading', { name: /of \d+ correct/ })).toBeVisible()
})

test('wisdom decisions: a full level can be completed', async ({ page }) => {
  await page.goto('./#/play/wisdom')
  await expect(page.getByText(/not professional medical, legal or financial advice/)).toBeVisible()
  await page.getByRole('link', { name: /Level 1/ }).first().click()
  await finishOptions(page)
})

test('mystery: case files list, briefing and staged clues', async ({ page }) => {
  await page.goto('./#/mystery')
  await expect(page.getByRole('heading', { name: 'Case files', exact: true })).toBeVisible()
  await page.locator('a[href*="/adventures/"]').first().click()
  await expect(page.getByText(/Case 1/).first()).toBeVisible()
  await page.getByRole('link', { name: /Play case/ }).first().click()
  await expect(page.getByText('Case briefing')).toBeVisible()
  await page.getByRole('button', { name: /Open the case/ }).click()
  await expect(page.getByTestId('case-clue')).toContainText(/Stage 1 of/)
  await finishOptions(page)
})

test('parables: the KJV reading is shown before the questions', async ({ page }) => {
  await page.goto('./#/parables')
  await expect(page.getByRole('heading', { name: 'Parables of Jesus' })).toBeVisible()
  await page.locator('a[href*="/adventures/"]').first().click()
  await page.getByRole('link', { name: /Play parable/ }).first().click()
  await expect(page.getByTestId('chapter-reading')).toBeVisible()
  await page.getByRole('button', { name: /Answer questions/ }).click()
  await finishOptions(page)
})

test('master challenge: twelve expert questions', async ({ page }) => {
  await page.goto('./#/master')
  await expect(page.getByText(/Expert questions from the whole Bible/)).toBeVisible()
  await page.getByRole('link', { name: 'Start' }).click()
  await expect(page.getByText('1/12')).toBeVisible()
  await finishOptions(page)
})
