/**
 * Vietnam e-Visa Submission E2E Tests
 * 
 * Tests the complete Vietnam e-Visa submission workflow from form generation
 * to portal guidance and QR code handling.
 */

import { test, expect } from '@playwright/test';

test.describe('Vietnam e-Visa Submission Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Navigate through onboarding to reach trips
    await page.getByTestId('skip-onboarding').click();
    await page.getByTestId('tab-trips').click();

    // Create a new trip with a Vietnam leg for all tests in this suite
    await page.getByTestId('create-trip-button').click();
    await page.getByTestId('trip-title-input').fill('Vietnam Discovery');
    
    // Add Vietnam leg
    await page.getByTestId('add-leg-button').click();
    await page.getByTestId('country-select').click();
    await page.getByRole('option', { name: 'Vietnam' }).click();
    await page.getByTestId('arrival-date-input').fill('2026-05-10');
    await page.getByTestId('departure-date-input').fill('2026-05-20');
    
    await page.getByTestId('save-trip-button').click();
  });

  test('should generate Vietnam e-Visa form with auto-filled data', async ({ page }) => {
    // Open Vietnam leg form (trip created in beforeEach)
    await page.getByTestId('vietnam-leg-card').click();
    await page.getByTestId('fill-form-button').click();
    
    // Verify form sections are present
    await expect(page.getByText('Personal Information')).toBeVisible();
    await expect(page.getByText('Passport Information')).toBeVisible();
    await expect(page.getByText('Travel Information')).toBeVisible();
    await expect(page.getByText('Accommodation Information')).toBeVisible();
    await expect(page.getByText('Contact Information')).toBeVisible();
    
    // Check auto-filled fields (assuming profile is set up)
    const surnameField = page.getByTestId('field-surname');
    await expect(surnameField).toHaveValue(/^[A-Za-z]+$/);
    
    const givenNameField = page.getByTestId('field-givenName');
    await expect(givenNameField).toHaveValue(/^[A-Za-z]+$/);
    
    // Check Vietnam-specific fields are present
    await expect(page.getByTestId('field-religion')).toBeVisible();
    await expect(page.getByTestId('field-purposeOfVisit')).toBeVisible();
    await expect(page.getByTestId('field-entryPort')).toBeVisible();
    await expect(page.getByTestId('field-previousVietnamVisit')).toBeVisible();
    await expect(page.getByTestId('field-emergencyContactName')).toBeVisible();
  });

  test('should show Vietnam e-Visa submission guide', async ({ page }) => {
    // Navigate to submission guide (trip created in beforeEach)
    await page.getByTestId('vietnam-leg-card').click();
    await page.getByTestId('submission-guide-button').click();
    
    // Verify guide steps are present
    await expect(page.getByText('Access Vietnam e-Visa Portal')).toBeVisible();
    await expect(page.getByText('Start New Application')).toBeVisible();
    await expect(page.getByText('Enter Personal Information')).toBeVisible();
    await expect(page.getByText('Passport Details')).toBeVisible();
    await expect(page.getByText('Travel Information')).toBeVisible();
    await expect(page.getByText('Accommodation Information')).toBeVisible();
    await expect(page.getByText('Contact Information')).toBeVisible();
    await expect(page.getByText('Upload Documents')).toBeVisible();
    await expect(page.getByText('Review and Pay')).toBeVisible();
    await expect(page.getByText('Download Your e-Visa')).toBeVisible();
    
    // Test portal launch
    const launchPortalButton = page.getByTestId('launch-portal-button');
    await expect(launchPortalButton).toBeVisible();
    await expect(launchPortalButton).toContainText('Open Vietnam e-Visa Portal');
    
    // Check portal URL is correct
    await expect(page.getByText('https://evisa.xuatnhapcanh.gov.vn/')).toBeVisible();
  });

  test('should handle Vietnam-specific form validation', async ({ page }) => {
    // Navigate to form
    await page.getByTestId('vietnam-leg-card').click();
    await page.getByTestId('fill-form-button').click();
    
    // Test religion field (mandatory in Vietnam)
    const religionField = page.getByTestId('field-religion');
    await religionField.click();
    await page.getByRole('option', { name: 'Buddhism' }).click();
    await expect(religionField).toHaveValue('buddhism');
    
    // Test entry port selection
    const entryPortField = page.getByTestId('field-entryPort');
    await entryPortField.click();
    await page.getByRole('option', { name: 'Tan Son Nhat Airport (Ho Chi Minh City)' }).click();
    await expect(entryPortField).toHaveValue('SGN');
    
    // Test stay duration validation (max 30 days for tourist visa)
    const stayDurationField = page.getByTestId('field-stayDuration');
    await stayDurationField.fill('35'); // Invalid: over 30 days
    await page.getByTestId('validate-form-button').click();
    await expect(page.getByText('Tourist e-visa allows up to 30 days')).toBeVisible();
    
    // Fix validation error
    await stayDurationField.fill('10');
    await page.getByTestId('validate-form-button').click();
    await expect(page.getByText('Form validation passed')).toBeVisible();
  });

  test('should display Vietnam e-Visa preparation checklist', async ({ page }) => {
    await page.getByTestId('vietnam-leg-card').click();
    await page.getByTestId('submission-guide-button').click();
    
    // Check preparation tips
    await expect(page.getByText('No account registration required - single session process')).toBeVisible();
    await expect(page.getByText('Have passport valid for at least 6 months ready')).toBeVisible();
    await expect(page.getByText('Prepare accommodation booking details and contact info')).toBeVisible();
    await expect(page.getByText('Submit 3-30 days before intended arrival')).toBeVisible();
    await expect(page.getByText('Have credit card ready for visa fee (~$25 USD)')).toBeVisible();
    
    // Check time estimates
    await expect(page.getByText('Preparation: 5 minutes')).toBeVisible();
    await expect(page.getByText('Submission: 18 minutes')).toBeVisible();
    await expect(page.getByText('Total: 23 minutes')).toBeVisible();
  });

  test('should handle QR code capture for Vietnam e-Visa', async ({ page }) => {
    // Navigate to QR wallet
    await page.getByTestId('tab-wallet').click();
    await page.getByTestId('add-qr-button').click();
    
    // Select Vietnam e-Visa
    await page.getByTestId('qr-source-select').click();
    await page.getByRole('option', { name: 'Vietnam e-Visa Portal' }).click();
    
    // Test manual QR code entry
    await page.getByTestId('manual-entry-tab').click();
    await page.getByTestId('qr-description-input').fill('Vietnam e-Visa - SGN Entry');
    await page.getByTestId('qr-data-input').fill('VN-EVISA-987654321');
    
    await page.getByTestId('save-qr-button').click();
    
    // Verify QR code is saved
    await expect(page.getByText('Vietnam e-Visa - SGN Entry')).toBeVisible();
    await expect(page.getByText('VNM')).toBeVisible(); // Country code badge
  });

  test('should show Vietnam e-Visa common issues and troubleshooting', async ({ page }) => {
    await page.getByTestId('vietnam-leg-card').click();
    await page.getByTestId('submission-guide-button').click();
    
    // Check troubleshooting section
    await page.getByTestId('troubleshooting-section').click();
    
    await expect(page.getByText('Processing takes 2-3 business days')).toBeVisible();
    await expect(page.getByText('Religion field is mandatory (required by Vietnamese law)')).toBeVisible();
    await expect(page.getByText('Passport and portrait photos must be clear and in JPEG format')).toBeVisible();
    await expect(page.getByText('Visa fee payment by credit card only')).toBeVisible();
    await expect(page.getByText('Emergency contact information is required')).toBeVisible();
    await expect(page.getByText('Download and print e-visa upon approval')).toBeVisible();
  });

  test('should test automation readiness for Vietnam e-Visa', async ({ page }) => {
    await page.getByTestId('vietnam-leg-card').click();
    await page.getByTestId('fill-form-button').click();
    
    // Check that specific key fields expected to be auto-filled have the badge
    await expect(page.getByTestId('field-surname').locator('[data-testid="auto-filled-badge"]')).toBeVisible();
    await expect(page.getByTestId('field-givenName').locator('[data-testid="auto-filled-badge"]')).toBeVisible();
    await expect(page.getByTestId('field-passportNumber').locator('[data-testid="auto-filled-badge"]')).toBeVisible();
    await expect(page.getByTestId('field-dateOfBirth').locator('[data-testid="auto-filled-badge"]')).toBeVisible();
    
    // Check that Vietnam-specific fields are marked as requiring input
    await expect(page.getByTestId('field-religion')).toHaveAttribute('data-country-specific', 'true');
    await expect(page.getByTestId('field-purposeOfVisit')).toHaveAttribute('data-country-specific', 'true');
    await expect(page.getByTestId('field-entryPort')).toHaveAttribute('data-country-specific', 'true');
    await expect(page.getByTestId('field-previousVietnamVisit')).toHaveAttribute('data-country-specific', 'true');
    await expect(page.getByTestId('field-emergencyContactName')).toHaveAttribute('data-country-specific', 'true');
  });

  test('should validate Vietnam passport requirements', async ({ page }) => {
    await page.getByTestId('vietnam-leg-card').click();
    await page.getByTestId('fill-form-button').click();
    
    // Check passport expiry validation (6 months requirement)
    const passportExpiryField = page.getByTestId('field-passportExpiry');
    const nearExpiryDate = new Date();
    nearExpiryDate.setMonth(nearExpiryDate.getMonth() + 3); // Only 3 months validity
    
    await passportExpiryField.fill(nearExpiryDate.toISOString().split('T')[0]);
    await page.getByTestId('validate-form-button').click();
    await expect(page.getByText('Passport must be valid for at least 6 months')).toBeVisible();
    
    // Fix with valid expiry
    const validExpiryDate = new Date();
    validExpiryDate.setMonth(validExpiryDate.getMonth() + 12); // 1 year validity
    await passportExpiryField.fill(validExpiryDate.toISOString().split('T')[0]);
    await page.getByTestId('validate-form-button').click();
    await expect(page.getByText('Passport validation passed')).toBeVisible();
  });

  test('should handle emergency contact requirements', async ({ page }) => {
    await page.getByTestId('vietnam-leg-card').click();
    await page.getByTestId('fill-form-button').click();
    
    // Test emergency contact name field
    const emergencyNameField = page.getByTestId('field-emergencyContactName');
    await emergencyNameField.fill('John Smith');
    await expect(emergencyNameField).toHaveValue('John Smith');
    
    // Test emergency contact phone field
    const emergencyPhoneField = page.getByTestId('field-emergencyContactPhone');
    await emergencyPhoneField.fill('+1-555-123-4567');
    await expect(emergencyPhoneField).toHaveValue('+1-555-123-4567');
    
    // Validate both fields are required
    await emergencyNameField.clear();
    await page.getByTestId('validate-form-button').click();
    await expect(page.getByText('Emergency contact name is required')).toBeVisible();
    
    await emergencyPhoneField.clear();
    await page.getByTestId('validate-form-button').click();
    await expect(page.getByText('Emergency contact phone is required')).toBeVisible();
  });
});

test.describe('Vietnam e-Visa Portal Health', () => {
  test('should check Vietnam e-Visa portal availability', async ({ page }) => {
    await page.goto('/settings');
    await page.getByTestId('portal-health-check').click();
    
    // Wait for health check to complete
    await page.waitForSelector('[data-testid="health-check-results"]', { timeout: 10000 });
    
    // Check Vietnam e-Visa status
    const vietnamStatus = page.getByTestId('portal-status-VNM');
    await expect(vietnamStatus).toBeVisible();
    
    // Should show either healthy, degraded, or offline
    const statusText = await vietnamStatus.textContent();
    expect(['healthy', 'degraded', 'offline']).toContain(statusText?.toLowerCase());
  });

  test('should display Vietnam e-Visa portal guidelines', async ({ page }) => {
    await page.goto('/settings');
    await page.getByTestId('portal-health-check').click();
    await page.getByTestId('portal-status-VNM').click();
    
    // Check portal guidelines
    await expect(page.getByText('Safari')).toBeVisible(); // Recommended browser
    await expect(page.getByText('Chrome')).toBeVisible(); // Recommended browser
    await expect(page.getByText('Edge')).toBeVisible(); // Recommended browser
    
    // Check specific Vietnam preparation tips
    await expect(page.getByText('No account registration required')).toBeVisible();
    await expect(page.getByText('Have passport valid for at least 6 months ready')).toBeVisible();
    await expect(page.getByText('Submit 3-30 days before intended arrival')).toBeVisible();
  });
});