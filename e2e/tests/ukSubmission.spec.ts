/**
 * UK ETA Submission E2E Tests
 * 
 * Tests the complete UK Electronic Travel Authorisation submission workflow
 * from form generation to portal guidance and QR code handling.
 */

import { test, expect } from '@playwright/test';

test.describe('UK ETA Submission Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Navigate through onboarding to reach trips
    await page.getByTestId('skip-onboarding').click();
    await page.getByTestId('tab-trips').click();

    // Create a new trip with a UK leg for all tests in this suite
    await page.getByTestId('create-trip-button').click();
    await page.getByTestId('trip-title-input').fill('London Business Trip');
    
    // Add UK leg with dynamic dates
    await page.getByTestId('add-leg-button').click();
    await page.getByTestId('country-select').click();
    await page.getByRole('option', { name: 'United Kingdom' }).click();
    
    // Use dynamic dates to prevent future test failures
    const arrivalDate = new Date();
    arrivalDate.setFullYear(arrivalDate.getFullYear() + 1);
    const departureDate = new Date(arrivalDate);
    departureDate.setDate(departureDate.getDate() + 7);
    await page.getByTestId('arrival-date-input').fill(arrivalDate.toISOString().split('T')[0]);
    await page.getByTestId('departure-date-input').fill(departureDate.toISOString().split('T')[0]);
    
    await page.getByTestId('save-trip-button').click();
  });

  test('should generate UK ETA form with auto-filled data', async ({ page }) => {
    // Open UK leg form (trip created in beforeEach)
    await page.getByTestId('uk-leg-card').click();
    await page.getByTestId('fill-form-button').click();
    
    // Verify form sections are present
    await expect(page.getByText('Personal Details')).toBeVisible();
    await expect(page.getByText('Passport Information')).toBeVisible();
    await expect(page.getByText('Contact Information')).toBeVisible();
    await expect(page.getByText('Home Address')).toBeVisible();
    await expect(page.getByText('Employment Information')).toBeVisible();
    await expect(page.getByText('Travel Information')).toBeVisible();
    await expect(page.getByText('Security and Background Questions')).toBeVisible();
    
    // Check auto-filled fields (assuming profile is set up)
    const givenNamesField = page.getByTestId('field-givenNames');
    await expect(givenNamesField).toHaveValue(/^[A-Za-z\s'-]+$/);
    
    const familyNameField = page.getByTestId('field-familyName');
    await expect(familyNameField).toHaveValue(/^[A-Za-z'-]+$/);
    
    const passportNumberField = page.getByTestId('field-passportNumber');
    await expect(passportNumberField).toHaveValue(/^[A-Z0-9]{6,9}$/);
    
    // Check UK-specific fields are present
    await expect(page.getByTestId('field-title')).toBeVisible();
    await expect(page.getByTestId('field-otherNames')).toBeVisible();
    await expect(page.getByTestId('field-confirmEmail')).toBeVisible();
    await expect(page.getByTestId('field-employmentStatus')).toBeVisible();
    await expect(page.getByTestId('field-visitPurpose')).toBeVisible();
    await expect(page.getByTestId('field-ukAddress')).toBeVisible();
    await expect(page.getByTestId('field-criminalRecord')).toBeVisible();
  });

  test('should show UK ETA submission guide', async ({ page }) => {
    // Navigate to submission guide (trip created in beforeEach)
    await page.getByTestId('uk-leg-card').click();
    await page.getByTestId('submission-guide-button').click();
    
    // Verify guide steps are present
    await expect(page.getByText('Create GOV.UK Account')).toBeVisible();
    await expect(page.getByText('Start ETA Application')).toBeVisible();
    await expect(page.getByText('Enter Personal Details')).toBeVisible();
    await expect(page.getByText('Passport Information')).toBeVisible();
    await expect(page.getByText('Contact Information')).toBeVisible();
    await expect(page.getByText('Home Address')).toBeVisible();
    await expect(page.getByText('Employment Details')).toBeVisible();
    await expect(page.getByText('Travel Information')).toBeVisible();
    await expect(page.getByText('Security Questions')).toBeVisible();
    await expect(page.getByText('Upload Photo')).toBeVisible();
    await expect(page.getByText('Review and Pay')).toBeVisible();
    await expect(page.getByText('Receive Your ETA')).toBeVisible();
    
    // Test portal launch
    const launchPortalButton = page.getByTestId('launch-portal-button');
    await expect(launchPortalButton).toBeVisible();
    await expect(launchPortalButton).toContainText('Open UK ETA Portal');
    
    // Check portal URL is correct
    await expect(page.getByText('https://www.gov.uk/apply-electronic-travel-authorisation')).toBeVisible();
  });


  test.describe('on the UK ETA form', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to form
      await page.getByTestId('uk-leg-card').click();
      await page.getByTestId('fill-form-button').click();
    });

    test('should handle UK ETA-specific form validation', async ({ page }) => {
      // Test title selection
      const titleField = page.getByTestId('field-title');
      await titleField.click();
      await page.getByRole('option', { name: 'Mr' }).click();
      await expect(titleField).toHaveValue('Mr');
      
      // Test employment status selection
      const employmentField = page.getByTestId('field-employmentStatus');
      await employmentField.click();
      await page.getByRole('option', { name: 'Employed' }).click();
      await expect(employmentField).toHaveValue('employed');
      
      // Test visit purpose selection
      const visitPurposeField = page.getByTestId('field-visitPurpose');
      await visitPurposeField.click();
      await page.getByRole('option', { name: 'Tourism' }).click();
      await expect(visitPurposeField).toHaveValue('tourism');
      
      // Test UK address validation (should require full address with postcode)
      const ukAddressField = page.getByTestId('field-ukAddress');
      await ukAddressField.fill('123 London Street, London'); // Missing postcode
      await page.getByTestId('validate-form-button').click();
      await expect(page.getByText('UK address should include postcode')).toBeVisible();
      
      // Fix validation error
      await ukAddressField.fill('123 London Street, London, SW1A 1AA');
      await page.getByTestId('validate-form-button').click();
      await expect(page.getByText('Form validation passed')).toBeVisible();
    });

    test('should handle security questions correctly', async ({ page }) => {
      // Test security questions - most users should answer 'No'
      const securityQuestionTestIds = [
        'field-criminalRecord',
        'field-immigrationBreach',
        'field-ukRefusal',
        'field-terrorismAssociation',
      ];

      for (const testId of securityQuestionTestIds) {
        const questionLocator = page.getByTestId(testId);
        await questionLocator.getByRole('radio', { name: 'No' }).click();
        await expect(questionLocator.locator('input[value="false"]')).toBeChecked();
      }
    });

    test('should test automation readiness for UK ETA', async ({ page }) => {
      // Check that specific key fields expected to be auto-filled have the badge
      await expect(page.getByTestId('field-givenNames').locator('[data-testid="auto-filled-badge"]')).toBeVisible();
      await expect(page.getByTestId('field-familyName').locator('[data-testid="auto-filled-badge"]')).toBeVisible();
      await expect(page.getByTestId('field-passportNumber').locator('[data-testid="auto-filled-badge"]')).toBeVisible();
      await expect(page.getByTestId('field-dateOfBirth').locator('[data-testid="auto-filled-badge"]')).toBeVisible();
      await expect(page.getByTestId('field-nationality').locator('[data-testid="auto-filled-badge"]')).toBeVisible();
      
      // Check that UK-specific fields are marked as requiring input
      await expect(page.getByTestId('field-title')).toHaveAttribute('data-country-specific', 'true');
      await expect(page.getByTestId('field-otherNames')).toHaveAttribute('data-country-specific', 'true');
      await expect(page.getByTestId('field-confirmEmail')).toHaveAttribute('data-country-specific', 'true');
      await expect(page.getByTestId('field-employmentStatus')).toHaveAttribute('data-country-specific', 'true');
      await expect(page.getByTestId('field-visitPurpose')).toHaveAttribute('data-country-specific', 'true');
      await expect(page.getByTestId('field-ukAddress')).toHaveAttribute('data-country-specific', 'true');
      await expect(page.getByTestId('field-criminalRecord')).toHaveAttribute('data-country-specific', 'true');
    });
  });

  test('should display UK ETA preparation checklist', async ({ page }) => {
    await page.getByTestId('uk-leg-card').click();
    await page.getByTestId('submission-guide-button').click();
    
    // Check preparation tips
    await expect(page.getByText('Create GOV.UK One Login account first')).toBeVisible();
    await expect(page.getByText('Have passport valid for entire stay ready')).toBeVisible();
    await expect(page.getByText('Prepare UK accommodation address with postcode')).toBeVisible();
    await expect(page.getByText('Know your employment status and occupation')).toBeVisible();
    await expect(page.getByText('Have a digital passport-style photo')).toBeVisible();
    await expect(page.getByText('Credit or debit card for £10 application fee')).toBeVisible();
    await expect(page.getByText('Submit at least 72 hours before travel')).toBeVisible();
    
    // Check time estimates
    await expect(page.getByText('Preparation: 8 minutes')).toBeVisible();
    await expect(page.getByText('Submission: 15 minutes')).toBeVisible();
    await expect(page.getByText('Total: 23 minutes')).toBeVisible();
  });

  test('should handle QR code capture for UK ETA', async ({ page }) => {
    // Navigate to QR wallet
    await page.getByTestId('tab-wallet').click();
    await page.getByTestId('add-qr-button').click();
    
    // Select UK ETA
    await page.getByTestId('qr-source-select').click();
    await page.getByRole('option', { name: 'UK Electronic Travel Authorisation' }).click();
    
    // Test manual QR code entry
    await page.getByTestId('manual-entry-tab').click();
    await page.getByTestId('qr-description-input').fill('UK ETA - Heathrow Entry');
    await page.getByTestId('qr-data-input').fill('UK-ETA-987654321');
    
    await page.getByTestId('save-qr-button').click();
    
    // Verify QR code is saved
    await expect(page.getByText('UK ETA - Heathrow Entry')).toBeVisible();
    await expect(page.getByText('GBR')).toBeVisible(); // Country code badge
  });

  test('should show UK ETA common issues and troubleshooting', async ({ page }) => {
    await page.getByTestId('uk-leg-card').click();
    await page.getByTestId('submission-guide-button').click();
    
    // Check troubleshooting section
    await page.getByTestId('troubleshooting-section').click();
    
    await expect(page.getByText('Processing usually takes up to 3 working days')).toBeVisible();
    await expect(page.getByText('Account creation requires email verification')).toBeVisible();
    await expect(page.getByText('Photo must meet UK passport standards')).toBeVisible();
    await expect(page.getByText('ETA is valid for 2 years or until passport expires')).toBeVisible();
    await expect(page.getByText('Multiple visits allowed - up to 6 months each')).toBeVisible();
    await expect(page.getByText('Background questions must be answered truthfully')).toBeVisible();
  });

});

test.describe('UK ETA Portal Health', () => {
  test('should check UK ETA portal availability', async ({ page }) => {
    await page.goto('/settings');
    await page.getByTestId('portal-health-check').click();
    
    // Wait for health check to complete
    await page.waitForSelector('[data-testid="health-check-results"]', { timeout: 10000 });
    
    // Check UK ETA status
    const ukStatus = page.getByTestId('portal-status-GBR');
    await expect(ukStatus).toBeVisible();
    
    // Should show either healthy, degraded, or offline
    const statusText = await ukStatus.textContent();
    expect(['healthy', 'degraded', 'offline']).toContain(statusText?.toLowerCase());
  });
});