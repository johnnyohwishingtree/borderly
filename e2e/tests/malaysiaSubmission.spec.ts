import { test, expect, Page } from '@playwright/test';

/**
 * Helper function to navigate to Malaysia form
 */
async function navigateToMalaysiaForm(page: Page) {
  await page.click('[data-testid="create-trip-button"]');
  await page.click('[data-testid="add-destination-button"]');
  await page.click('[data-testid="country-MYS"]');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  await page.fill('[data-testid="departure-date"]', tomorrowStr);
  await page.click('[data-testid="create-trip-submit"]');
  await page.click('[data-testid="malaysia-leg-button"]');
}

/**
 * E2E Tests for Malaysia MDAC Submission Workflow
 *
 * Tests the complete user journey for Malaysia Digital Arrival Card (MDAC)
 * submission, including form generation, submission guide, and QR code workflow.
 * Portal URL: https://imigresen-online.imi.gov.my/mdac/main
 */
test.describe('Malaysia MDAC Submission', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-loaded"]', {
      timeout: 10000,
    });
  });

  test('should complete Malaysia MDAC submission workflow', async ({ page }) => {
    // Navigate to Malaysia form using helper
    await navigateToMalaysiaForm(page);

    // Verify form is generated
    await expect(page.locator('[data-testid="country-form-MYS"]')).toBeVisible();

    // Check that form has Malaysia-specific fields
    await expect(page.locator('[data-testid="field-arrivalAirport"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-durationOfStay"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-hotelName"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-hotelAddress"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-hotelPhone"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-healthCondition"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-visitedHighRiskCountries"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-carryingCurrency"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-carryingProhibitedItems"]')).toBeVisible();

    // Verify form is pre-filled with profile data
    const surnameField = page.locator('[data-testid="field-surname"] input');
    await expect(surnameField).not.toHaveValue('');

    // Verify date format is DD/MM/YYYY
    const dobField = page.locator('[data-testid="field-dateOfBirth"] input');
    const dobValue = await dobField.inputValue();
    if (dobValue) {
      expect(dobValue).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    }

    // Navigate to submission guide
    await page.click('[data-testid="open-submission-guide"]');

    // Verify submission guide loads
    await expect(page.locator('[data-testid="submission-guide-MYS"]')).toBeVisible();
    await expect(page.locator('text=Malaysia Digital Arrival Card (MDAC)')).toBeVisible();

    // Check submission guide steps
    await expect(page.locator('[data-testid="guide-step-1"]')).toContainText('Access the MDAC Portal');
    await expect(page.locator('[data-testid="guide-step-2"]')).toContainText('Create an Account');

    // Verify portal information
    await page.click('[data-testid="portal-info-tab"]');
    await expect(page.locator('text=Free')).toBeVisible();
    await expect(page.locator('text=https://imigresen-online.imi.gov.my/mdac/main')).toBeVisible();

    // Test portal launch (without actually opening)
    await page.click('[data-testid="launch-portal-button"]');
    await expect(page.locator('[data-testid="portal-launch-confirmation"]')).toBeVisible();
  });

  test('should show Malaysia-specific validation messages', async ({ page }) => {
    // Navigate to Malaysia form using helper
    await navigateToMalaysiaForm(page);

    // Clear required field and try to submit
    await page.fill('[data-testid="field-arrivalAirport"] input', '');
    await page.click('[data-testid="validate-form"]');

    // Check for validation message on required Malaysia-specific field
    await expect(page.locator('[data-testid="field-arrivalAirport-error"]')).toContainText('required');

    // Test duration of stay validation (must be a positive number)
    await page.fill('[data-testid="field-durationOfStay"] input', '-1');
    await page.click('[data-testid="validate-form"]');

    await expect(page.locator('[data-testid="field-durationOfStay-error"]')).toContainText('valid');

    // Test hotel phone validation
    await page.fill('[data-testid="field-hotelPhone"] input', 'not-a-phone');
    await page.click('[data-testid="validate-form"]');

    await expect(page.locator('[data-testid="field-hotelPhone-error"]')).toContainText('valid');
  });

  test('should display Malaysia portal health status', async ({ page }) => {
    // Navigate to Malaysia form using helper
    await navigateToMalaysiaForm(page);
    await page.click('[data-testid="open-submission-guide"]');

    // Check portal status indicator
    const portalStatus = page.locator('[data-testid="portal-status-MYS"]');
    await expect(portalStatus).toBeVisible();

    // Status should be one of: healthy, degraded, offline
    const statusText = await portalStatus.textContent();
    expect(['healthy', 'degraded', 'offline']).toContain(statusText?.toLowerCase());
  });

  test('should support QR code workflow for MDAC', async ({ page }) => {
    // Navigate to Malaysia form using helper
    await navigateToMalaysiaForm(page);

    // Navigate to QR code section
    await page.click('[data-testid="qr-wallet-tab"]');

    // Verify QR capture interface
    await expect(page.locator('[data-testid="add-qr-code"]')).toBeVisible();
    await expect(page.locator('text=MDAC Confirmation')).toBeVisible();

    // Test manual QR entry
    await page.click('[data-testid="manual-qr-entry"]');
    await page.fill('[data-testid="qr-description"]', 'Malaysia MDAC Confirmation');
    await page.fill('[data-testid="qr-reference"]', 'MDAC123456789');

    await page.click('[data-testid="save-qr-code"]');

    // Verify QR code is saved
    await expect(page.locator('[data-testid="qr-code-MDAC123456789"]')).toBeVisible();
    await expect(page.locator('text=Malaysia MDAC Confirmation')).toBeVisible();
  });

  test('should show correct automation status for Malaysia', async ({ page }) => {
    // Navigate to Malaysia form using helper
    await navigateToMalaysiaForm(page);

    // Check automation indicator
    const automationStatus = page.locator('[data-testid="automation-status-MYS"]');
    await expect(automationStatus).toBeVisible();

    // Malaysia MDAC should show automation is supported
    await expect(automationStatus).toContainText('Automation supported');

    // Check automation options
    await page.click('[data-testid="open-submission-guide"]');
    await expect(page.locator('[data-testid="automated-submission-option"]')).toBeVisible();
  });

  test('should handle Malaysia-specific error scenarios', async ({ page }) => {
    // Test network error handling
    await page.route('**/api/portal/health/MYS', route =>
      route.abort('failed')
    );

    // Navigate to Malaysia form using helper
    await navigateToMalaysiaForm(page);

    // Should show offline indicator
    await expect(page.locator('[data-testid="portal-offline-MYS"]')).toBeVisible();

    // Should still allow manual submission
    await page.click('[data-testid="open-submission-guide"]');
    await expect(page.locator('[data-testid="manual-submission-option"]')).toBeVisible();
  });

  test('should validate Malaysia MDAC schema completeness', async ({ page }) => {
    // Navigate to Malaysia form using helper
    await navigateToMalaysiaForm(page);

    // Verify all required Malaysia MDAC sections are present
    await expect(page.locator('[data-testid="section-personal"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-travel"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-accommodation"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-health_declarations"]')).toBeVisible();

    // Check that form completion percentage is calculated
    const completionIndicator = page.locator('[data-testid="form-completion-MYS"]');
    await expect(completionIndicator).toBeVisible();
  });
});
