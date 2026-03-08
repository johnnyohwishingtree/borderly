/**
 * USA ESTA Submission E2E Tests
 * 
 * Tests the complete USA Electronic System for Travel Authorization (ESTA) 
 * submission workflow from form generation to portal guidance and QR code handling.
 */

import { test, expect } from '@playwright/test';

test.describe('USA ESTA Submission Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Navigate through onboarding to reach trips
    await page.getByTestId('skip-onboarding').click();
    await page.getByTestId('tab-trips').click();

    // Create a new trip with a USA leg for all tests in this suite
    await page.getByTestId('create-trip-button').click();
    await page.getByTestId('trip-title-input').fill('New York Business Trip');
    
    // Add USA leg with dynamic dates
    await page.getByTestId('add-leg-button').click();
    await page.getByTestId('country-select').click();
    await page.getByRole('option', { name: 'United States' }).click();
    
    // Use dynamic dates to prevent future test failures
    const arrivalDate = new Date();
    arrivalDate.setFullYear(arrivalDate.getFullYear() + 1);
    const departureDate = new Date(arrivalDate);
    departureDate.setDate(departureDate.getDate() + 10);
    await page.getByTestId('arrival-date-input').fill(arrivalDate.toISOString().split('T')[0]);
    await page.getByTestId('departure-date-input').fill(departureDate.toISOString().split('T')[0]);
    
    await page.getByTestId('save-trip-button').click();
  });

  test('should generate USA ESTA form with auto-filled data', async ({ page }) => {
    // Open USA leg form (trip created in beforeEach)
    await page.getByTestId('usa-leg-card').click();
    await page.getByTestId('fill-form-button').click();
    
    // Verify form sections are present
    await expect(page.getByText('Applicant Information')).toBeVisible();
    await expect(page.getByText('Passport Information')).toBeVisible();
    await expect(page.getByText('Contact Information')).toBeVisible();
    await expect(page.getByText('Employment Information')).toBeVisible();
    await expect(page.getByText('Emergency Contact')).toBeVisible();
    await expect(page.getByText('Travel Information')).toBeVisible();
    await expect(page.getByText('Eligibility Questions')).toBeVisible();
    
    // Check auto-filled fields (assuming profile is set up)
    const surnameField = page.getByTestId('field-surname');
    await expect(surnameField).toHaveValue(/^[A-Za-z\s'-]+$/);
    
    const firstNameField = page.getByTestId('field-firstName');
    await expect(firstNameField).toHaveValue(/^[A-Za-z\s'-]+$/);
    
    const passportNumberField = page.getByTestId('field-passportNumber');
    await expect(passportNumberField).toHaveValue(/^[A-Z0-9]{6,9}$/);
    
    // Check USA-specific fields are present
    await expect(page.getByTestId('field-aliases')).toBeVisible();
    await expect(page.getByTestId('field-emergencyContactName')).toBeVisible();
    await expect(page.getByTestId('field-emergencyContactPhone')).toBeVisible();
    await expect(page.getByTestId('field-purposeOfTravel')).toBeVisible();
    await expect(page.getByTestId('field-addressInUS')).toBeVisible();
    await expect(page.getByTestId('field-mentalDisorder')).toBeVisible();
    await expect(page.getByTestId('field-drugConviction')).toBeVisible();
  });

  test('should show USA ESTA submission guide', async ({ page }) => {
    // Navigate to submission guide (trip created in beforeEach)
    await page.getByTestId('usa-leg-card').click();
    await page.getByTestId('submission-guide-button').click();
    
    // Verify guide steps are present
    await expect(page.getByText('Access Official ESTA Website')).toBeVisible();
    await expect(page.getByText('Start New Application')).toBeVisible();
    await expect(page.getByText('Enter Applicant Information')).toBeVisible();
    await expect(page.getByText('Passport Information')).toBeVisible();
    await expect(page.getByText('Contact Information')).toBeVisible();
    await expect(page.getByText('Employment Information')).toBeVisible();
    await expect(page.getByText('Emergency Contact')).toBeVisible();
    await expect(page.getByText('Travel Information')).toBeVisible();
    await expect(page.getByText('Eligibility Questions')).toBeVisible();
    await expect(page.getByText('Review Application')).toBeVisible();
    await expect(page.getByText('Submit and Pay')).toBeVisible();
    await expect(page.getByText('Check Status and Approval')).toBeVisible();
    
    // Test portal launch
    const launchPortalButton = page.getByTestId('launch-portal-button');
    await expect(launchPortalButton).toBeVisible();
    await expect(launchPortalButton).toContainText('Open ESTA Portal');
    
    // Check portal URL is correct
    await expect(page.getByText('https://esta.cbp.dhs.gov/')).toBeVisible();
  });

  test.describe('on the USA ESTA form', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to form
      await page.getByTestId('usa-leg-card').click();
      await page.getByTestId('fill-form-button').click();
    });

    test('should handle USA ESTA-specific form validation', async ({ page }) => {
      // Test aliases question
      const aliasesField = page.getByTestId('field-aliases');
      await aliasesField.getByRole('radio', { name: 'No' }).click();
      await expect(aliasesField.locator('input[value="false"]')).toBeChecked();
      
      // Test purpose of travel selection
      const purposeField = page.getByTestId('field-purposeOfTravel');
      await purposeField.click();
      await page.getByRole('option', { name: 'Tourism' }).click();
      await expect(purposeField).toHaveValue('tourism');
      
      // Test US address validation
      const usAddressField = page.getByTestId('field-addressInUS');
      await usAddressField.fill('Hotel Name, 123 Main St, New York, NY 10001');
      
      // Test emergency contact validation
      const emergencyNameField = page.getByTestId('field-emergencyContactName');
      await emergencyNameField.fill('John Smith');
      
      const emergencyPhoneField = page.getByTestId('field-emergencyContactPhone');
      await emergencyPhoneField.fill('+1-555-123-4567');
      
      await page.getByTestId('validate-form-button').click();
      await expect(page.getByText('Form validation passed')).toBeVisible();
    });

    test('should handle eligibility questions correctly', async ({ page }) => {
      // Test eligibility questions - most users should answer 'No'
      const eligibilityQuestionTestIds = [
        'field-mentalDisorder',
        'field-drugConviction',
        'field-childAbduction',
        'field-crimeConviction',
        'field-controlledSubstance',
        'field-prostitution',
        'field-moneyLaundering',
        'field-humanTrafficking',
        'field-terrorism',
        'field-genocide',
        'field-childSoldier',
        'field-religiousFreedom',
        'field-visaRefusal',
      ];

      for (const testId of eligibilityQuestionTestIds) {
        const questionLocator = page.getByTestId(testId);
        await questionLocator.getByRole('radio', { name: 'No' }).click();
        await expect(questionLocator.locator('input[value="false"]')).toBeChecked();
      }
    });

    test('should test automation readiness for USA ESTA', async ({ page }) => {
      // Check that specific key fields expected to be auto-filled have the badge
      await expect(page.getByTestId('field-surname').locator('[data-testid="auto-filled-badge"]')).toBeVisible();
      await expect(page.getByTestId('field-firstName').locator('[data-testid="auto-filled-badge"]')).toBeVisible();
      await expect(page.getByTestId('field-passportNumber').locator('[data-testid="auto-filled-badge"]')).toBeVisible();
      await expect(page.getByTestId('field-dateOfBirth').locator('[data-testid="auto-filled-badge"]')).toBeVisible();
      await expect(page.getByTestId('field-passportCountry').locator('[data-testid="auto-filled-badge"]')).toBeVisible();
      
      // Check that USA-specific fields are marked as requiring input
      await expect(page.getByTestId('field-aliases')).toHaveAttribute('data-country-specific', 'true');
      await expect(page.getByTestId('field-emergencyContactName')).toHaveAttribute('data-country-specific', 'true');
      await expect(page.getByTestId('field-emergencyContactPhone')).toHaveAttribute('data-country-specific', 'true');
      await expect(page.getByTestId('field-purposeOfTravel')).toHaveAttribute('data-country-specific', 'true');
      await expect(page.getByTestId('field-mentalDisorder')).toHaveAttribute('data-country-specific', 'true');
      await expect(page.getByTestId('field-visaRefusal')).toHaveAttribute('data-country-specific', 'true');
    });

    test('should validate passport requirements for VWP countries', async ({ page }) => {
      // Test that passport country validation works
      const passportCountryField = page.getByTestId('field-passportCountry');
      
      // Test with VWP country (should be valid)
      await passportCountryField.fill('United Kingdom');
      await page.getByTestId('validate-form-button').click();
      await expect(page.getByText('Passport country is eligible for ESTA')).toBeVisible();
      
      // Test with non-VWP country (should show warning)
      await passportCountryField.fill('China');
      await page.getByTestId('validate-form-button').click();
      await expect(page.getByText('This passport country may not be eligible for ESTA')).toBeVisible();
    });
  });

  test('should display USA ESTA preparation checklist', async ({ page }) => {
    await page.getByTestId('usa-leg-card').click();
    await page.getByTestId('submission-guide-button').click();
    
    // Check preparation tips
    await expect(page.getByText('No account creation required - single session process')).toBeVisible();
    await expect(page.getByText('Have passport from Visa Waiver Program country ready')).toBeVisible();
    await expect(page.getByText('Prepare employment and emergency contact information')).toBeVisible();
    await expect(page.getByText('Know your US accommodation address or contact person')).toBeVisible();
    await expect(page.getByText('Submit at least 72 hours before departure')).toBeVisible();
    await expect(page.getByText('Have credit card ready for $21 authorization fee')).toBeVisible();
    await expect(page.getByText('ESTA is valid for 2 years or until passport expires')).toBeVisible();
    
    // Check time estimates
    await expect(page.getByText('Preparation: 10 minutes')).toBeVisible();
    await expect(page.getByText('Submission: 25 minutes')).toBeVisible();
    await expect(page.getByText('Total: 35 minutes')).toBeVisible();
    
    // Check important warnings
    await expect(page.getByText('Beware of unofficial sites charging additional fees')).toBeVisible();
    await expect(page.getByText('only use esta.cbp.dhs.gov')).toBeVisible();
  });

  test('should handle QR code capture for USA ESTA', async ({ page }) => {
    // Navigate to QR wallet
    await page.getByTestId('tab-wallet').click();
    await page.getByTestId('add-qr-button').click();
    
    // Select USA ESTA
    await page.getByTestId('qr-source-select').click();
    await page.getByRole('option', { name: 'Electronic System for Travel Authorization (ESTA)' }).click();
    
    // Test manual QR code entry
    await page.getByTestId('manual-entry-tab').click();
    await page.getByTestId('qr-description-input').fill('USA ESTA - JFK Entry');
    await page.getByTestId('qr-data-input').fill('ESTA-US-123456789');
    
    await page.getByTestId('save-qr-button').click();
    
    // Verify QR code is saved
    await expect(page.getByText('USA ESTA - JFK Entry')).toBeVisible();
    await expect(page.getByText('USA')).toBeVisible(); // Country code badge
  });

  test('should show USA ESTA common issues and troubleshooting', async ({ page }) => {
    await page.getByTestId('usa-leg-card').click();
    await page.getByTestId('submission-guide-button').click();
    
    // Check troubleshooting section
    await page.getByTestId('troubleshooting-section').click();
    
    await expect(page.getByText('Processing usually takes minutes to hours, can take up to 72 hours')).toBeVisible();
    await expect(page.getByText('Eligibility questions must be answered truthfully')).toBeVisible();
    await expect(page.getByText('Payment is required regardless of approval or denial')).toBeVisible();
    await expect(page.getByText('Multiple entries allowed - up to 90 days each visit')).toBeVisible();
    await expect(page.getByText('Contact person in US can be hotel or tour operator')).toBeVisible();
    await expect(page.getByText('ESTA approval does not guarantee entry - final decision at port of entry')).toBeVisible();
  });

  test('should validate ESTA eligibility requirements', async ({ page }) => {
    await page.getByTestId('usa-leg-card').click();
    await page.getByTestId('fill-form-button').click();
    
    // Check that eligibility warning is shown
    await expect(page.getByText('ESTA is only for citizens of Visa Waiver Program countries')).toBeVisible();
    await expect(page.getByText('Maximum stay: 90 days per visit')).toBeVisible();
    await expect(page.getByText('Cannot be extended or changed to other visa status')).toBeVisible();
    
    // Check that passport validity warning is shown
    await expect(page.getByText('Passport must be valid for duration of stay')).toBeVisible();
    await expect(page.getByText('E-Passport with electronic chip required')).toBeVisible();
  });
});

test.describe('USA ESTA Portal Health', () => {
  test('should check USA ESTA portal availability', async ({ page }) => {
    await page.goto('/settings');
    await page.getByTestId('portal-health-check').click();
    
    // Wait for health check to complete
    await page.waitForSelector('[data-testid="health-check-results"]', { timeout: 10000 });
    
    // Check USA ESTA status
    const usaStatus = page.getByTestId('portal-status-USA');
    await expect(usaStatus).toBeVisible();
    
    // Should show either healthy, degraded, or offline
    const statusText = await usaStatus.textContent();
    expect(['healthy', 'degraded', 'offline']).toContain(statusText?.toLowerCase());
    
    // Check response time is reasonable (under 10 seconds for health check)
    const responseTimeElement = page.getByTestId('usa-response-time');
    await expect(responseTimeElement).toBeVisible();
    const responseTime = await responseTimeElement.textContent();
    const timeInMs = parseInt(responseTime?.replace(/[^\d]/g, '') || '0');
    expect(timeInMs).toBeLessThan(10000);
  });

  test('should detect ESTA portal maintenance periods', async ({ page }) => {
    // Mock health check API to simulate maintenance scenario
    await page.route('**/api/portal/health/USA', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'maintenance',
          message: 'ESTA system maintenance',
          estimatedDuration: '2-4 hours',
          nextCheck: new Date(Date.now() + 3600000).toISOString()
        })
      });
    });

    await page.goto('/settings');
    await page.getByTestId('portal-health-check').click();
    
    // Wait for health check
    await page.waitForSelector('[data-testid="health-check-results"]', { timeout: 10000 });
    
    // Verify maintenance messaging is displayed
    const maintenanceNotice = page.getByTestId('usa-maintenance-notice');
    await expect(maintenanceNotice).toBeVisible();
    await expect(maintenanceNotice).toContainText('ESTA system maintenance');
    await expect(page.getByText('Please try again later')).toBeVisible();
  });
});

test.describe('USA ESTA Security Features', () => {
  test('should validate official ESTA website warning', async ({ page }) => {
    await page.getByTestId('usa-leg-card').click();
    await page.getByTestId('submission-guide-button').click();
    
    // Check security warnings are prominent
    await expect(page.getByText('Only use esta.cbp.dhs.gov - the official site')).toBeVisible();
    await expect(page.getByText('Avoid third-party sites that charge extra fees')).toBeVisible();
    await expect(page.getByText('The official fee is $21 per application')).toBeVisible();
    
    // Check that unofficial site warning is highlighted
    const warningBox = page.getByTestId('security-warning-box');
    await expect(warningBox).toBeVisible();
    await expect(warningBox).toHaveClass(/warning|alert|danger/);
  });

  test('should show data privacy information', async ({ page }) => {
    await page.getByTestId('usa-leg-card').click();
    await page.getByTestId('submission-guide-button').click();
    
    // Check privacy information
    await expect(page.getByText('Your data is submitted directly to U.S. Customs and Border Protection')).toBeVisible();
    await expect(page.getByText('Borderly does not store your ESTA application data')).toBeVisible();
    await expect(page.getByText('All communication is encrypted and secure')).toBeVisible();
  });
});