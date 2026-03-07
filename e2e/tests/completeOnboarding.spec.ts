import { test, expect } from '@playwright/test';

test.describe('Complete Onboarding Flow', () => {
  test('successful onboarding with passport scan', async ({ page }) => {
    await page.goto('/');

    // Welcome screen
    await expect(page.getByText('Welcome to')).toBeVisible();
    await expect(page.getByText('Borderly')).toBeVisible();

    // Start onboarding
    const startButton = page.getByLabel('Get started with Borderly');
    await startButton.click();

    // Passport scan screen
    await expect(page.getByText('Scan Your Passport')).toBeVisible();
    await expect(page.getByText('Hold your passport under the camera')).toBeVisible();

    // Test camera permissions and interface
    await expect(page.getByTestId('camera-viewfinder')).toBeVisible();
    await expect(page.getByLabel('Capture passport')).toBeVisible();
    
    // Mock successful MRZ scan by triggering scan result
    await page.evaluate(() => {
      const event = new CustomEvent('mrz-scan-success', {
        detail: {
          firstName: 'JANE',
          lastName: 'SMITH',
          passportNumber: 'P1234567',
          nationality: 'USA',
          dateOfBirth: '1990-05-15',
          gender: 'F',
          expirationDate: '2030-05-15',
        }
      });
      window.dispatchEvent(event);
    });

    // Should navigate to confirmation screen with pre-filled data
    await expect(page.getByText('Confirm Your Profile')).toBeVisible();
    await expect(page.getByDisplayValue('Jane')).toBeVisible();
    await expect(page.getByDisplayValue('Smith')).toBeVisible();
    await expect(page.getByDisplayValue('P1234567')).toBeVisible();
    
    // Verify nationality is correctly selected
    await expect(page.getByText('United States')).toBeVisible();
    
    // Continue to biometric setup
    await page.getByText('Continue').click();

    // Biometric setup screen
    await expect(page.getByText('Secure Your Profile')).toBeVisible();
    await expect(page.getByText('biometric authentication')).toBeVisible();
    
    // Test biometric setup flow
    await page.getByText('Enable Biometrics').click();
    
    // Mock biometric enrollment success
    await page.evaluate(() => {
      const event = new CustomEvent('biometric-setup-success');
      window.dispatchEvent(event);
    });

    // Should navigate to main app
    await expect(page.getByText('My Trips')).toBeVisible();
    await expect(page.getByText('Create Your First Trip')).toBeVisible();
  });

  test('onboarding with manual profile entry', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Get started with Borderly').click();

    // Skip passport scan
    const skipScanButton = page.getByText('Skip for now');
    await skipScanButton.click();

    // Manual profile entry
    await expect(page.getByText('Enter Your Profile')).toBeVisible();
    
    await page.getByLabel('First Name').fill('John');
    await page.getByLabel('Last Name').fill('Doe');
    await page.getByLabel('Passport Number').fill('AB1234567');
    
    // Test nationality dropdown
    await page.getByLabel('Nationality').click();
    await expect(page.getByText('Canada')).toBeVisible();
    await expect(page.getByText('United Kingdom')).toBeVisible();
    await page.getByText('Canada').click();
    
    // Test date picker
    await page.getByLabel('Date of Birth').fill('1985-08-20');
    
    // Test gender selection
    await page.getByLabel('Gender').click();
    await page.getByText('Male').click();
    
    // Test expiration date
    await page.getByLabel('Passport Expiration').fill('2028-08-20');
    
    await page.getByText('Continue').click();

    // Should reach biometric setup
    await expect(page.getByText('Secure Your Profile')).toBeVisible();
  });

  test('validates required fields during onboarding', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Get started with Borderly').click();
    await page.getByText('Skip for now').click();

    // Try to continue without filling fields
    await page.getByText('Continue').click();
    
    // Should show validation errors
    await expect(page.getByText('First name is required')).toBeVisible();
    await expect(page.getByText('Last name is required')).toBeVisible();
    await expect(page.getByText('Passport number is required')).toBeVisible();
    await expect(page.getByText('Nationality is required')).toBeVisible();
    await expect(page.getByText('Date of birth is required')).toBeVisible();
    await expect(page.getByText('Gender is required')).toBeVisible();

    // Fill fields one by one and verify errors disappear
    await page.getByLabel('First Name').fill('Test');
    await expect(page.getByText('First name is required')).not.toBeVisible();
    
    await page.getByLabel('Last Name').fill('User');
    await expect(page.getByText('Last name is required')).not.toBeVisible();
    
    await page.getByLabel('Passport Number').fill('TEST123456');
    await expect(page.getByText('Passport number is required')).not.toBeVisible();
    
    await page.getByLabel('Nationality').click();
    await page.getByText('United States').click();
    await expect(page.getByText('Nationality is required')).not.toBeVisible();
    
    await page.getByLabel('Date of Birth').fill('1990-01-01');
    await expect(page.getByText('Date of birth is required')).not.toBeVisible();
    
    await page.getByLabel('Gender').click();
    await page.getByText('Female').click();
    await expect(page.getByText('Gender is required')).not.toBeVisible();
  });

  test('validates passport number format', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Get started with Borderly').click();
    await page.getByText('Skip for now').click();

    // Test invalid passport number formats
    await page.getByLabel('Passport Number').fill('123'); // Too short
    await page.getByLabel('First Name').click(); // Trigger validation
    await expect(page.getByText('Passport number must be 8-9 characters')).toBeVisible();
    
    await page.getByLabel('Passport Number').fill('ABCDEFGHIJK'); // Too long
    await page.getByLabel('First Name').click();
    await expect(page.getByText('Passport number must be 8-9 characters')).toBeVisible();
    
    // Test valid format
    await page.getByLabel('Passport Number').fill('AB1234567');
    await page.getByLabel('First Name').click();
    await expect(page.getByText('Passport number must be 8-9 characters')).not.toBeVisible();
  });

  test('validates date of birth constraints', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Get started with Borderly').click();
    await page.getByText('Skip for now').click();

    // Test future date
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateString = futureDate.toISOString().split('T')[0];
    
    await page.getByLabel('Date of Birth').fill(futureDateString);
    await page.getByLabel('First Name').click();
    await expect(page.getByText('Date of birth cannot be in the future')).toBeVisible();
    
    // Test very old date
    await page.getByLabel('Date of Birth').fill('1900-01-01');
    await page.getByLabel('First Name').click();
    await expect(page.getByText('Please enter a valid date of birth')).toBeVisible();
    
    // Test valid date
    await page.getByLabel('Date of Birth').fill('1990-06-15');
    await page.getByLabel('First Name').click();
    await expect(page.getByText('Date of birth cannot be in the future')).not.toBeVisible();
  });

  test('handles camera permission denial gracefully', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Get started with Borderly').click();

    // Mock camera permission denial
    await page.evaluate(() => {
      const mockGetUserMedia = () => Promise.reject(new Error('Permission denied'));
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        value: mockGetUserMedia
      });
    });

    // Should show permission error message
    await expect(page.getByText('Camera permission is required')).toBeVisible();
    await expect(page.getByText('Enable camera access in your browser settings')).toBeVisible();
    
    // Should still allow skipping to manual entry
    await expect(page.getByText('Skip for now')).toBeVisible();
    await page.getByText('Skip for now').click();
    
    await expect(page.getByText('Enter Your Profile')).toBeVisible();
  });

  test('biometric setup can be skipped and enabled later', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Get started with Borderly').click();
    await page.getByText('Skip for now').click();

    // Fill minimal profile
    await page.getByLabel('First Name').fill('Skip');
    await page.getByLabel('Last Name').fill('Test');
    await page.getByLabel('Passport Number').fill('SK1234567');
    await page.getByLabel('Nationality').click();
    await page.getByText('United States').click();
    await page.getByLabel('Date of Birth').fill('1990-01-01');
    await page.getByLabel('Gender').click();
    await page.getByText('Male').click();
    
    await page.getByText('Continue').click();

    // Skip biometric setup
    await page.getByText('Skip for now').click();

    // Should reach main app
    await expect(page.getByText('My Trips')).toBeVisible();

    // Navigate to settings to enable biometrics later
    await page.getByText('Settings').click();
    await expect(page.getByText('Security')).toBeVisible();
    await expect(page.getByText('Enable Biometric Authentication')).toBeVisible();
    
    // Should be able to enable biometrics from settings
    await page.getByText('Enable Biometric Authentication').click();
    await expect(page.getByText('Biometric Setup')).toBeVisible();
  });
});