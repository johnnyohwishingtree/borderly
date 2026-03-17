/**
 * E2E tests for boarding pass scanning functionality.
 *
 * Navigates through the real app flow: onboarding -> CreateTrip -> scan button.
 * On web, the camera is unavailable so a fallback UI with a demo scan option is shown.
 */

import { test, expect } from '@playwright/test';
import { completeOnboarding } from '../helpers';

test.describe('Boarding Pass Scanner', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
    await page.goto('/');
  });

  test('shows camera not available fallback on web and supports demo scan', async ({ page }) => {
    test.setTimeout(60000);

    await completeOnboarding(page);

    await page.getByTestId('create-first-trip-button').click();
    await page.getByTestId('empty-state-scan-button').click();

    await expect(page.getByText('Camera Not Available')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Try Demo Scan' }).click();
    await expect(page.getByText('Demo: Scanning sample boarding pass')).toBeVisible({ timeout: 10000 });

    await expect(page.getByTestId('leg-0-arrival-airport')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('leg-0-airline-code')).toBeVisible({ timeout: 10000 });
  });
});
