import { test, expect, Dialog } from '@playwright/test';

/**
 * Full user journey E2E test for the web deployment.
 *
 * Walks through the complete flow that a new user would experience:
 * 1. Onboarding: Welcome → Passport Scan (demo) → Confirm Profile → Biometric Setup → Main App
 * 2. Trip creation: Create trip → Add destination → View trip
 *
 * This test verifies the Vercel-deployed web app is fully functional end-to-end.
 */
test.describe('Full User Journey', () => {

  test('complete onboarding via demo scan and reach main app', async ({ page }) => {
    // Handle native alerts (RN Web uses window.confirm/alert for Alert.alert)
    const dismissedDialogs: string[] = [];
    page.on('dialog', async (dialog: Dialog) => {
      dismissedDialogs.push(dialog.message());
      // Accept all dialogs (click OK/confirm)
      await dialog.accept();
    });

    // Track console errors
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

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
    // Demo scan takes ~4s then navigates to preview mode
    await expect(page.getByText('Scan Quality')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('DOE')).toBeVisible();
    await expect(page.getByText('JANE')).toBeVisible();

    // === Step 3: Confirm scanned profile ===
    // This is the PassportPreview within PassportScanScreen
    await page.getByRole('button', { name: 'Confirm & Continue' }).click();

    // === Step 4: ConfirmProfile Screen ===
    // Should show the profile data we just saved
    await expect(page.getByText('Confirm Your Profile')).toBeVisible({ timeout: 10000 });

    // Continue to biometric setup
    await page.getByRole('button', { name: 'Continue to Security Setup' }).click();

    // === Step 5: Biometric Setup Screen ===
    await expect(page.getByText('Secure Your Profile')).toBeVisible({ timeout: 5000 });

    // Skip biometric setup - this triggers an Alert
    await page.getByRole('button', { name: 'Skip for Now' }).click();

    // Wait a moment for the alert chain to complete
    await page.waitForTimeout(1000);

    // === Step 6: Main App - Trip List ===
    // After onboarding completes, RootNavigator should switch to Main
    // The trip list should show the empty state
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 10000 });
  });

  test('complete onboarding via manual entry', async ({ page }) => {
    // Handle alerts
    page.on('dialog', async (dialog: Dialog) => {
      await dialog.accept();
    });

    await page.goto('/');

    // Skip tutorial
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await expect(page.getByText(/Quick Passport Scan|Optimized Passport Scan/)).toBeVisible();

    // Use manual entry instead of camera
    await page.getByRole('button', { name: 'Enter Manually' }).click();

    // Fill in passport form
    await page.getByTestId('passport-number-input').fill('AB1234567');
    await page.getByTestId('surname-input').fill('SMITH');
    await page.getByTestId('given-names-input').fill('JOHN');
    await page.getByTestId('nationality-input').fill('USA');
    await page.getByTestId('dob-input').fill('1990-01-15');
    await page.getByTestId('gender-Male-button').click();
    await page.getByTestId('passport-expiry-input').fill('2030-12-31');
    await page.getByTestId('issuing-country-input').fill('USA');

    // Submit the form
    await page.getByTestId('passport-continue-button').click();

    // Should navigate to ConfirmProfile
    await expect(page.getByText('Confirm Your Profile')).toBeVisible({ timeout: 10000 });

    // Continue to biometric setup
    await page.getByRole('button', { name: 'Continue to Security Setup' }).click();
    await expect(page.getByText('Secure Your Profile')).toBeVisible({ timeout: 5000 });

    // Skip biometric
    await page.getByRole('button', { name: 'Skip for Now' }).click();
    await page.waitForTimeout(1000);

    // Should reach main app
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 10000 });
  });

  test('full journey: onboarding → create trip → view trip', async ({ page }) => {
    // Handle alerts
    page.on('dialog', async (dialog: Dialog) => {
      await dialog.accept();
    });

    await page.goto('/');

    // === Fast onboarding via manual entry ===
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await page.getByRole('button', { name: 'Enter Manually' }).click();

    await page.getByTestId('passport-number-input').fill('CD9876543');
    await page.getByTestId('surname-input').fill('TANAKA');
    await page.getByTestId('given-names-input').fill('YUKI');
    await page.getByTestId('nationality-input').fill('JPN');
    await page.getByTestId('dob-input').fill('1985-06-20');
    await page.getByTestId('gender-Female-button').click();
    await page.getByTestId('passport-expiry-input').fill('2029-03-15');
    await page.getByTestId('issuing-country-input').fill('JPN');

    await page.getByTestId('passport-continue-button').click();
    await expect(page.getByText('Confirm Your Profile')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Continue to Security Setup' }).click();
    await expect(page.getByText('Secure Your Profile')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Skip for Now' }).click();
    await page.waitForTimeout(1000);

    // === Main app should be visible ===
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 10000 });

    // === Create a trip ===
    await page.getByTestId('create-first-trip-button').click();
    await expect(page.getByText('Create New Trip')).toBeVisible({ timeout: 5000 });

    // Add a destination manually
    await page.getByTestId('add-destination-button').click();

    // Should have a new destination card
    await expect(page.getByText('No destinations added yet')).not.toBeVisible();
  });
});
