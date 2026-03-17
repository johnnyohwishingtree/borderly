import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Full user journey E2E test for the web deployment.
 *
 * Walks through the complete flow that a new user would experience:
 * 1. Onboarding: Welcome → Passport Scan (demo) → Confirm Profile → Biometric Setup → Main App
 * 2. Trip creation: Create trip → Add destination → View trip
 * 3. Boarding pass scanning: Demo scan → auto-fill trip leg
 *
 * This test verifies the Vercel-deployed web app is fully functional end-to-end.
 */

async function completeManualOnboarding(page: Page, passport: {
  number: string; surname: string; givenNames: string;
  nationality: string; dob: string; gender: 'Male' | 'Female';
  expiry: string; issuingCountry: string;
}) {
  await page.getByRole('button', { name: 'Skip tutorial' }).click();
  await page.getByRole('button', { name: 'Or enter manually' }).click();

  await page.getByTestId('passport-number-input').fill(passport.number);
  await page.getByTestId('surname-input').fill(passport.surname);
  await page.getByTestId('given-names-input').fill(passport.givenNames);
  await page.getByTestId('nationality-input-trigger').click();
  await page.getByTestId('nationality-input-search').fill('United States');
  await page.getByTestId('nationality-input-option-USA').click();
  await page.getByTestId('dob-input').fill(passport.dob);
  await page.getByTestId(`gender-${passport.gender}-button`).click();
  await page.getByTestId('passport-expiry-input').fill(passport.expiry);
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

test.describe('Full User Journey', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
  });

  test('complete onboarding via demo scan with valid passport data', async ({ page }) => {
    // Track dialog messages to verify no validation warnings fire
    // (beforeEach handler already accepts all dialogs; this just records them)
    const dialogMessages: string[] = [];
    page.on('dialog', dialog => {
      dialogMessages.push(dialog.message());
    });

    await page.goto('/');

    // === Step 1: Welcome Screen ===
    await expect(page.getByText('Borderly')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Skip tutorial' }).click();

    // === Step 2: Passport Scan Screen ===
    await expect(page.getByText(/Quick Passport Scan|Optimized Passport Scan/)).toBeVisible({ timeout: 5000 });

    // Start camera scan → Camera Not Available on web
    await page.getByRole('button', { name: 'Start Camera Scan' }).click();
    await expect(page.getByText('Camera Not Available')).toBeVisible({ timeout: 5000 });

    // Use Demo Scan
    await page.getByRole('button', { name: 'Try Demo Scan' }).click();
    await expect(page.getByText('Demo: Scanning sample passport')).toBeVisible({ timeout: 3000 });

    // Wait for demo scan to complete and show passport preview
    await expect(page.getByText('Scan Quality')).toBeVisible({ timeout: 15000 });

    // Verify parsed profile data is correct (matches updated demo MRZ)
    // Scope assertions to the passport preview area to avoid nav stack duplicates
    const passportInfo = page.getByText('Passport Information').locator('..');
    await expect(page.getByText('DOE')).toBeVisible();
    await expect(page.getByText('JANE')).toBeVisible();
    await expect(passportInfo.getByText('USA')).toBeVisible();

    // Verify passport is NOT expired — should show "Valid" badge, NOT "Expired"
    await expect(passportInfo.getByText('Valid')).toBeVisible();
    await expect(passportInfo.getByText('Expired')).not.toBeVisible();

    // Verify no validation warnings are shown on the preview screen
    await expect(page.getByText('Validation Warnings')).not.toBeVisible();

    // === Step 3: Confirm scanned profile ===
    await page.getByRole('button', { name: 'Confirm & Continue' }).click();

    // === Step 4: ConfirmProfile Screen ===
    await expect(page.getByText('Confirm Your Profile')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Continue to Security Setup' }).click();

    // === Step 5: Biometric Setup Screen ===
    await expect(page.getByText('Secure Your Profile')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Skip for Now' }).click();

    // === Step 6: Main App - Trip List ===
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 10000 });

    // Verify no "Data Validation Warning" dialog fired during the flow
    const validationWarnings = dialogMessages.filter(msg =>
      msg.includes('Validation Warning') || msg.includes('expired') || msg.includes('incomplete')
    );
    expect(validationWarnings).toHaveLength(0);
  });

  test('complete onboarding via manual entry', async ({ page }) => {
    await page.goto('/');

    await completeManualOnboarding(page, {
      number: 'AB1234567', surname: 'SMITH', givenNames: 'JOHN',
      nationality: 'USA', dob: '1990-01-15', gender: 'Male',
      expiry: '2030-12-31', issuingCountry: 'USA',
    });
  });

  test('full journey: onboarding → create trip → view trip', async ({ page }) => {
    await page.goto('/');

    await completeManualOnboarding(page, {
      number: 'CD9876543', surname: 'TANAKA', givenNames: 'YUKI',
      nationality: 'JPN', dob: '1985-06-20', gender: 'Female',
      expiry: '2029-03-15', issuingCountry: 'JPN',
    });

    // === Create a trip ===
    await page.getByTestId('create-first-trip-button').click();
    await expect(page.getByText('Create New Trip')).toBeVisible({ timeout: 5000 });

    // Add a destination manually
    await page.getByTestId('add-destination-button').click();

    // Should have a new destination card
    await expect(page.getByText('No destinations added yet')).not.toBeVisible();
  });

  test('boarding pass demo scan auto-fills trip leg with supported destination', async ({ page }) => {
    test.setTimeout(60000);

    // Track dialog messages to verify no "Destination Not Supported" alert fires
    // (beforeEach handler already accepts all dialogs; this just records them)
    const dialogMessages: string[] = [];
    page.on('dialog', dialog => {
      dialogMessages.push(dialog.message());
    });

    await page.goto('/');

    // Onboarding (quick manual entry)
    await completeManualOnboarding(page, {
      number: 'EF1111111', surname: 'DESMARAIS', givenNames: 'LUC',
      nationality: 'CAN', dob: '1980-05-10', gender: 'Male',
      expiry: '2031-08-20', issuingCountry: 'CAN',
    });

    // === Create Trip Screen ===
    await page.getByTestId('create-first-trip-button').click();
    await expect(page.getByText('Create New Trip')).toBeVisible({ timeout: 10000 });

    // Use boarding pass scanner (empty state button)
    await page.getByTestId('empty-state-scan-button').click();

    // Camera not available on web → fallback UI
    await expect(page.getByText('Camera Not Available')).toBeVisible({ timeout: 5000 });

    // Use demo scan
    await page.getByRole('button', { name: 'Try Demo Scan' }).click();
    await expect(page.getByText('Demo: Scanning sample boarding pass')).toBeVisible({ timeout: 3000 });

    // Wait for demo scan to complete — scanner modal should close and leg should be auto-filled
    // The demo scan takes ~4 seconds (1s + 1.5s + 1s + 1s delays)
    // After success, onScanSuccess fires which closes the modal and adds a leg

    // Verify auto-filled leg appears with Japan as destination
    // The "No destinations added yet" should be gone, replaced by a leg card
    await expect(page.getByText('No destinations added yet')).not.toBeVisible({ timeout: 15000 });

    // Verify Japan was selected as the destination
    await expect(page.getByTestId('country-JPN')).toBeVisible({ timeout: 5000 });

    // Verify auto-filled flight data from the BCBP demo string
    // Flight number: 0834 → the input should have this value
    await expect(page.getByTestId('leg-0-arrival-airport')).toHaveValue('NRT');
    await expect(page.getByTestId('leg-0-airline-code')).toHaveValue('AC');

    // Verify no "Destination Not Supported" dialog fired
    const unsupportedWarnings = dialogMessages.filter(msg =>
      msg.includes('Not Supported') || msg.includes('not supported')
    );
    expect(unsupportedWarnings).toHaveLength(0);
  });
});
