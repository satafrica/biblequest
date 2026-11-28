import { expect, test, type Page } from '@playwright/test'

const KEY = encodeURIComponent('picture:1:1')
async function answer(page: Page, n: number) {
  const options = page.getByRole('group', { name: 'Answer options' })
  for (let i = 0; i < n; i++) {
    await options.getByRole('button').first().click()
    await page.getByRole('button', { name: /Next question/ }).click()
  }
}

test('continue where I left off, or start over', async ({ page }, info) => {
  await page.goto(`./#/game/${KEY}`)
  await expect(page.getByText('1/8')).toBeVisible()
  await answer(page, 2)
  await expect(page.getByText('3/8')).toBeVisible()

  // Home: the main button and a card offer to continue.
  await page.goto('./')
  const card = page.getByTestId('resume-card')
  await expect(card).toContainText('Continue where you left off')
  await expect(card).toContainText('Picture Bible Quiz')
  await expect(card).toContainText('Question 3 of 8')
  await expect(page.getByRole('link', { name: 'Continue where I left off' })).toBeVisible()
  await page.screenshot({ path: `test-results/resume-home-${info.project.name}.png` })

  // Opening the game itself asks first.
  await page.goto(`./#/game/${KEY}`)
  const choice = page.getByTestId('resume-choice')
  await expect(choice).toContainText('You stopped at question 3 of 8')
  await page.screenshot({ path: `test-results/resume-choice-${info.project.name}.png` })
  await choice.getByRole('button', { name: 'Continue where I left off' }).click()
  await expect(page.getByText('3/8')).toBeVisible()
  await answer(page, 1)

  // Play page card, Continue goes straight back without asking.
  await page.goto('./#/play')
  await expect(page.getByTestId('resume-card')).toContainText('Question 4 of 8')
  await page.getByTestId('resume-card').getByRole('link', { name: 'Continue' }).click()
  await expect(page.getByTestId('resume-choice')).toHaveCount(0)
  await expect(page.getByText('4/8')).toBeVisible()

  // Start over from the home card begins again at question 1, and the card goes away.
  await page.goto('./')
  await page.getByTestId('resume-card').getByRole('link', { name: 'Start over' }).click()
  await expect(page.getByText('1/8')).toBeVisible()
  await page.goto('./')
  await expect(page.getByTestId('resume-card')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Start playing' })).toBeVisible()

  // Start over from the in-game question.
  await page.goto(`./#/game/${KEY}`)
  await answer(page, 1)
  await page.goto('./#/play'); await page.goto(`./#/game/${KEY}`)
  await page.getByTestId('resume-choice').getByRole('button', { name: 'Start over' }).click()
  await expect(page.getByText('1/8')).toBeVisible()
})
