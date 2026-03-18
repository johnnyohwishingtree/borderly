import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import * as path from 'path';

/**
 * Screenshot capture test for visual auditing.
 *
 * Run manually with:
 *   E2E_PROJECT=screenshot-capture npx playwright test captureScreenshots --project=screenshot-capture
 *
 * Captures numbered screenshots of every key screen to e2e/screenshots/
 * for use with the /visual-audit skill.
 *
 * NOTE: React Navigation on web converts screen navigations to URL changes.
 * webpack-dev-server doesn't handle SPA routing, so navigating between screens
 * via button clicks causes "Cannot GET /path" errors. To work around this,
 * each test captures a single screen state by injecting the right app state
 * and loading the page fresh.
 */

const SCREENSHOT_DIR = path.resolve(__dirname, '../screenshots');

async function screenshot(page: Page, name: string) {
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
}

function injectOnboardedState(page: Page) {
  return page.addInitScript(() => {
    (window as any).__BORDERLY_STATE__ = {
      preferences: { onboardingComplete: true },
      mmkv: {
        'current_profile_id': 'screenshot-profile-1',
        'family_profiles': JSON.stringify({
          profiles: {
            'screenshot-profile-1': {
              id: 'screenshot-profile-1',
              relationship: 'self',
              displayName: 'John Smith',
              createdAt: '2026-01-01T00:00:00Z',
            },
          },
          primaryProfileId: 'screenshot-profile-1',
        }),
      },
      profiles: {
        'screenshot-profile-1': {
          id: 'screenshot-profile-1',
          surname: 'SMITH',
          givenNames: 'JOHN',
          passportNumber: 'AB1234567',
          nationality: 'USA',
          dateOfBirth: '1990-01-15',
          gender: 'M',
          passportExpiry: '2030-12-31',
          issuingCountry: 'USA',
        },
      },
    };
  });
}

test.describe('Screenshot Capture for Visual Audit', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
  });

  // --- Onboarding Screens ---

  test('01 - Welcome Screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 15000 });
    await screenshot(page, '01-welcome-screen');
  });

  test('04 - Passport Scan Method Selection', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await expect(page.getByText(/Quick Passport Scan/)).toBeVisible({ timeout: 10000 });
    await screenshot(page, '04-passport-scan-method');
  });

  test('05 - Passport Manual Entry Form (empty)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await expect(page.getByText(/Quick Passport Scan/)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Or enter manually' }).click();
    await expect(page.getByText('Passport Details')).toBeVisible({ timeout: 5000 });
    await screenshot(page, '05-passport-manual-form');
  });

  test('06 - Passport Form Filled', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await expect(page.getByText(/Quick Passport Scan/)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Or enter manually' }).click();
    await expect(page.getByText('Passport Details')).toBeVisible({ timeout: 5000 });

    await page.getByTestId('passport-number-input').fill('AB1234567');
    await page.getByTestId('surname-input').fill('SMITH');
    await page.getByTestId('given-names-input').fill('JOHN');
    await page.getByTestId('nationality-input-trigger').click();
    await page.getByTestId('nationality-input-search').fill('United States');
    await page.getByTestId('nationality-input-option-USA').click();
    await page.getByTestId('dob-input').fill('1990-01-15');
    await page.getByTestId('gender-Male-button').click();
    await page.getByTestId('passport-expiry-input').fill('2030-12-31');
    await page.getByTestId('issuing-country-input-trigger').click();
    await page.getByTestId('issuing-country-input-search').fill('United States');
    await page.getByTestId('issuing-country-input-option-USA').click();
    await screenshot(page, '06-passport-form-filled');
  });

  test('07 - Confirm Profile Screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await expect(page.getByText(/Quick Passport Scan/)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Or enter manually' }).click();

    await page.getByTestId('passport-number-input').fill('AB1234567');
    await page.getByTestId('surname-input').fill('SMITH');
    await page.getByTestId('given-names-input').fill('JOHN');
    await page.getByTestId('nationality-input-trigger').click();
    await page.getByTestId('nationality-input-search').fill('United States');
    await page.getByTestId('nationality-input-option-USA').click();
    await page.getByTestId('dob-input').fill('1990-01-15');
    await page.getByTestId('gender-Male-button').click();
    await page.getByTestId('passport-expiry-input').fill('2030-12-31');
    await page.getByTestId('issuing-country-input-trigger').click();
    await page.getByTestId('issuing-country-input-search').fill('United States');
    await page.getByTestId('issuing-country-input-option-USA').click();

    await page.getByTestId('passport-continue-button').click();
    await expect(page.getByText('Confirm Your Profile')).toBeVisible({ timeout: 10000 });
    await screenshot(page, '07-confirm-profile');
  });

  // --- Main App Screens ---

  test('09 - Trip List (empty)', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await screenshot(page, '09-trip-list-empty');
  });

  test('10 - Create Trip Screen', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.getByTestId('create-first-trip-button').click();
    await expect(page.getByText('Create New Trip')).toBeVisible({ timeout: 10000 });
    await screenshot(page, '10-create-trip');
  });

  // --- Tab Screens ---

  test('12 - Wallet Screen', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    // Use Playwright click with noWaitAfter to prevent waiting for navigation
    await page.getByRole('tab', { name: 'QR Wallet tab' }).click({ noWaitAfter: true });
    await page.waitForTimeout(2000);
    await screenshot(page, '12-wallet-screen');
  });

  test('13 - Profile Screen', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('tab', { name: 'Profile tab' }).click({ noWaitAfter: true });
    await page.waitForTimeout(2000);
    await screenshot(page, '13-profile-screen');
  });

  test('14 - Settings Screen', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('tab', { name: 'Settings tab' }).click({ noWaitAfter: true });
    await page.waitForTimeout(2000);
    await screenshot(page, '14-settings-screen');
  });
});
