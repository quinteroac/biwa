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

test('prebuilt overlays open without visual layout failures', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('vn-start-menu-start').click()
  await expect(page.getByText('Smoke fixture ready.')).toBeVisible()

  await page.getByLabel('Open save menu').click()
  await expect(page.getByRole('dialog', { name: 'Save / Load' })).toBeVisible()
  await page.screenshot({ path: 'test-results/overlay-save-load.png', fullPage: true })
  await page.keyboard.press('Escape')

  await page.getByLabel('Open dialog backlog').click()
  await expect(page.getByRole('dialog', { name: 'Backlog' })).toBeVisible()
  await page.screenshot({ path: 'test-results/overlay-backlog.png', fullPage: true })
  await page.keyboard.press('Escape')

  await page.getByLabel('Open extras and settings menu').click()
  await page.getByRole('menuitem', { name: 'Settings' }).click()
  await expect(page.getByRole('dialog', { name: 'Player settings' })).toBeVisible()
  await page.screenshot({ path: 'test-results/overlay-settings.png', fullPage: true })
  await page.keyboard.press('Escape')

  await page.getByLabel('Open extras and settings menu').click()
  await page.getByRole('menuitem', { name: 'Gallery' }).click()
  await expect(page.getByRole('dialog', { name: 'CG gallery' })).toBeVisible()
  await page.screenshot({ path: 'test-results/overlay-gallery-empty.png', fullPage: true })
  await page.keyboard.press('Escape')

  await page.getByLabel('Open extras and settings menu').click()
  await page.getByRole('menuitem', { name: 'Music' }).click()
  await expect(page.getByRole('dialog', { name: 'Music room' })).toBeVisible()
  await page.screenshot({ path: 'test-results/overlay-music-empty.png', fullPage: true })
})
