/**
 * Wizard flow Playwright E2E — web mirror of e2e/mobile/full-e2e.test.ts
 *
 * Uses the shared journey definition so this test stays in sync
 * with the mobile E2E. Catches navigation breaks, missing screens,
 * and broken imports without needing iOS simulator.
 *
 * Change the journey → both tests update automatically.
 */
import { test } from '@playwright/test';
import { PlaywrightDriver } from '../shared/playwrightDriver';
import {
  onboardWithDemoPassport,
  selectCountries,
  fillSmartForm,
} from '../shared/journeys';

test.describe('Wizard Flow — onboard → countries → form', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
  });

  test('onboarding to smart form journey', async ({ page }) => {
    await page.goto('/');
    const driver = new PlaywrightDriver(page);

    await onboardWithDemoPassport(driver);
    await selectCountries(driver, ['MYS']);
    // Solo traveler — auto-skips to SmartForm
    await fillSmartForm(driver);
    // TODO: extend to PortalLinks once useSmartForm creates trips properly
  });

  test('multi-country selection reaches smart form', async ({ page }) => {
    await page.goto('/');
    const driver = new PlaywrightDriver(page);

    await onboardWithDemoPassport(driver);
    await selectCountries(driver, ['MYS', 'JPN']);
    await driver.assertVisible('Fill your forms', { timeout: 10000 });
  });
});
