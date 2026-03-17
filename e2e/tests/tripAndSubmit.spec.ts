import { test, expect } from '@playwright/test';
import { completeOnboarding, createJapanTrip } from '../helpers';

/**
 * Full trip-and-submit E2E test — web equivalent of maestro/flows/trip-and-submit.yaml
 *
 * Phases:
 * 1. Onboarding   — skip tutorial, enter passport manually, confirm profile, skip biometric
 * 2. Create trip  — add Japan destination, fill leg details (dates, flight, accommodation)
 * 3. Trip detail  — open trip card, navigate to Japan leg
 * 4. Leg form     — fill departure city + hotel phone, save progress, mark as ready
 * 5. Submission Guide — reopen leg, open guide, verify profile data and step content
 * 6. Portal       — open in-app submission, verify WebView + toolbar + fields panel
 */

test.describe('Trip and Submit Flow', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
  });

  test('onboarding → create trip → fill form → save → mark ready → submission guide → portal', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/');

    // === PHASE 1: Onboarding ===
    await completeOnboarding(page);

    // === PHASE 2: Create Japan trip ===
    await createJapanTrip(page);

    // === PHASE 3: Open trip detail and navigate to leg form ===
    await page.getByTestId('trip-card-Smith Family Asia').click();
    await expect(page.getByText('Itinerary', { exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByTestId('leg-card-JPN').click();

    // === PHASE 4: Fill leg form ===
    await expect(page.getByText('Travel Form')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('input-departureCity').fill('Los Angeles');
    await page.getByTestId('input-hotelPhone').fill('03-5322-1234');

    await page.getByTestId('save-progress-button').click();

    const markReadyButton = page.getByTestId('mark-ready-button');
    await expect(markReadyButton).toBeVisible({ timeout: 10000 });
    await markReadyButton.click();

    await expect(page.getByText('Itinerary', { exact: true })).toBeVisible({ timeout: 10000 });

    // === PHASE 5: Open Submission Guide ===
    await page.getByTestId('leg-card-JPN').click();
    await expect(page.getByText('Travel Form')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('open-submission-guide-button').click();

    await expect(page.getByText('Submission Guide')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Submission Timing')).toBeVisible();
    await expect(page.getByText(/JOHN MICHAEL SMITH/)).toBeVisible();

    // === PHASE 6: Open Portal Submission ===
    await page.getByRole('button', { name: 'Submit in App' }).click();

    const portalScreen = page.getByTestId('portal-submission-screen');
    await expect(portalScreen).toBeVisible({ timeout: 15000 });
    await expect(portalScreen.getByText('Visit Japan Web', { exact: true })).toBeVisible();
    await expect(portalScreen.getByTestId('toolbar-back-button')).toBeVisible({ timeout: 5000 });
    await expect(portalScreen.getByTestId('toolbar-refresh-button')).toBeVisible();
    await expect(portalScreen.getByText(/Step 1 of/)).toBeVisible();
    await expect(portalScreen.getByTestId('portal-webview')).toBeVisible({ timeout: 15000 });

    await expect(portalScreen.getByTestId('toggle-fields-panel')).toBeVisible({ timeout: 5000 });
    await portalScreen.getByTestId('toggle-fields-panel').click();
    await expect(portalScreen.getByTestId('fields-panel')).toBeVisible({ timeout: 5000 });

    await portalScreen.getByTestId('close-portal-button').click();
    await expect(portalScreen).not.toBeVisible({ timeout: 10000 });
  });
});
