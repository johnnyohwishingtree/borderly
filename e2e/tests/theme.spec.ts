/**
 * E2E smoke tests for the theme selector in SettingsScreen.
 *
 * Verifies:
 * 1. The ThemeSelector renders in the Appearance & Language section.
 * 2. All three options (System, Light, Dark) are visible.
 * 3. Toggling between options does not crash the app.
 * 4. The Appearance & Language section heading is visible.
 */

import { test, expect, type Page } from '@playwright/test';
import { baseState, injectState, createErrorTracker } from '../helpers';

// ---------------------------------------------------------------------------
// State factory
// ---------------------------------------------------------------------------

const defaultState = baseState();

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

async function navigateToSettings(page: Page) {
  const settingsTab = page.getByRole('tab', { name: 'Settings tab' });
  await settingsTab.waitFor({ timeout: 5000 });
  await settingsTab.click();
  // Wait for the Settings heading to confirm navigation
  await page.getByText('Settings').first().waitFor({ timeout: 5000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Theme Selector — Settings screen', () => {
  const errorTracker = createErrorTracker();

  test.beforeEach(async ({ page }) => {
    errorTracker.setup(page);
    await injectState(page, defaultState);
    await page.goto('/');
    await navigateToSettings(page);
  });

  test.afterEach(() => {
    errorTracker.assertNoCriticalErrors();
  });

  test('Appearance & Language section heading is visible', async ({ page }) => {
    await expect(page.getByText('Appearance & Language')).toBeVisible({
      timeout: 5000,
    });
  });

  test('Theme label is visible in the Appearance section', async ({ page }) => {
    await expect(page.getByText('Theme')).toBeVisible({ timeout: 5000 });
  });

  test('all theme options are visible in the theme selector', async ({ page }) => {
    await expect(page.getByText('System')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Light').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Dark').first()).toBeVisible({ timeout: 5000 });
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`tapping ${theme} option does not crash the app`, async ({ page }) => {
      const themeBtn = page.getByTestId(`settings-theme-selector-option-${theme}`);
      await themeBtn.waitFor({ timeout: 5000 });
      await themeBtn.click();

      // App should still be functional — Settings heading remains visible
      await expect(page.getByText('Appearance & Language')).toBeVisible({
        timeout: 3000,
      });
    });
  }

  test('tapping System option after Dark does not crash the app', async ({ page }) => {
    // Switch to dark first
    await page.getByTestId('settings-theme-selector-option-dark').click();
    // Then back to system
    await page.getByTestId('settings-theme-selector-option-system').click();

    await expect(page.getByText('Appearance & Language')).toBeVisible({
      timeout: 3000,
    });
  });
});
