import { expect, test } from '@playwright/test'

test('smoke fixture renders, starts and reaches dialog', async ({ page }) => {
  const errors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', error => errors.push(error.stack ?? error.message))

  await page.goto('/')

  await expect(page.getByTestId('vn-start-menu-title'), errors.join('\n')).toHaveText('Smoke Fixture')
  await page.getByTestId('vn-start-menu-start').click()

  await expect(page.getByText('Tester')).toBeVisible()
  await expect(page.getByText('Smoke fixture ready.')).toBeVisible()
})
