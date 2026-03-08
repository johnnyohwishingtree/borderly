import { test, expect, Page } from '@playwright/test';

/**
 * Helper function to navigate to Canada form
 */
async function navigateToCanadaForm(page: Page) {
  await page.click('[data-testid="create-trip-button"]');
  await page.click('[data-testid="add-destination-button"]');
  await page.click('[data-testid="country-CAN"]');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  await page.fill('[data-testid="departure-date"]', tomorrowStr);
  await page.click('[data-testid="create-trip-submit"]');
  await page.click('[data-testid="canada-leg-button"]');
}

/**
 * E2E Tests for Canada eTA Submission Workflow
 * 
 * Tests the complete user journey for Canada Electronic Travel Authorization
 * submission, including form generation, submission guide, and QR code workflow.
 */
test.describe('Canada eTA Submission', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-loaded"]', { 
      timeout: 10000 
    });
  });

  test('should complete Canada eTA submission workflow', async ({ page }) => {
    // Navigate to Canada form using helper
    await navigateToCanadaForm(page);
    
    // Step 6: Verify form is generated
    await expect(page.locator('[data-testid="country-form-CAN"]')).toBeVisible();
    
    // Step 7: Check that form has Canada-specific fields
    await expect(page.locator('[data-testid="field-maritalStatus"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-purposeOfVisit"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-criminalOffence"]')).toBeVisible();
    
    // Step 8: Verify form is pre-filled with profile data
    const surnameField = page.locator('[data-testid="field-surname"] input');
    await expect(surnameField).not.toHaveValue('');
    
    // Step 9: Navigate to submission guide
    await page.click('[data-testid="open-submission-guide"]');
    
    // Step 10: Verify submission guide loads
    await expect(page.locator('[data-testid="submission-guide-CAN"]')).toBeVisible();
    await expect(page.locator('text=Electronic Travel Authorization (eTA)')).toBeVisible();
    
    // Step 11: Check submission guide steps
    await expect(page.locator('[data-testid="guide-step-1"]')).toContainText('Check if You Need an eTA');
    await expect(page.locator('[data-testid="guide-step-2"]')).toContainText('Access the Official eTA Website');
    await expect(page.locator('[data-testid="guide-step-13"]')).toContainText('Pay Application Fee');
    
    // Step 12: Verify portal information
    await page.click('[data-testid="portal-info-tab"]');
    await expect(page.locator('text=CAD $7')).toBeVisible();
    await expect(page.locator('text=5-12 minutes')).toBeVisible();
    
    // Step 13: Test portal launch (without actually opening)
    await page.click('[data-testid="launch-portal-button"]');
    await expect(page.locator('[data-testid="portal-launch-confirmation"]')).toBeVisible();
  });

  test('should show Canada-specific validation messages', async ({ page }) => {
    // Navigate to Canada form using helper
    await navigateToCanadaForm(page);
    
    // Clear required field and try to submit
    await page.fill('[data-testid="field-email"] input', '');
    await page.click('[data-testid="validate-form"]');
    
    // Check for validation message
    await expect(page.locator('[data-testid="field-email-error"]')).toContainText('required');
    
    // Test email format validation
    await page.fill('[data-testid="field-email"] input', 'invalid-email');
    await page.click('[data-testid="validate-form"]');
    
    await expect(page.locator('[data-testid="field-email-error"]')).toContainText('valid email');
  });

  test('should display Canada portal health status', async ({ page }) => {
    // Navigate to Canada form using helper
    await navigateToCanadaForm(page);
    await page.click('[data-testid="open-submission-guide"]');
    
    // Check portal status indicator
    const portalStatus = page.locator('[data-testid="portal-status-CAN"]');
    await expect(portalStatus).toBeVisible();
    
    // Status should be one of: healthy, degraded, offline
    const statusText = await portalStatus.textContent();
    expect(['healthy', 'degraded', 'offline']).toContain(statusText?.toLowerCase());
  });

  test('should support QR code workflow for Canada eTA', async ({ page }) => {
    // Navigate to Canada form using helper
    await navigateToCanadaForm(page);
    
    // Navigate to QR code section
    await page.click('[data-testid="qr-wallet-tab"]');
    
    // Verify QR capture interface
    await expect(page.locator('[data-testid="add-qr-code"]')).toBeVisible();
    await expect(page.locator('text=eTA Confirmation')).toBeVisible();
    
    // Test manual QR entry
    await page.click('[data-testid="manual-qr-entry"]');
    await page.fill('[data-testid="qr-description"]', 'Canada eTA Confirmation');
    await page.fill('[data-testid="qr-reference"]', 'ETA123456789');
    
    await page.click('[data-testid="save-qr-code"]');
    
    // Verify QR code is saved
    await expect(page.locator('[data-testid="qr-code-ETA123456789"]')).toBeVisible();
    await expect(page.locator('text=Canada eTA Confirmation')).toBeVisible();
  });

  test('should show correct automation status for Canada', async ({ page }) => {
    // Navigate to Canada form using helper
    await navigateToCanadaForm(page);
    
    // Check automation indicator
    const automationStatus = page.locator('[data-testid="automation-status-CAN"]');
    await expect(automationStatus).toBeVisible();
    
    // Canada should show automation is supported
    await expect(automationStatus).toContainText('Automation supported');
    
    // Check automation options
    await page.click('[data-testid="open-submission-guide"]');
    await expect(page.locator('[data-testid="automated-submission-option"]')).toBeVisible();
  });

  test('should handle Canada-specific error scenarios', async ({ page }) => {
    // Test network error handling
    await page.route('**/api/portal/health/CAN', route => 
      route.abort('failed')
    );
    
    // Navigate to Canada form using helper
    await navigateToCanadaForm(page);
    
    // Should show offline indicator
    await expect(page.locator('[data-testid="portal-offline-CAN"]')).toBeVisible();
    
    // Should still allow manual submission
    await page.click('[data-testid="open-submission-guide"]');
    await expect(page.locator('[data-testid="manual-submission-option"]')).toBeVisible();
  });

  test('should validate Canada eTA schema completeness', async ({ page }) => {
    // Navigate to Canada form using helper
    await navigateToCanadaForm(page);
    
    // Verify all required Canada eTA sections are present
    await expect(page.locator('[data-testid="section-personal"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-nationality"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-passport"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-contact"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-address"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-employment"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-travel"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-background"]')).toBeVisible();
    
    // Check that form completion percentage is calculated
    const completionIndicator = page.locator('[data-testid="form-completion-CAN"]');
    await expect(completionIndicator).toBeVisible();
  });
});