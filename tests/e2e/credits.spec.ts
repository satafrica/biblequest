import { expect, test } from '@playwright/test'

const CREDIT = 'AI-generated illustration, made with Perplexity.'

test('picture questions show the AI illustration credit before and after answering', async ({ page }) => {
  await page.goto('./#/play/picture')
  await page.getByRole('link', { name: /Level 1/ }).first().click()
  const credit = page.getByTestId('ai-credit')
  await expect(credit).toHaveText(CREDIT)
  await page.getByRole('group', { name: 'Answer options' }).getByRole('button').first().click()
  await expect(credit).toContainText(CREDIT)
  await expect(credit).toContainText(/Artistic interpretation|imagined/)
})

test('hidden object scenes show the AI illustration credit', async ({ page }) => {
  await page.goto('./#/play/hidden')
  await page.getByRole('link', { name: /Level 1/ }).first().click()
  await expect(page.getByTestId('hidden-scene')).toBeVisible()
  await expect(page.getByTestId('ai-credit')).toHaveText(CREDIT)
})

test('About page credits Perplexity for the illustrations', async ({ page }) => {
  await page.goto('./#/about')
  const p = page.getByTestId('illustration-credit')
  await expect(p).toContainText('AI-generated, made with Perplexity')
  await expect(p.getByRole('link', { name: 'Perplexity' })).toHaveAttribute('href', 'https://www.perplexity.ai/')
  await expect(page.getByText(/should be confirmed by the owner/)).toHaveCount(0)
})

test('home hero has no picture caption; the footer keeps the AI credit', async ({ page }, info) => {
  await page.goto('./')
  await expect(page.getByText(/Second Temple-era Jerusalem/)).toHaveCount(0)
  await expect(page.getByText(CREDIT)).toHaveCount(0)
  if (info.project.name === 'desktop') await expect(page.getByText('Illustrations are AI-generated, made with Perplexity.')).toBeVisible()
})
