import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

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

// Fixed test data — DOB is historical; expiry is far enough in the future to stay valid
const TEST_PASSPORT = {
  number: 'L12345678',
  surname: 'SMITH',
  givenNames: 'JOHN MICHAEL',
  nationality: 'USA',
  dob: '1985-06-15',
  expiry: '2032-03-20',
  issuingCountry: 'USA',
} as const;

async function completeOnboarding(page: Page) {
  await page.getByRole('button', { name: 'Skip tutorial' }).click();
  await page.getByRole('button', { name: 'Enter Manually' }).click();

  await page.getByTestId('passport-number-input').fill(TEST_PASSPORT.number);
  await page.getByTestId('surname-input').fill(TEST_PASSPORT.surname);
  await page.getByTestId('given-names-input').fill(TEST_PASSPORT.givenNames);
  await page.getByTestId('nationality-input').fill(TEST_PASSPORT.nationality);
  await page.getByTestId('dob-input').fill(TEST_PASSPORT.dob);
  await page.getByTestId('gender-Male-button').click();
  await page.getByTestId('passport-expiry-input').fill(TEST_PASSPORT.expiry);
  await page.getByTestId('issuing-country-input').fill(TEST_PASSPORT.issuingCountry);

  await page.getByTestId('passport-continue-button').click();
  await expect(page.getByText('Confirm Your Profile')).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Continue to Security Setup' }).click();
  await expect(page.getByText('Secure Your Profile')).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'Skip for Now' }).click();
  await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 10000 });
}

async function createJapanTrip(page: Page) {
  await page.getByTestId('create-first-trip-button').click();
  await expect(page.getByText('Create New Trip')).toBeVisible({ timeout: 10000 });

  // Add Japan destination
  await page.getByTestId('add-destination-button').click();
  await page.getByTestId('country-JPN').click();

  // Trip name
  await page.getByTestId('trip-name-input').fill('Smith Family Asia');

  // Japan leg details
  await page.getByTestId('leg-0-arrival-date').fill('2026-07-01');
  await page.getByTestId('leg-0-departure-date').fill('2026-07-07');
  await page.getByTestId('leg-0-flight-number').fill('NH101');
  await page.getByTestId('leg-0-airline-code').fill('NH');
  await page.getByTestId('leg-0-arrival-airport').fill('NRT');
  await page.getByTestId('leg-0-accommodation-name').fill('Park Hyatt Tokyo');
  await page.getByTestId('leg-0-accommodation-address').fill('3-7-1-2 Nishi Shinjuku');
  await page.getByTestId('leg-0-accommodation-city').fill('Tokyo');
  await page.getByTestId('leg-0-accommodation-postal-code').fill('163-1055');

  // Create trip
  await page.getByTestId('create-trip-button').click();

  // Handle success alert
  await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
}

test.describe('Trip and Submit Flow', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
  });

  test('onboarding → create trip → fill form → save → mark ready → submission guide → portal', async ({ page }) => {
    // Increase timeout for this long flow
    test.setTimeout(60000);

    await page.goto('/');

    // === PHASE 1: Onboarding ===
    await completeOnboarding(page);

    // === PHASE 2: Create Japan trip ===
    await createJapanTrip(page);

    // === PHASE 3: Open trip detail and navigate to leg form ===
    // Tap the trip card
    await page.getByTestId('trip-card-Smith Family Asia').click();
    await expect(page.getByText('Itinerary', { exact: true })).toBeVisible({ timeout: 10000 });

    // Verify Japan leg card is visible and tap it
    await page.getByTestId('leg-card-JPN').click();

    // === PHASE 4: Fill leg form ===
    await expect(page.getByText('Travel Form')).toBeVisible({ timeout: 15000 });

    // departureCity — the only required field without autoFillSource
    await page.getByTestId('field-departureCity').fill('Los Angeles');

    // hotelPhone — optional but fill for completeness
    await page.getByTestId('field-hotelPhone').fill('03-5322-1234');

    // Save progress
    await page.getByTestId('save-progress-button').click();

    // Wait for success alert to be accepted (dialog handler auto-accepts)
    // Then mark as ready
    const markReadyButton = page.getByTestId('mark-ready-button');
    await expect(markReadyButton).toBeVisible({ timeout: 10000 });
    await markReadyButton.click();

    // After mark ready + alert dismiss, should navigate back to trip detail
    await expect(page.getByText('Itinerary', { exact: true })).toBeVisible({ timeout: 10000 });

    // === PHASE 5: Open Submission Guide ===
    // Tap Japan leg again to get back to the form
    await page.getByTestId('leg-card-JPN').click();
    await expect(page.getByText('Travel Form')).toBeVisible({ timeout: 10000 });

    // Form should be ready — Open Submission Guide button should be visible
    await page.getByTestId('open-submission-guide-button').click();

    // Verify submission guide loaded
    await expect(page.getByText('Submission Guide')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Submission Timing')).toBeVisible();

    // Verify profile data appears
    await expect(page.getByText(/JOHN MICHAEL SMITH/)).toBeVisible();

    // === PHASE 6: Open Portal Submission ===
    await page.getByRole('button', { name: 'Submit in App' }).click();

    // Verify PortalSubmissionScreen renders
    await expect(page.getByTestId('portal-submission-screen')).toBeVisible({ timeout: 15000 });

    // Verify portal header shows Visit Japan Web
    const portalScreen = page.getByTestId('portal-submission-screen');
    await expect(portalScreen.getByText('Visit Japan Web', { exact: true })).toBeVisible();

    // Verify toolbar rendered
    await expect(portalScreen.getByTestId('toolbar-back-button')).toBeVisible({ timeout: 5000 });
    await expect(portalScreen.getByTestId('toolbar-refresh-button')).toBeVisible();

    // Verify step progress
    await expect(portalScreen.getByText(/Step 1 of/)).toBeVisible();

    // Verify WebView loaded
    await expect(portalScreen.getByTestId('portal-webview')).toBeVisible({ timeout: 15000 });

    // Verify fields panel toggle is available
    await expect(portalScreen.getByTestId('toggle-fields-panel')).toBeVisible({ timeout: 5000 });
    await portalScreen.getByTestId('toggle-fields-panel').click();
    await expect(portalScreen.getByTestId('fields-panel')).toBeVisible({ timeout: 5000 });

    // Close portal and verify we're back on trip detail
    await portalScreen.getByTestId('close-portal-button').click();
    await expect(portalScreen).not.toBeVisible({ timeout: 10000 });
  });
});
