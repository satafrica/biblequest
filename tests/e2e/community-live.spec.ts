import { expect, test, type Browser, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/*
 * Community screenshot test with two REGISTERED accounts on the online site.
 * Runs only when these are set (it is skipped otherwise, including in local runs):
 *   COMMUNITY_A_EMAIL, COMMUNITY_A_PASSWORD, COMMUNITY_B_EMAIL, COMMUNITY_B_PASSWORD
 * The two accounts must exist, be confirmed, have no friends, groups or matches yet,
 * and should have the display names in NAME_A / NAME_B (or set COMMUNITY_A_NAME / COMMUNITY_B_NAME).
 * Screenshots go to tests/review/community-live/. The test deletes the group (which also
 * deletes the group's match and results) and the friendship it made, so it can run again.
 */
const A = { email: process.env.COMMUNITY_A_EMAIL ?? '', password: process.env.COMMUNITY_A_PASSWORD ?? '', name: process.env.COMMUNITY_A_NAME ?? 'Test Player A' }
const B = { email: process.env.COMMUNITY_B_EMAIL ?? '', password: process.env.COMMUNITY_B_PASSWORD ?? '', name: process.env.COMMUNITY_B_NAME ?? 'Test Player B' }
const OUT = 'tests/review/community-live'
const GROUP = 'Screenshot Test Group'
const groupCard = new RegExp(`^${GROUP} \\d+ members?`)

test.skip(!A.email || !A.password || !B.email || !B.password, 'Needs two registered test accounts (COMMUNITY_A_* and COMMUNITY_B_*)')
test.setTimeout(300_000)

/** Waits for the network and for fade-in animations to finish, so dialogs are captured fully opaque. */
async function shot(page: Page, name: string, fullPage = true) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))))
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage })
}

async function signedIn(browser: Browser, who: typeof A, use: Record<string, unknown>) {
  const ctx = await browser.newContext(use)
  const page = await ctx.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('dialog', (d) => d.accept())
  await page.goto('./#/account')
  await page.getByRole('tab', { name: 'Sign in' }).click()
  await page.getByLabel('Email').fill(who.email)
  await page.getByLabel('Password').fill(who.password)
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/#\/profile/, { timeout: 30_000 })
  return { ctx, page, errors }
}

async function finishRound(page: Page) {
  for (let i = 0; i < 20; i++) {
    const opts = page.getByRole('group', { name: 'Answer options' })
    const order = page.getByRole('button', { name: 'Check order' })
    const scene = page.getByTestId('hidden-scene')
    await expect(opts.or(order).or(scene).first()).toBeVisible()
    if (await order.isVisible()) await order.click()
    else if (await scene.isVisible()) {
      await expect(scene.locator('img')).toBeVisible()
      const b = (await scene.locator('button[data-area]').first().boundingBox())!
      await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
    } else await opts.getByRole('button').first().click()
    const btn = page.getByRole('button', { name: /Next question|See results/ })
    await expect(btn).toBeVisible()
    const last = (await btn.textContent())!.includes('See results')
    await btn.click()
    if (last) break
  }
  await expect(page.getByRole('heading', { name: /of \d+ correct/ })).toBeVisible()
}

const codeOf = async (page: Page, label: string) =>
  ((await page.getByRole('button', { name: new RegExp(`^Copy ${label} `) }).first().getAttribute('aria-label'))!).split(' ').pop()!

test('community with two registered accounts: friends, group, moderator and a challenge match', async ({ browser }, info) => {
  mkdirSync(OUT, { recursive: true })
  const use = info.project.use as Record<string, unknown>
  const a = await signedIn(browser, A, use)
  const b = await signedIn(browser, B, use)

  // 1. A opens Community: no gate, empty lists, own friend code.
  await a.page.goto('./#/community')
  await expect(a.page.getByTestId('community-gate')).toHaveCount(0)
  await expect(a.page.getByRole('heading', { name: 'Friends', exact: true })).toBeVisible()
  const friendCode = await codeOf(a.page, 'Friend code')
  expect(friendCode).toMatch(/^[A-Z0-9]{6,10}$/)
  await shot(a.page, '01-community-empty')

  // 2. B sends A a friend request with the code.
  await b.page.goto('./#/community')
  await b.page.getByLabel('Add a friend by code').fill(friendCode)
  await b.page.getByRole('button', { name: 'Send request' }).click()
  await expect(b.page.getByText(`Waiting for: ${A.name}`)).toBeVisible()
  await shot(b.page, '02-request-sent')

  // 3. A sees and accepts the request; B shows on the weekly friends board.
  await a.page.reload()
  await expect(a.page.getByText('Requests for you')).toBeVisible()
  await expect(a.page.getByText(B.name)).toBeVisible()
  await shot(a.page, '03-request-received')
  await a.page.getByRole('button', { name: 'Accept' }).click()
  await expect(a.page.getByTestId('friends-board').getByText(B.name)).toBeVisible()
  await shot(a.page, '04-friends-board')

  // 4. A creates a group.
  await a.page.getByPlaceholder('Group name').fill(GROUP)
  await a.page.getByPlaceholder('Description (optional)').fill('Created by the automated Community test')
  await a.page.getByRole('button', { name: 'Create group' }).click()
  await expect(a.page.getByRole('heading', { name: GROUP })).toBeVisible()
  const invite = await codeOf(a.page, 'Invite code')
  await shot(a.page, '05-group-created')

  // 5. B joins with the invite code.
  await b.page.goto('./#/community')
  await b.page.getByLabel('Join a group by invite code').fill(invite)
  await b.page.getByRole('button', { name: 'Join', exact: true }).click()
  await expect(b.page.getByRole('heading', { name: GROUP })).toBeVisible()
  await expect(b.page.getByTestId('group-members').locator('li')).toHaveCount(2)
  await shot(b.page, '06-group-joined')

  // 6. A makes B a moderator.
  await a.page.reload()
  await a.page.getByRole('button', { name: 'Make moderator' }).click()
  await expect(a.page.getByTestId('group-members').getByText('moderator', { exact: true })).toBeVisible()
  await shot(a.page, '07-moderator')

  // 7. A creates a group match and plays it.
  await a.page.getByRole('button', { name: 'Create match' }).click()
  await expect(a.page.getByText(/Challenge match · /)).toBeVisible()
  const match = await codeOf(a.page, 'Challenge code')
  await shot(a.page, '08-match-created')
  await a.page.getByRole('link', { name: 'Play now' }).click()
  await finishRound(a.page)
  await shot(a.page, '09-match-round-done')

  // 8. B opens the match by code, plays, and sees both scores.
  await b.page.goto('./#/community')
  await b.page.getByLabel('Enter a challenge code').fill(match)
  await b.page.getByRole('button', { name: 'Open' }).click()
  await expect(b.page.getByText(`Challenge match · ${match}`)).toBeVisible()
  await b.page.getByRole('link', { name: 'Play now' }).click()
  await finishRound(b.page)
  await b.page.goto(`./#/community/challenge/${match}`)
  await expect(b.page.getByTestId('challenge-results').locator('li')).toHaveCount(2)
  await expect(b.page.getByTestId('challenge-results').getByText('(you)')).toBeVisible()
  await shot(b.page, '10-match-results')

  // 9. A's Community page now lists the friend, the group and the match.
  await a.page.goto('./#/community')
  await expect(a.page.getByRole('link', { name: groupCard })).toBeVisible()
  await expect(a.page.getByRole('link', { name: new RegExp(match) })).toBeVisible()
  await shot(a.page, '11-community-filled')

  // 10. Report dialog (cancelled, so no report is filed).
  await a.page.getByTestId('friends-board').getByRole('button', { name: `Report ${B.name}` }).click()
  await expect(a.page.getByRole('dialog')).toBeVisible()
  await shot(a.page, '12-report-dialog', false)
  await a.page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()

  // 11. Clean up through the UI: A deletes the group and removes the friend.
  await a.page.getByRole('link', { name: groupCard }).click()
  await a.page.getByRole('button', { name: 'Edit group' }).click()
  await expect(a.page.getByRole('dialog')).toBeVisible()
  await shot(a.page, '13-edit-group', false)
  await a.page.getByRole('dialog').getByRole('button', { name: 'Delete group' }).click()
  await expect(a.page).toHaveURL(/#\/community$/)
  await expect(a.page.getByRole('link', { name: groupCard })).toHaveCount(0)
  await a.page.getByTestId('friends-board').getByRole('button', { name: 'Remove' }).click()
  await expect(a.page.getByTestId('friends-board')).toHaveCount(0)
  await shot(a.page, '14-cleaned-up')

  expect(a.errors, 'page errors for A').toEqual([])
  expect(b.errors, 'page errors for B').toEqual([])
  await a.ctx.close(); await b.ctx.close()
})
