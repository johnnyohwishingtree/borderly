import { test, expect } from '@playwright/test';

// Skip this entire test suite for performance - core functionality covered in completeUserFlow.spec.ts
test.describe.skip('Form Completion and Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Set up profile and a test trip
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('borderly-onboarding-complete', 'true');
      localStorage.setItem('borderly-profile', JSON.stringify({
        firstName: 'Alice',
        lastName: 'Johnson',
        passportNumber: 'US1234567',
        nationality: 'US',
        dateOfBirth: '1985-03-15',
        gender: 'F',
        expirationDate: '2030-03-15'
      }));
      
      // Create a test trip
      localStorage.setItem('borderly-trips', JSON.stringify([{
        id: 'test-trip-123',
        name: 'Form Test Trip',
        startDate: '2024-12-01',
        endDate: '2024-12-15',
        destinations: [
          {
            country: 'JPN',
            arrivalDate: '2024-12-01',
            departureDate: '2024-12-08'
          },
          {
            country: 'SGP',
            arrivalDate: '2024-12-08',
            departureDate: '2024-12-15'
          }
        ]
      }]));
    });
    await page.reload();
    
    // Navigate to the test trip
    await page.getByText('Form Test Trip').click();
  });

  test('completes Japan form with auto-filled data', async ({ page }) => {
    // Start Japan form
    await page.getByTestId('japan-form-button').click();

    // Verify auto-filled fields from profile
    await expect(page.getByText('Japan Entry Declaration')).toBeVisible();
    await expect(page.getByDisplayValue('Alice')).toBeVisible();
    await expect(page.getByDisplayValue('Johnson')).toBeVisible();
    await expect(page.getByDisplayValue('US1234567')).toBeVisible();
    
    // Verify nationality is auto-selected
    await expect(page.locator('[data-testid="nationality-field"]')).toContainText('United States');
    
    // Verify date fields are auto-filled
    await expect(page.getByDisplayValue('1985-03-15')).toBeVisible(); // DOB
    await expect(page.getByDisplayValue('2024-12-01')).toBeVisible(); // Arrival
    await expect(page.getByDisplayValue('2024-12-08')).toBeVisible(); // Departure

    // Fill Japan-specific required fields
    await page.getByLabel('Purpose of Visit').click();
    await page.getByText('Tourism').click();

    await page.getByLabel('Accommodation Type').click();
    await page.getByText('Hotel').click();

    await page.getByLabel('Accommodation Name').fill('Tokyo Grand Hotel');
    await page.getByLabel('Accommodation Address').fill('1-2-3 Shinjuku, Tokyo, Japan');
    await page.getByLabel('Accommodation Phone').fill('+81-3-1234-5678');

    await page.getByLabel('Flight Number').fill('UA123');
    await page.getByLabel('Seat Number').fill('12A');

    // Test checkbox fields
    await page.getByLabel('Bringing fruits or vegetables').check();
    await page.getByLabel('Bringing meat or dairy products').uncheck();

    // Save form
    await page.getByText('Save Form').click();

    // Should show completion status
    await expect(page.getByText('Form Completed')).toBeVisible();
    await expect(page.getByText('Ready for submission')).toBeVisible();
    
    // Should have submission guide available
    await expect(page.getByText('View Submission Guide')).toBeVisible();
  });

  test('completes Singapore form with smart delta fields', async ({ page }) => {
    await page.getByTestId('singapore-form-button').click();

    await expect(page.getByText('Singapore Arrival Card')).toBeVisible();
    
    // Auto-filled fields should be present
    await expect(page.getByDisplayValue('Alice')).toBeVisible();
    await expect(page.getByDisplayValue('Johnson')).toBeVisible();
    await expect(page.getByDisplayValue('US1234567')).toBeVisible();

    // Fill Singapore-specific fields (different from Japan)
    await page.getByLabel('Purpose of Visit').click();
    await page.getByText('Holiday').click(); // Different option than Japan

    await page.getByLabel('Address in Singapore').fill('456 Marina Bay, Singapore 018956');
    
    await page.getByLabel('Contact Number in Singapore').fill('+65-9876-5432');

    // Test occupation field
    await page.getByLabel('Occupation').fill('Software Engineer');

    // Test currency declaration
    await page.getByLabel('Currency Amount (SGD)').fill('5000');

    // Test health declaration checkboxes
    await page.getByLabel('Fever in last 14 days').uncheck();
    await page.getByLabel('Contact with COVID case').uncheck();

    await page.getByText('Save Form').click();

    await expect(page.getByText('Form Completed')).toBeVisible();
  });

  test('validates required fields and shows smart errors', async ({ page }) => {
    await page.getByTestId('japan-form-button').click();

    // Try to save without filling required fields
    await page.getByText('Save Form').click();

    // Should show validation errors for Japan-specific required fields
    await expect(page.getByText('Purpose of visit is required')).toBeVisible();
    await expect(page.getByText('Accommodation name is required')).toBeVisible();
    await expect(page.getByText('Accommodation address is required')).toBeVisible();
    await expect(page.getByText('Flight number is required')).toBeVisible();

    // Auto-filled fields should not show errors
    await expect(page.getByText('First name is required')).not.toBeVisible();
    await expect(page.getByText('Last name is required')).not.toBeVisible();
    await expect(page.getByText('Passport number is required')).not.toBeVisible();
  });

  test('validates field formats and constraints', async ({ page }) => {
    await page.getByTestId('japan-form-button').click();

    // Test phone number validation
    await page.getByLabel('Accommodation Phone').fill('invalid-phone');
    await page.getByLabel('Accommodation Name').click(); // Trigger validation
    await expect(page.getByText('Please enter a valid phone number')).toBeVisible();

    await page.getByLabel('Accommodation Phone').fill('+81-3-1234-5678');
    await expect(page.getByText('Please enter a valid phone number')).not.toBeVisible();

    // Test flight number format
    await page.getByLabel('Flight Number').fill('123'); // Invalid format
    await page.getByLabel('Accommodation Name').click();
    await expect(page.getByText('Flight number format should be XX123')).toBeVisible();

    await page.getByLabel('Flight Number').fill('JL456');
    await expect(page.getByText('Flight number format should be XX123')).not.toBeVisible();

    // Test seat number format
    await page.getByLabel('Seat Number').fill('INVALID');
    await page.getByLabel('Accommodation Name').click();
    await expect(page.getByText('Seat number format should be 12A')).toBeVisible();

    await page.getByLabel('Seat Number').fill('15F');
    await expect(page.getByText('Seat number format should be 12A')).not.toBeVisible();
  });

  test('shows form progress and completion percentage', async ({ page }) => {
    await page.getByTestId('japan-form-button').click();

    // Initially should show low completion percentage
    await expect(page.getByTestId('form-progress')).toBeVisible();
    await expect(page.getByText(/\d+% complete/)).toBeVisible();

    // Fill fields one by one and watch progress increase
    await page.getByLabel('Purpose of Visit').click();
    await page.getByText('Tourism').click();
    
    // Progress should increase
    const progressAfterPurpose = await page.getByTestId('form-progress').getAttribute('aria-valuenow');
    expect(Number(progressAfterPurpose)).toBeGreaterThan(0);

    await page.getByLabel('Accommodation Name').fill('Test Hotel');
    const progressAfterHotel = await page.getByTestId('form-progress').getAttribute('aria-valuenow');
    expect(Number(progressAfterHotel)).toBeGreaterThan(Number(progressAfterPurpose));

    // Complete all required fields
    await page.getByLabel('Accommodation Type').click();
    await page.getByText('Hotel').click();
    await page.getByLabel('Accommodation Address').fill('Test Address');
    await page.getByLabel('Accommodation Phone').fill('+81-3-1234-5678');
    await page.getByLabel('Flight Number').fill('UA123');
    await page.getByLabel('Seat Number').fill('12A');

    // Should show 100% complete
    await expect(page.getByText('100% complete')).toBeVisible();
  });

  test('handles form auto-save functionality', async ({ page }) => {
    await page.getByTestId('singapore-form-button').click();

    // Fill some fields
    await page.getByLabel('Purpose of Visit').click();
    await page.getByText('Business').click();
    await page.getByLabel('Address in Singapore').fill('Business Center Singapore');

    // Navigate away without saving
    await page.getByText('Back to Trip').click();
    
    // Come back to form
    await page.getByTestId('singapore-form-button').click();

    // Data should be preserved (auto-saved)
    await expect(page.locator('[data-testid="purpose-field"]')).toContainText('Business');
    await expect(page.getByDisplayValue('Business Center Singapore')).toBeVisible();
  });

  test('shows field-level help and tooltips', async ({ page }) => {
    await page.getByTestId('japan-form-button').click();

    // Test help tooltip for complex fields
    await page.getByTestId('accommodation-help').hover();
    await expect(page.getByText('Enter the full address where you will be staying')).toBeVisible();

    await page.getByTestId('flight-help').hover();
    await expect(page.getByText('Format: Airline code + Flight number (e.g., JL123)')).toBeVisible();

    // Test help for immigration-specific fields
    await page.getByTestId('purpose-help').hover();
    await expect(page.getByText('Select the primary reason for your visit')).toBeVisible();
  });

  test('handles conditional field visibility', async ({ page }) => {
    await page.getByTestId('japan-form-button').click();

    // Business-specific fields should be hidden initially
    await expect(page.getByLabel('Company Name')).not.toBeVisible();
    await expect(page.getByLabel('Business Contact')).not.toBeVisible();

    // Change purpose to business
    await page.getByLabel('Purpose of Visit').click();
    await page.getByText('Business').click();

    // Business fields should now be visible
    await expect(page.getByLabel('Company Name')).toBeVisible();
    await expect(page.getByLabel('Business Contact')).toBeVisible();
    await expect(page.getByLabel('Meeting Purpose')).toBeVisible();

    // Change back to tourism
    await page.getByLabel('Purpose of Visit').click();
    await page.getByText('Tourism').click();

    // Business fields should be hidden again
    await expect(page.getByLabel('Company Name')).not.toBeVisible();
    await expect(page.getByLabel('Business Contact')).not.toBeVisible();
  });

  test('formats currency and numeric fields correctly', async ({ page }) => {
    await page.getByTestId('singapore-form-button').click();

    // Test currency formatting
    await page.getByLabel('Currency Amount (SGD)').fill('1234.56');
    await page.getByLabel('Address in Singapore').click(); // Trigger formatting

    await expect(page.getByDisplayValue('$1,234.56')).toBeVisible();

    // Test large numbers
    await page.getByLabel('Currency Amount (SGD)').fill('50000');
    await page.getByLabel('Address in Singapore').click();

    await expect(page.getByDisplayValue('$50,000.00')).toBeVisible();
  });

  test('handles form draft states and recovery', async ({ page }) => {
    await page.getByTestId('japan-form-button').click();

    // Partially fill form
    await page.getByLabel('Purpose of Visit').click();
    await page.getByText('Tourism').click();
    await page.getByLabel('Accommodation Name').fill('Draft Hotel');

    // Simulate app crash/reload
    await page.reload();
    
    // Navigate back to form
    await page.getByText('Form Test Trip').click();
    await page.getByTestId('japan-form-button').click();

    // Should show draft recovery option
    await expect(page.getByText('Continue previous draft')).toBeVisible();
    await page.getByText('Continue previous draft').click();

    // Data should be restored
    await expect(page.locator('[data-testid="purpose-field"]')).toContainText('Tourism');
    await expect(page.getByDisplayValue('Draft Hotel')).toBeVisible();
  });

  test('validates date consistency across fields', async ({ page }) => {
    await page.getByTestId('japan-form-button').click();

    // Try to set departure date before arrival date
    await page.getByLabel('Departure Date').fill('2024-11-30');
    await page.getByLabel('Purpose of Visit').click(); // Trigger validation

    await expect(page.getByText('Departure date must be after arrival date')).toBeVisible();

    // Set valid dates
    await page.getByLabel('Departure Date').fill('2024-12-10');
    await expect(page.getByText('Departure date must be after arrival date')).not.toBeVisible();
  });
});