/**
 * Wizard flow Playwright E2E — web mirror of e2e/mobile/full-e2e.test.ts
 *
 * Uses the shared journey definition so this test stays in sync
 * with the mobile E2E. Catches navigation breaks, missing screens,
 * and broken imports without needing iOS simulator.
 *
 * Change the journey → both tests update automatically.
 */
import { test, expect } from '@playwright/test';
import { PlaywrightDriver } from '../shared/playwrightDriver';
import {
  onboardWithDemoPassport,
  selectCountries,
  fillSmartForm,
  launchPortal,
} from '../shared/journeys';

test.describe('Wizard Flow — onboard → countries → form → portals', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
  });

  test('full onboarding to portal links journey', async ({ page }) => {
    await page.goto('/');
    const driver = new PlaywrightDriver(page);

    await onboardWithDemoPassport(driver);
    await selectCountries(driver, ['Malaysia']);
    // Solo traveler — auto-skips to SmartForm
    await fillSmartForm(driver, [
      { testID: 'input-email', value: 'test@borderly.app' },
      { testID: 'input-phoneNumber', value: '+60123456789' },
    ]);
    await launchPortal(driver, 'MYS');
    // Portal auto-fill uses coordinate taps — skipped in Playwright (no-op)
    // Verify we're on the portal screen
    await expect(page.getByText('Submit to Portal')).toBeVisible({ timeout: 10000 });
  });

  test('multi-country selection flows through all wizard steps', async ({ page }) => {
    await page.goto('/');
    const driver = new PlaywrightDriver(page);

    await onboardWithDemoPassport(driver);
    await selectCountries(driver, ['Malaysia', 'Japan']);

    // SmartForm should show both countries
    await driver.assertVisible('Fill your forms', { timeout: 10000 });
    await driver.assertVisible('Malaysia');
    await driver.assertVisible('Japan');
    await driver.tapById('smart-form-done-button');

    // Portal Links should show both
    await driver.assertVisible('Submit your forms', { timeout: 10000 });
    await driver.assertVisibleId('launch-portal-button-MYS');
    await driver.assertVisibleId('launch-portal-button-JPN');
  });
});
