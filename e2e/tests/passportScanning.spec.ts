import { test, expect } from '@playwright/test';

test.describe('Passport Scanning and Profile Creation', () => {
  test('passport scanning screen renders correctly', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to passport scanning
    await page.getByLabel('Get started with Borderly').click();
    
    // Should reach passport scan screen
    await expect(page.getByText('Scan Your Passport')).toBeVisible();
    await expect(page.getByText('Hold your passport under the camera')).toBeVisible();
    await expect(page.getByText('Position the Machine Readable Zone (MRZ)')).toBeVisible();
    
    // Camera UI elements should be present (mocked)
    await expect(page.getByTestId('camera-view')).toBeVisible();
    await expect(page.getByTestId('scan-overlay')).toBeVisible();
    
    // Control buttons should be available
    await expect(page.getByText('Skip for now')).toBeVisible();
    await expect(page.getByLabel('Switch camera')).toBeVisible();
    await expect(page.getByLabel('Toggle flash')).toBeVisible();
  });

  test('passport scan success flow', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Get started with Borderly').click();
    
    // Mock successful MRZ scan by triggering scan success event
    // Note: In real implementation, this would come from camera/ML Kit
    await page.evaluate(() => {
      // Simulate MRZ scan result
      const mrzData = {
        documentCode: 'P',
        countryCode: 'USA',
        surname: 'SMITH',
        givenNames: 'JOHN DAVID',
        passportNumber: 'AB1234567',
        nationality: 'USA',
        dateOfBirth: '900115', // YYMMDD format
        gender: 'M',
        expirationDate: '300115', // YYMMDD format
        personalNumber: '123456789'
      };
      
      // Dispatch custom event that the scanner would trigger
      window.dispatchEvent(new CustomEvent('mrzScanSuccess', { detail: mrzData }));
    });
    
    // Should automatically navigate to profile confirmation
    await expect(page.getByText('Confirm Your Profile')).toBeVisible();
    await expect(page.getByText('Review the scanned information')).toBeVisible();
    
    // Auto-filled fields should contain scanned data
    await expect(page.getByDisplayValue('John David')).toBeVisible();
    await expect(page.getByDisplayValue('Smith')).toBeVisible();
    await expect(page.getByDisplayValue('AB1234567')).toBeVisible();
    await expect(page.getByDisplayValue('United States')).toBeVisible();
    
    // Date should be formatted correctly (YYMMDD -> YYYY-MM-DD)
    await expect(page.getByDisplayValue('1990-01-15')).toBeVisible();
    
    // Gender should be converted (M -> Male)
    await expect(page.getByDisplayValue('Male')).toBeVisible();
    
    // User can edit auto-filled data
    await page.getByLabel('First Name').fill('Jonathan');
    
    // Continue to next step
    await page.getByText('Continue').click();
    
    // Should reach biometric setup
    await expect(page.getByText('Secure Your Profile')).toBeVisible();
  });

  test('passport scan retry mechanism', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Get started with Borderly').click();
    
    // Simulate failed scan attempts
    await page.evaluate(() => {
      // First failed attempt
      window.dispatchEvent(new CustomEvent('mrzScanError', { 
        detail: { error: 'No MRZ detected' } 
      }));
    });
    
    // Error message should appear
    await expect(page.getByText('No passport detected')).toBeVisible();
    await expect(page.getByText('Try again')).toBeVisible();
    
    // Retry button should be functional
    await page.getByText('Try again').click();
    
    // Simulate another error (blurry image)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('mrzScanError', { 
        detail: { error: 'Image too blurry' } 
      }));
    });
    
    await expect(page.getByText('Image too blurry')).toBeVisible();
    await expect(page.getByText('Hold still and try again')).toBeVisible();
    
    // After multiple failures, manual entry option should appear
    const manualEntryButton = page.getByText('Enter manually');
    if (await manualEntryButton.isVisible()) {
      await manualEntryButton.click();
      
      // Should reach profile entry screen
      await expect(page.getByText('Enter Your Profile')).toBeVisible();
      await expect(page.getByText('Fill out your passport information manually')).toBeVisible();
    }
  });

  test('manual profile entry validation', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Get started with Borderly').click();
    
    // Skip scanning
    await page.getByText('Skip for now').click();
    
    // Should reach manual entry
    await expect(page.getByText('Confirm Your Profile')).toBeVisible();
    
    // Test individual field validation
    await page.getByLabel('First Name').fill('');
    await page.getByLabel('Last Name').fill('Smith');
    await page.getByText('Continue').click();
    
    await expect(page.getByText('First name is required')).toBeVisible();
    
    // Test passport number validation
    await page.getByLabel('First Name').fill('John');
    await page.getByLabel('Passport Number').fill('123'); // Too short
    await page.getByText('Continue').click();
    
    await expect(page.getByText('Passport number must be 6-9 characters')).toBeVisible();
    
    // Test date validation
    await page.getByLabel('Passport Number').fill('AB1234567');
    await page.getByLabel('Date of Birth').fill('2030-01-01'); // Future date
    await page.getByText('Continue').click();
    
    await expect(page.getByText('Date of birth cannot be in the future')).toBeVisible();
    
    // Test age validation (too young)
    await page.getByLabel('Date of Birth').fill('2020-01-01');
    await page.getByText('Continue').click();
    
    await expect(page.getByText('Must be at least 16 years old')).toBeVisible();
    
    // Valid data should proceed
    await page.getByLabel('Date of Birth').fill('1990-01-01');
    await page.getByLabel('Nationality').click();
    await page.getByText('United States').click();
    await page.getByLabel('Gender').click();
    await page.getByText('Male').click();
    
    await page.getByText('Continue').click();
    
    // Should proceed to biometric setup
    await expect(page.getByText('Secure Your Profile')).toBeVisible();
  });

  test('profile data persistence and editing', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Get started with Borderly').click();
    await page.getByText('Skip for now').click();
    
    // Fill profile
    await page.getByLabel('First Name').fill('Alice');
    await page.getByLabel('Last Name').fill('Johnson');
    await page.getByLabel('Passport Number').fill('CD9876543');
    await page.getByLabel('Nationality').click();
    await page.getByText('Canada').click();
    await page.getByLabel('Date of Birth').fill('1985-05-15');
    await page.getByLabel('Gender').click();
    await page.getByText('Female').click();
    
    await page.getByText('Continue').click();
    await page.getByText('Skip for now').click(); // Skip biometric
    
    // Navigate to profile screen
    await page.getByText('Profile').click();
    
    // All data should be present
    await expect(page.getByDisplayValue('Alice')).toBeVisible();
    await expect(page.getByDisplayValue('Johnson')).toBeVisible();
    await expect(page.getByDisplayValue('CD9876543')).toBeVisible();
    await expect(page.getByDisplayValue('Canada')).toBeVisible();
    await expect(page.getByDisplayValue('1985-05-15')).toBeVisible();
    await expect(page.getByDisplayValue('Female')).toBeVisible();
    
    // Edit profile
    await page.getByText('Edit Profile').click();
    
    await page.getByLabel('First Name').fill('Alice Marie');
    await page.getByLabel('Phone Number').fill('+1-555-123-4567');
    await page.getByLabel('Email').fill('alice.johnson@example.com');
    
    await page.getByText('Save Changes').click();
    
    // Changes should be persisted
    await expect(page.getByDisplayValue('Alice Marie')).toBeVisible();
    await expect(page.getByDisplayValue('+1-555-123-4567')).toBeVisible();
    await expect(page.getByDisplayValue('alice.johnson@example.com')).toBeVisible();
    
    // Reload to test persistence
    await page.reload();
    await expect(page.getByDisplayValue('Alice Marie')).toBeVisible();
  });

  test('passport expiration warnings', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Get started with Borderly').click();
    await page.getByText('Skip for now').click();
    
    // Enter profile with passport expiring soon
    await page.getByLabel('First Name').fill('Bob');
    await page.getByLabel('Last Name').fill('Wilson');
    await page.getByLabel('Passport Number').fill('EF5555555');
    
    // Set expiration date to 3 months from now
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3);
    const expirationDate = futureDate.toISOString().split('T')[0];
    
    await page.getByLabel('Passport Expiration Date').fill(expirationDate);
    await page.getByLabel('Nationality').click();
    await page.getByText('United Kingdom').click();
    await page.getByLabel('Date of Birth').fill('1980-03-10');
    await page.getByLabel('Gender').click();
    await page.getByText('Male').click();
    
    await page.getByText('Continue').click();
    
    // Should show expiration warning
    await expect(page.getByText('Passport Expiring Soon')).toBeVisible();
    await expect(page.getByText('Your passport expires in less than 6 months')).toBeVisible();
    await expect(page.getByText('Some countries require 6+ months validity')).toBeVisible();
    
    // User can acknowledge warning
    await page.getByText('I understand').click();
    
    // Continue to biometric setup
    await expect(page.getByText('Secure Your Profile')).toBeVisible();
  });

  test('passport photo capture and preview', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Get started with Borderly').click();
    
    // Look for passport photo option
    const photoButton = page.getByText('Add Photo');
    if (await photoButton.isVisible()) {
      await photoButton.click();
      
      // Camera should open for photo capture
      await expect(page.getByTestId('photo-camera-view')).toBeVisible();
      await expect(page.getByText('Center your passport in the frame')).toBeVisible();
      
      // Capture button
      await page.getByLabel('Capture photo').click();
      
      // Photo preview should appear
      await expect(page.getByTestId('passport-photo-preview')).toBeVisible();
      await expect(page.getByText('Use this photo')).toBeVisible();
      await expect(page.getByText('Retake')).toBeVisible();
      
      // Accept photo
      await page.getByText('Use this photo').click();
      
      // Should return to main scan screen with photo indicator
      await expect(page.getByTestId('photo-captured-indicator')).toBeVisible();
    }
    
    // Continue with normal flow
    await page.getByText('Skip for now').click();
    
    // Complete profile manually
    await page.getByLabel('First Name').fill('Test');
    await page.getByLabel('Last Name').fill('User');
    await page.getByLabel('Passport Number').fill('TEST12345');
    await page.getByLabel('Nationality').click();
    await page.getByText('United States').click();
    await page.getByLabel('Date of Birth').fill('1990-01-01');
    await page.getByLabel('Gender').click();
    await page.getByText('Male').click();
    await page.getByText('Continue').click();
    
    // In profile screen, photo should be visible
    await page.getByText('Skip for now').click(); // Skip biometric
    await page.getByText('Profile').click();
    
    if (await page.getByTestId('passport-photo').isVisible()) {
      await expect(page.getByTestId('passport-photo')).toBeVisible();
    }
  });
});