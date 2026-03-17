/**
 * E2E tests for boarding pass scanning functionality.
 *
 * Navigates through the real app flow: onboarding -> CreateTrip -> scan button.
 * On web, the camera is unavailable so a fallback UI with a demo scan option is shown.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Helper to complete onboarding
async function completeOnboarding(page: Page) {
  await page.getByRole('button', { name: 'Skip tutorial' }).click();
  await page.getByRole('button', { name: 'Enter Manually' }).click();

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
  await page.getByRole('button', { name: 'Continue to Security Setup' }).click();
  await expect(page.getByText('Secure Your Profile')).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'Skip for Now' }).click();
  await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 10000 });
}

test.describe('Boarding Pass Scanner', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
    await page.goto('/');
  });

  test('shows camera not available fallback on web and supports demo scan', async ({ page }) => {
    test.setTimeout(60000);

    // Complete onboarding to reach the trips screen
    await completeOnboarding(page);

    // Navigate to Create Trip
    await page.getByTestId('create-first-trip-button').click();

    // Click the scan boarding pass button (empty state)
    await page.getByTestId('empty-state-scan-button').click();

    // On web, camera is not available — verify fallback UI
    await expect(page.getByText('Camera Not Available')).toBeVisible({ timeout: 10000 });

    // Click the demo scan button
    await page.getByRole('button', { name: 'Try Demo Scan' }).click();

    // Verify demo scan feedback appears
    await expect(page.getByText('Demo: Scanning sample boarding pass')).toBeVisible({ timeout: 10000 });

    // Verify auto-filled leg data from the demo scan
    await expect(page.getByTestId('leg-0-arrival-airport')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('leg-0-airline-code')).toBeVisible({ timeout: 10000 });
  });
});
