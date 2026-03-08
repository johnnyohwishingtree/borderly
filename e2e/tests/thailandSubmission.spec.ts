/**
 * Thailand Submission E2E Tests
 * 
 * Tests the complete Thailand Pass submission workflow from form generation
 * to portal guidance and QR code handling.
 */

import { test, expect } from '@playwright/test';

test.describe('Thailand Submission Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Navigate through onboarding to reach trips
    await page.getByTestId('skip-onboarding').click();
    await page.getByTestId('tab-trips').click();

    // Create a new trip with a Thailand leg for all tests in this suite
    await page.getByTestId('create-trip-button').click();
    await page.getByTestId('trip-title-input').fill('Thailand Adventure');
    
    // Add Thailand leg
    await page.getByTestId('add-leg-button').click();
    await page.getByTestId('country-select').click();
    await page.getByRole('option', { name: 'Thailand' }).click();
    await page.getByTestId('arrival-date-input').fill('2026-04-15');
    await page.getByTestId('departure-date-input').fill('2026-04-22');
    
    await page.getByTestId('save-trip-button').click();
  });

  test('should generate Thailand Pass form with auto-filled data', async ({ page }) => {
    // Open Thailand leg form (trip created in beforeEach)
    await page.getByTestId('thailand-leg-card').click();
    await page.getByTestId('fill-form-button').click();
    
    // Verify form sections are present
    await expect(page.getByText('Personal Information')).toBeVisible();
    await expect(page.getByText('Travel Information')).toBeVisible();
    await expect(page.getByText('Accommodation in Thailand')).toBeVisible();
    await expect(page.getByText('Health and Vaccination')).toBeVisible();
    
    // Check auto-filled fields (assuming profile is set up)
    const firstNameField = page.getByTestId('field-firstName');
    await expect(firstNameField).toHaveValue(/^[A-Za-z]+$/);
    
    const lastNameField = page.getByTestId('field-lastName');
    await expect(lastNameField).toHaveValue(/^[A-Za-z]+$/);
    
    // Check Thailand-specific fields are present
    await expect(page.getByTestId('field-purposeOfVisit')).toBeVisible();
    await expect(page.getByTestId('field-accommodationType')).toBeVisible();
    await expect(page.getByTestId('field-vaccinationStatus')).toBeVisible();
    await expect(page.getByTestId('field-emergencyContact')).toBeVisible();
  });

  test('should show Thailand Pass submission guide', async ({ page }) => {
    // Navigate to submission guide (trip created in beforeEach)
    await page.getByTestId('thailand-leg-card').click();
    await page.getByTestId('submission-guide-button').click();
    
    // Verify guide steps are present
    await expect(page.getByText('Create Thailand Pass Account')).toBeVisible();
    await expect(page.getByText('Start New Application')).toBeVisible();
    await expect(page.getByText('Enter Personal Information')).toBeVisible();
    await expect(page.getByText('Travel Information')).toBeVisible();
    await expect(page.getByText('Accommodation Details')).toBeVisible();
    await expect(page.getByText('Health and Insurance Information')).toBeVisible();
    await expect(page.getByText('Upload Documents')).toBeVisible();
    await expect(page.getByText('Submit and Get QR Code')).toBeVisible();
    
    // Test portal launch
    const launchPortalButton = page.getByTestId('launch-portal-button');
    await expect(launchPortalButton).toBeVisible();
    await expect(launchPortalButton).toContainText('Open Thailand Pass');
    
    // Check portal URL is correct
    await expect(page.getByText('https://tp.consular.go.th/')).toBeVisible();
  });

  test('should handle Thailand-specific form validation', async ({ page }) => {
    // Navigate to form
    await page.getByTestId('thailand-leg-card').click();
    await page.getByTestId('fill-form-button').click();
    
    // Test vaccination status selection
    const vaccinationField = page.getByTestId('field-vaccinationStatus');
    await vaccinationField.click();
    await page.getByRole('option', { name: 'Fully Vaccinated (2+ doses)' }).click();
    await expect(vaccinationField).toHaveValue('fully_vaccinated');
    
    // Test accommodation type selection
    const accommodationField = page.getByTestId('field-accommodationType');
    await accommodationField.click();
    await page.getByRole('option', { name: 'Hotel' }).click();
    await expect(accommodationField).toHaveValue('hotel');
    
    // Test length of stay validation
    const lengthOfStayField = page.getByTestId('field-lengthOfStay');
    await lengthOfStayField.fill('65'); // Invalid: over 60 days
    await page.getByTestId('validate-form-button').click();
    await expect(page.getByText('Length of stay cannot exceed 60 days')).toBeVisible();
    
    // Fix validation error
    await lengthOfStayField.fill('7');
    await page.getByTestId('validate-form-button').click();
    await expect(page.getByText('Form validation passed')).toBeVisible();
  });

  test('should display Thailand Pass preparation checklist', async ({ page }) => {
    await page.getByTestId('thailand-leg-card').click();
    await page.getByTestId('submission-guide-button').click();
    
    // Check preparation tips
    await expect(page.getByText('Create account and verify email first')).toBeVisible();
    await expect(page.getByText('Have accommodation booking confirmation ready')).toBeVisible();
    await expect(page.getByText('Prepare vaccination certificates if applicable')).toBeVisible();
    await expect(page.getByText('Submit at least 72 hours before departure')).toBeVisible();
    
    // Check time estimates
    await expect(page.getByText('Preparation: 8 minutes')).toBeVisible();
    await expect(page.getByText('Submission: 20 minutes')).toBeVisible();
    await expect(page.getByText('Total: 28 minutes')).toBeVisible();
  });

  test('should handle QR code capture for Thailand Pass', async ({ page }) => {
    // Navigate to QR wallet
    await page.getByTestId('tab-wallet').click();
    await page.getByTestId('add-qr-button').click();
    
    // Select Thailand Pass
    await page.getByTestId('qr-source-select').click();
    await page.getByRole('option', { name: 'Thailand Pass' }).click();
    
    // Test manual QR code entry
    await page.getByTestId('manual-entry-tab').click();
    await page.getByTestId('qr-description-input').fill('Thailand Pass - BKK Entry');
    await page.getByTestId('qr-data-input').fill('TH-PASS-123456789');
    
    await page.getByTestId('save-qr-button').click();
    
    // Verify QR code is saved
    await expect(page.getByText('Thailand Pass - BKK Entry')).toBeVisible();
    await expect(page.getByText('THA')).toBeVisible(); // Country code badge
  });

  test('should show Thailand Pass common issues and troubleshooting', async ({ page }) => {
    await page.getByTestId('thailand-leg-card').click();
    await page.getByTestId('submission-guide-button').click();
    
    // Check troubleshooting section
    await page.getByTestId('troubleshooting-section').click();
    
    await expect(page.getByText('Processing usually takes 24-72 hours')).toBeVisible();
    await expect(page.getByText('Document uploads must be clear, colored scans')).toBeVisible();
    await expect(page.getByText('Account verification email may go to spam folder')).toBeVisible();
    await expect(page.getByText('QR code generation can take several hours')).toBeVisible();
  });

  test('should test automation readiness for Thailand Pass', async ({ page }) => {
    await page.getByTestId('thailand-leg-card').click();
    await page.getByTestId('fill-form-button').click();
    
    // Check that key profile fields have auto-filled badges
    await expect(page.locator('[data-testid="field-firstName"] [data-testid="auto-filled-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-lastName"] [data-testid="auto-filled-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-passportNumber"] [data-testid="auto-filled-badge"]')).toBeVisible();
    
    // Check that Thailand-specific fields are marked as requiring input
    await expect(page.getByTestId('field-purposeOfVisit')).toHaveAttribute('data-country-specific', 'true');
    await expect(page.getByTestId('field-accommodationType')).toHaveAttribute('data-country-specific', 'true');
    await expect(page.getByTestId('field-vaccinationStatus')).toHaveAttribute('data-country-specific', 'true');
  });
});

test.describe('Thailand Pass Portal Health', () => {
  test('should check Thailand Pass portal availability', async ({ page }) => {
    await page.goto('/settings');
    await page.getByTestId('portal-health-check').click();
    
    // Wait for health check to complete
    await page.waitForSelector('[data-testid="health-check-results"]', { timeout: 10000 });
    
    // Check Thailand Pass status
    const thailandStatus = page.getByTestId('portal-status-THA');
    await expect(thailandStatus).toBeVisible();
    
    // Should show either healthy, degraded, or offline
    const statusText = await thailandStatus.textContent();
    expect(['healthy', 'degraded', 'offline']).toContain(statusText?.toLowerCase());
  });
});