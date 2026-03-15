import { test, expect, Page } from '@playwright/test';

/**
 * Helper function to navigate to Singapore form
 */
async function navigateToSingaporeForm(page: Page) {
  await page.click('[data-testid="create-trip-button"]');
  await page.click('[data-testid="add-destination-button"]');
  await page.click('[data-testid="country-SGP"]');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  await page.fill('[data-testid="departure-date"]', tomorrowStr);
  await page.click('[data-testid="create-trip-submit"]');
  await page.click('[data-testid="singapore-leg-button"]');
}

/**
 * E2E Tests for Singapore SG Arrival Card Submission Workflow
 *
 * Tests the complete user journey for the Singapore SG Arrival Card (ICA)
 * submission, including form generation, submission guide, QR code workflow,
 * and the multi-step wizard flow with session timeout handling.
 */
test.describe('Singapore SG Arrival Card Submission', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-loaded"]', {
      timeout: 10000,
    });
  });

  test('should complete SG Arrival Card submission workflow', async ({ page }) => {
    // Navigate to Singapore form using helper
    await navigateToSingaporeForm(page);

    // Verify form is generated
    await expect(page.locator('[data-testid="country-form-SGP"]')).toBeVisible();

    // Check that form has Singapore-specific fields
    await expect(page.locator('[data-testid="field-arrivalTime"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-airlineCode"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-departureCity"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-intendedLengthOfStay"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-accommodationType"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-accommodationName"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-accommodationAddress"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-accommodationPhone"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-feverSymptoms"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-infectiousDisease"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-visitedOutbreakArea"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-contactWithInfected"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-exceedsAllowance"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-carryingCash"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-prohibitedGoods"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-commercialGoods"]')).toBeVisible();

    // Verify form is pre-filled with profile data
    const surnameField = page.locator('[data-testid="field-surname"] input');
    await expect(surnameField).not.toHaveValue('');

    // Navigate to submission guide
    await page.click('[data-testid="open-submission-guide"]');

    // Verify submission guide loads
    await expect(page.locator('[data-testid="submission-guide-SGP"]')).toBeVisible();
    await expect(page.locator('text=SG Arrival Card (ICA)')).toBeVisible();

    // Check submission guide steps
    await expect(page.locator('[data-testid="guide-step-1"]')).toContainText('Access the SG Arrival Card Portal');
    await expect(page.locator('[data-testid="guide-step-2"]')).toContainText('Create or Log In to Your Account');

    // Verify portal information
    await page.click('[data-testid="portal-info-tab"]');
    await expect(page.locator('text=Free')).toBeVisible();
    await expect(page.locator('text=https://eservices.ica.gov.sg/sgarrivalcard')).toBeVisible();

    // Test portal launch (without actually opening)
    await page.click('[data-testid="launch-portal-button"]');
    await expect(page.locator('[data-testid="portal-launch-confirmation"]')).toBeVisible();
  });

  test('should show Singapore-specific validation messages', async ({ page }) => {
    // Navigate to Singapore form using helper
    await navigateToSingaporeForm(page);

    // Clear required field and try to submit
    await page.fill('[data-testid="field-airlineCode"] input', '');
    await page.click('[data-testid="validate-form"]');

    // Check for validation message
    await expect(page.locator('[data-testid="field-airlineCode-error"]')).toContainText('required');

    // Test airline code format validation (must be 2-3 character IATA/ICAO code)
    await page.fill('[data-testid="field-airlineCode"] input', 'TOOLONG');
    await page.click('[data-testid="validate-form"]');

    await expect(page.locator('[data-testid="field-airlineCode-error"]')).toContainText('valid airline code');

    // Test intendedLengthOfStay validation (must be a positive integer)
    await page.fill('[data-testid="field-intendedLengthOfStay"] input', '0');
    await page.click('[data-testid="validate-form"]');

    await expect(page.locator('[data-testid="field-intendedLengthOfStay-error"]')).toContainText('at least 1');
  });

  test('should display Singapore portal health status', async ({ page }) => {
    // Navigate to Singapore form using helper
    await navigateToSingaporeForm(page);
    await page.click('[data-testid="open-submission-guide"]');

    // Check portal status indicator
    const portalStatus = page.locator('[data-testid="portal-status-SGP"]');
    await expect(portalStatus).toBeVisible();

    // Status should be one of: healthy, degraded, offline
    const statusText = await portalStatus.textContent();
    expect(['healthy', 'degraded', 'offline']).toContain(statusText?.toLowerCase());
  });

  test('should support QR code workflow for SG Arrival Card', async ({ page }) => {
    // Navigate to Singapore form using helper
    await navigateToSingaporeForm(page);

    // Navigate to QR code section
    await page.click('[data-testid="qr-wallet-tab"]');

    // Verify QR capture interface
    await expect(page.locator('[data-testid="add-qr-code"]')).toBeVisible();
    await expect(page.locator('text=SG Arrival Card Confirmation')).toBeVisible();

    // Test manual QR entry
    await page.click('[data-testid="manual-qr-entry"]');
    await page.fill('[data-testid="qr-description"]', 'Singapore SG Arrival Card Confirmation');
    await page.fill('[data-testid="qr-reference"]', 'SGAC123456789');

    await page.click('[data-testid="save-qr-code"]');

    // Verify QR code is saved
    await expect(page.locator('[data-testid="qr-code-SGAC123456789"]')).toBeVisible();
    await expect(page.locator('text=Singapore SG Arrival Card Confirmation')).toBeVisible();
  });

  test('should show correct automation status for Singapore', async ({ page }) => {
    // Navigate to Singapore form using helper
    await navigateToSingaporeForm(page);

    // Check automation indicator
    const automationStatus = page.locator('[data-testid="automation-status-SGP"]');
    await expect(automationStatus).toBeVisible();

    // Singapore should show automation is supported
    await expect(automationStatus).toContainText('Automation supported');

    // Check automation options
    await page.click('[data-testid="open-submission-guide"]');
    await expect(page.locator('[data-testid="automated-submission-option"]')).toBeVisible();
  });

  test('should handle Singapore-specific error scenarios including session timeout', async ({ page }) => {
    // Test network error handling
    await page.route('**/api/portal/health/SGP', route =>
      route.abort('failed')
    );

    // Navigate to Singapore form using helper
    await navigateToSingaporeForm(page);

    // Should show offline indicator
    await expect(page.locator('[data-testid="portal-offline-SGP"]')).toBeVisible();

    // Should still allow manual submission
    await page.click('[data-testid="open-submission-guide"]');
    await expect(page.locator('[data-testid="manual-submission-option"]')).toBeVisible();

    // Verify session timeout warning is displayed for Singapore (15-minute limit)
    await expect(page.locator('[data-testid="session-timeout-warning-SGP"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-timeout-warning-SGP"]')).toContainText('15 minutes');

    // Verify guidance to restart session if timed out is shown
    await expect(page.locator('[data-testid="session-restart-guidance"]')).toBeVisible();
  });

  test('should validate Singapore SG Arrival Card schema completeness', async ({ page }) => {
    // Navigate to Singapore form using helper
    await navigateToSingaporeForm(page);

    // Verify all 5 required Singapore SG Arrival Card sections are present
    await expect(page.locator('[data-testid="section-personal"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-travel"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-accommodation"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-health_declarations"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-customs_declarations"]')).toBeVisible();

    // Check that form completion percentage is calculated
    const completionIndicator = page.locator('[data-testid="form-completion-SGP"]');
    await expect(completionIndicator).toBeVisible();
  });

  test('should support multi-step wizard navigation for Singapore SG Arrival Card', async ({ page }) => {
    // Navigate to Singapore form using helper
    await navigateToSingaporeForm(page);
    await page.click('[data-testid="open-submission-guide"]');

    // Verify wizard mode indicator is present
    await expect(page.locator('[data-testid="wizard-mode-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="wizard-mode-indicator"]')).toContainText('Multi-step wizard');

    // Verify step 1 is active: Personal Details
    await expect(page.locator('[data-testid="wizard-step-personal"]')).toHaveAttribute('aria-current', 'step');

    // Advance to step 2: Travel Details
    await page.click('[data-testid="wizard-next-button"]');
    await expect(page.locator('[data-testid="wizard-step-travel"]')).toHaveAttribute('aria-current', 'step');

    // Advance to step 3: Accommodation Details
    await page.click('[data-testid="wizard-next-button"]');
    await expect(page.locator('[data-testid="wizard-step-accommodation"]')).toHaveAttribute('aria-current', 'step');

    // Advance to step 4: Health Declarations
    await page.click('[data-testid="wizard-next-button"]');
    await expect(page.locator('[data-testid="wizard-step-health_declarations"]')).toHaveAttribute('aria-current', 'step');

    // Advance to step 5: Customs Declarations
    await page.click('[data-testid="wizard-next-button"]');
    await expect(page.locator('[data-testid="wizard-step-customs_declarations"]')).toHaveAttribute('aria-current', 'step');

    // Verify back navigation works
    await page.click('[data-testid="wizard-back-button"]');
    await expect(page.locator('[data-testid="wizard-step-health_declarations"]')).toHaveAttribute('aria-current', 'step');

    // Verify progress indicator shows correct step count (5 steps total)
    const progressIndicator = page.locator('[data-testid="wizard-progress"]');
    await expect(progressIndicator).toBeVisible();
    await expect(progressIndicator).toContainText('4 / 5');

    // Verify submit button appears only on the final step
    await page.click('[data-testid="wizard-next-button"]');
    await expect(page.locator('[data-testid="wizard-submit-button"]')).toBeVisible();
  });
});
