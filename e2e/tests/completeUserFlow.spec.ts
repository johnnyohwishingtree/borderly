import { test, expect } from '@playwright/test';

test.describe('Complete User Flow', () => {
  test('onboarding to trip creation to form completion workflow', async ({ page }) => {
    await page.goto('/');

    // Welcome screen
    await expect(page.getByText('Welcome to')).toBeVisible();
    await expect(page.getByText('Borderly')).toBeVisible();

    // Start onboarding
    const startButton = page.getByLabel('Get started with Borderly');
    await startButton.click();

    // Should navigate to passport scan screen
    await expect(page.getByText('Scan Your Passport')).toBeVisible();
    await expect(page.getByText('Hold your passport under the camera')).toBeVisible();

    // Mock passport scan success (since camera is mocked)
    const skipScanButton = page.getByText('Skip for now');
    if (await skipScanButton.isVisible()) {
      await skipScanButton.click();
    }

    // Manual profile entry should be visible
    await expect(page.getByText('Confirm Your Profile')).toBeVisible();
    
    // Fill out basic profile information
    await page.getByLabel('First Name').fill('John');
    await page.getByLabel('Last Name').fill('Doe');
    await page.getByLabel('Passport Number').fill('AB1234567');
    await page.getByLabel('Nationality').click();
    await page.getByText('United States').click();
    
    // Set date of birth
    await page.getByLabel('Date of Birth').fill('1990-01-01');
    await page.getByLabel('Gender').click();
    await page.getByText('Male').click();
    
    // Continue to next step
    await page.getByText('Continue').click();

    // Biometric setup screen
    await expect(page.getByText('Secure Your Profile')).toBeVisible();
    await expect(page.getByText('biometric authentication')).toBeVisible();
    
    // Skip biometric setup for testing
    await page.getByText('Skip for now').click();

    // Should reach main app - trip list screen
    await expect(page.getByText('My Trips')).toBeVisible();
    await expect(page.getByText('Create Your First Trip')).toBeVisible();

    // Create a new trip
    await page.getByText('Create Trip').click();
    
    // Fill out trip details
    await expect(page.getByText('Create New Trip')).toBeVisible();
    await page.getByLabel('Trip Name').fill('Asia Travel 2024');
    await page.getByLabel('Start Date').fill('2024-06-01');
    await page.getByLabel('End Date').fill('2024-06-15');
    
    // Add destinations
    await page.getByText('Add Destination').click();
    await page.getByLabel('Country').click();
    await page.getByText('Japan').click();
    await page.getByLabel('Arrival Date').fill('2024-06-01');
    await page.getByLabel('Departure Date').fill('2024-06-05');
    
    // Add second destination
    await page.getByText('Add Another Destination').click();
    await page.locator('[data-testid="destination-1"] [aria-label="Country"]').click();
    await page.getByText('Singapore').click();
    await page.locator('[data-testid="destination-1"] [aria-label="Arrival Date"]').fill('2024-06-05');
    await page.locator('[data-testid="destination-1"] [aria-label="Departure Date"]').fill('2024-06-10');
    
    // Save trip
    await page.getByText('Create Trip').click();

    // Should navigate to trip detail screen
    await expect(page.getByText('Asia Travel 2024')).toBeVisible();
    await expect(page.getByText('Japan')).toBeVisible();
    await expect(page.getByText('Singapore')).toBeVisible();

    // Start filling forms for Japan
    await page.getByTestId('japan-form-button').click();
    
    // Form screen for Japan
    await expect(page.getByText('Japan Entry Declaration')).toBeVisible();
    
    // Auto-filled fields should be present with data
    await expect(page.getByDisplayValue('John')).toBeVisible();
    await expect(page.getByDisplayValue('Doe')).toBeVisible();
    await expect(page.getByDisplayValue('AB1234567')).toBeVisible();
    
    // Fill remaining required fields
    await page.getByLabel('Purpose of Visit').click();
    await page.getByText('Tourism').click();
    
    await page.getByLabel('Accommodation Name').fill('Tokyo Hotel');
    await page.getByLabel('Accommodation Address').fill('123 Tokyo Street, Tokyo, Japan');
    
    await page.getByLabel('Flight Number').fill('UA123');
    
    // Save form
    await page.getByText('Save Form').click();
    
    // Should show form completion status
    await expect(page.getByText('Form Completed')).toBeVisible();
    
    // Navigate to submission guide
    await page.getByText('View Submission Guide').click();
    
    // Submission guide should show step-by-step instructions
    await expect(page.getByText('Visit Japan Web Submission')).toBeVisible();
    await expect(page.getByText('Step 1')).toBeVisible();
    await expect(page.getByText('Go to Visit Japan Web')).toBeVisible();
    
    // Copyable fields should be present
    await expect(page.getByTestId('copy-field-name')).toBeVisible();
    await expect(page.getByTestId('copy-field-passport')).toBeVisible();
    
    // Test copying functionality
    await page.getByTestId('copy-field-name').click();
    // Note: Clipboard API testing in Playwright is limited, but button should be clickable
    
    // Navigate back to trip detail
    await page.getByText('Back to Trip').click();
    
    // Verify we're back at trip detail and Japan form is marked complete
    await expect(page.getByText('Asia Travel 2024')).toBeVisible();
    await expect(page.getByTestId('japan-status-complete')).toBeVisible();
    
    // Start Singapore form
    await page.getByTestId('singapore-form-button').click();
    
    // Singapore form should also have auto-filled data
    await expect(page.getByText('Singapore Arrival Card')).toBeVisible();
    await expect(page.getByDisplayValue('John')).toBeVisible();
    await expect(page.getByDisplayValue('Doe')).toBeVisible();
    
    // Fill Singapore-specific fields
    await page.getByLabel('Purpose of Visit').click();
    await page.getByText('Holiday').click();
    
    await page.getByLabel('Address in Singapore').fill('456 Singapore Street, Singapore');
    
    // Save Singapore form
    await page.getByText('Save Form').click();
    
    await expect(page.getByText('Form Completed')).toBeVisible();
  });

  test('handles form validation errors gracefully', async ({ page }) => {
    await page.goto('/');

    // Navigate through onboarding quickly
    await page.getByLabel('Get started with Borderly').click();
    
    // Skip passport scan
    const skipButton = page.getByText('Skip for now');
    if (await skipButton.isVisible()) {
      await skipButton.click();
    }

    // Try to continue without filling required fields
    await page.getByText('Continue').click();
    
    // Should show validation errors
    await expect(page.getByText('First name is required')).toBeVisible();
    await expect(page.getByText('Last name is required')).toBeVisible();
    await expect(page.getByText('Passport number is required')).toBeVisible();
  });

  test('persists data between sessions', async ({ page }) => {
    await page.goto('/');

    // Complete basic profile setup
    await page.getByLabel('Get started with Borderly').click();
    
    const skipButton = page.getByText('Skip for now');
    if (await skipButton.isVisible()) {
      await skipButton.click();
    }

    // Fill profile
    await page.getByLabel('First Name').fill('Jane');
    await page.getByLabel('Last Name').fill('Smith');
    await page.getByLabel('Passport Number').fill('CD9876543');
    await page.getByLabel('Nationality').click();
    await page.getByText('Canada').click();
    await page.getByLabel('Date of Birth').fill('1985-05-15');
    await page.getByLabel('Gender').click();
    await page.getByText('Female').click();
    
    await page.getByText('Continue').click();
    await page.getByText('Skip for now').click(); // Skip biometric

    // Create a trip
    await page.getByText('Create Trip').click();
    await page.getByLabel('Trip Name').fill('Europe Trip');
    await page.getByLabel('Start Date').fill('2024-07-01');
    await page.getByLabel('End Date').fill('2024-07-10');
    await page.getByText('Create Trip').click();

    // Reload the page to simulate app restart
    await page.reload();

    // Should maintain state and show trip list
    await expect(page.getByText('My Trips')).toBeVisible();
    await expect(page.getByText('Europe Trip')).toBeVisible();

    // Profile should also be persisted
    await page.getByText('Profile').click();
    await expect(page.getByDisplayValue('Jane')).toBeVisible();
    await expect(page.getByDisplayValue('Smith')).toBeVisible();
    await expect(page.getByDisplayValue('CD9876543')).toBeVisible();
  });
});