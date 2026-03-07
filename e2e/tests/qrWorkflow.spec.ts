import { test, expect } from '@playwright/test';

test.describe('QR Workflow', () => {
  test('QR capture and storage workflow', async ({ page }) => {
    await page.goto('/');

    // Navigate to QR Wallet from main tabs
    await page.getByText('QR Wallet').click();

    // Initial empty state
    await expect(page.getByText('Your QR Codes')).toBeVisible();
    await expect(page.getByText('No QR codes saved')).toBeVisible();
    await expect(page.getByText('QR codes from completed submissions will appear here')).toBeVisible();

    // Add QR manually
    await page.getByText('Add QR Code').click();

    // QR capture screen
    await expect(page.getByText('Scan QR Code')).toBeVisible();
    await expect(page.getByText('Point your camera at the QR code')).toBeVisible();

    // Since camera is mocked, look for manual entry option
    const manualEntryButton = page.getByText('Enter Manually');
    if (await manualEntryButton.isVisible()) {
      await manualEntryButton.click();

      // Manual QR entry form
      await expect(page.getByText('Add QR Code Manually')).toBeVisible();
      await page.getByLabel('Title').fill('Visit Japan Web - Tokyo Entry');
      await page.getByLabel('Country').click();
      await page.getByText('Japan').click();
      await page.getByLabel('QR Code Data').fill('https://vjw.digital.go.jp/main/#/vjwplo01sch040?qr=ABC123DEF456');
      await page.getByLabel('Notes').fill('Entry QR for Tokyo Haneda Airport');

      await page.getByText('Save QR Code').click();
    }

    // Should return to QR wallet with new entry
    await expect(page.getByText('Visit Japan Web - Tokyo Entry')).toBeVisible();
    await expect(page.getByText('Japan')).toBeVisible();
    await expect(page.getByText('Entry QR for Tokyo Haneda Airport')).toBeVisible();

    // Click on QR code to view full screen
    await page.getByTestId('qr-card-0').click();

    // Full screen QR view
    await expect(page.getByText('Visit Japan Web - Tokyo Entry')).toBeVisible();
    await expect(page.getByTestId('qr-full-screen')).toBeVisible();
    await expect(page.getByText('Show QR Code')).toBeVisible();

    // Test QR code display
    await page.getByText('Show QR Code').click();
    await expect(page.getByTestId('qr-code-display')).toBeVisible();

    // Test copy functionality
    await page.getByText('Copy Link').click();
    // Note: Clipboard testing in Playwright is limited

    // Share functionality
    const shareButton = page.getByText('Share');
    if (await shareButton.isVisible()) {
      await shareButton.click();
      // Web share API testing is limited in Playwright
    }

    // Navigate back
    await page.getByText('Back').click();
    await expect(page.getByText('Your QR Codes')).toBeVisible();
  });

  test('QR code offline access', async ({ page }) => {
    await page.goto('/');
    
    // Pre-populate a QR code
    await page.getByText('QR Wallet').click();
    await page.getByText('Add QR Code').click();
    
    const manualEntryButton = page.getByText('Enter Manually');
    if (await manualEntryButton.isVisible()) {
      await manualEntryButton.click();
      await page.getByLabel('Title').fill('Malaysia MDAC QR');
      await page.getByLabel('Country').click();
      await page.getByText('Malaysia').click();
      await page.getByLabel('QR Code Data').fill('https://mdac.malaysia.gov.my/verify/XYZ789');
      await page.getByText('Save QR Code').click();
    }

    // Simulate offline mode by intercepting network requests
    await page.route('**/*', route => {
      route.abort();
    });

    // Navigate to QR code
    await page.getByTestId('qr-card-0').click();

    // QR should still be accessible offline
    await expect(page.getByText('Malaysia MDAC QR')).toBeVisible();
    await page.getByText('Show QR Code').click();
    await expect(page.getByTestId('qr-code-display')).toBeVisible();

    // All functionality should work offline
    await page.getByText('Copy Link').click();
    
    // Return to wallet
    await page.getByText('Back').click();
    await expect(page.getByText('Your QR Codes')).toBeVisible();
    await expect(page.getByText('Malaysia MDAC QR')).toBeVisible();
  });

  test('QR code organization and search', async ({ page }) => {
    await page.goto('/');
    await page.getByText('QR Wallet').click();

    // Add multiple QR codes
    const qrCodes = [
      {
        title: 'Japan Entry - Narita',
        country: 'Japan',
        data: 'https://vjw.digital.go.jp/main/#/vjwplo01sch040?qr=NARITA123',
        notes: 'Narita Airport entry'
      },
      {
        title: 'Japan Entry - Haneda',
        country: 'Japan', 
        data: 'https://vjw.digital.go.jp/main/#/vjwplo01sch040?qr=HANEDA456',
        notes: 'Haneda Airport entry'
      },
      {
        title: 'Singapore Arrival Card',
        country: 'Singapore',
        data: 'https://eservices.ica.gov.sg/sgarrivalcard/icaForm?ref=SG789',
        notes: 'Changi Airport arrival'
      }
    ];

    for (const qr of qrCodes) {
      await page.getByText('Add QR Code').click();
      
      const manualEntryButton = page.getByText('Enter Manually');
      if (await manualEntryButton.isVisible()) {
        await manualEntryButton.click();
        await page.getByLabel('Title').fill(qr.title);
        await page.getByLabel('Country').click();
        await page.getByText(qr.country).click();
        await page.getByLabel('QR Code Data').fill(qr.data);
        await page.getByLabel('Notes').fill(qr.notes);
        await page.getByText('Save QR Code').click();
      }
    }

    // All QR codes should be visible
    await expect(page.getByText('Japan Entry - Narita')).toBeVisible();
    await expect(page.getByText('Japan Entry - Haneda')).toBeVisible();
    await expect(page.getByText('Singapore Arrival Card')).toBeVisible();

    // Test country filtering
    const countryFilter = page.getByLabel('Filter by country');
    if (await countryFilter.isVisible()) {
      await countryFilter.click();
      await page.getByText('Japan').click();

      // Only Japan QR codes should be visible
      await expect(page.getByText('Japan Entry - Narita')).toBeVisible();
      await expect(page.getByText('Japan Entry - Haneda')).toBeVisible();
      await expect(page.getByText('Singapore Arrival Card')).not.toBeVisible();

      // Reset filter
      await countryFilter.click();
      await page.getByText('All Countries').click();
    }

    // Test search functionality
    const searchBox = page.getByLabel('Search QR codes');
    if (await searchBox.isVisible()) {
      await searchBox.fill('Haneda');

      // Only Haneda QR should be visible
      await expect(page.getByText('Japan Entry - Haneda')).toBeVisible();
      await expect(page.getByText('Japan Entry - Narita')).not.toBeVisible();
      await expect(page.getByText('Singapore Arrival Card')).not.toBeVisible();

      // Clear search
      await searchBox.fill('');
    }

    // Test QR code deletion
    const firstQROptions = page.getByTestId('qr-card-0').getByText('⋯');
    if (await firstQROptions.isVisible()) {
      await firstQROptions.click();
      await page.getByText('Delete').click();
      
      // Confirm deletion
      await page.getByText('Delete QR Code').click();
      
      // QR code should be removed
      await expect(page.getByText('Japan Entry - Narita')).not.toBeVisible();
    }
  });

  test('QR code integration with form submission', async ({ page }) => {
    await page.goto('/');

    // Complete a form submission flow first
    await page.getByLabel('Get started with Borderly').click();
    
    // Skip through onboarding quickly
    const skipButton = page.getByText('Skip for now');
    if (await skipButton.isVisible()) {
      await skipButton.click();
    }

    // Fill minimal profile
    await page.getByLabel('First Name').fill('Test');
    await page.getByLabel('Last Name').fill('User');
    await page.getByLabel('Passport Number').fill('TEST12345');
    await page.getByLabel('Nationality').click();
    await page.getByText('United States').click();
    await page.getByLabel('Date of Birth').fill('1990-01-01');
    await page.getByLabel('Gender').click();
    await page.getByText('Male').click();
    await page.getByText('Continue').click();
    await page.getByText('Skip for now').click(); // Skip biometric

    // Create trip and fill form
    await page.getByText('Create Trip').click();
    await page.getByLabel('Trip Name').fill('Test Trip');
    await page.getByLabel('Start Date').fill('2024-06-01');
    await page.getByLabel('End Date').fill('2024-06-05');
    
    await page.getByText('Add Destination').click();
    await page.getByLabel('Country').click();
    await page.getByText('Japan').click();
    await page.getByLabel('Arrival Date').fill('2024-06-01');
    await page.getByLabel('Departure Date').fill('2024-06-05');
    await page.getByText('Create Trip').click();

    // Fill Japan form
    await page.getByTestId('japan-form-button').click();
    await page.getByLabel('Purpose of Visit').click();
    await page.getByText('Tourism').click();
    await page.getByLabel('Accommodation Name').fill('Tokyo Hotel');
    await page.getByLabel('Accommodation Address').fill('123 Tokyo St, Tokyo');
    await page.getByLabel('Flight Number').fill('UA123');
    await page.getByText('Save Form').click();

    // Navigate to submission guide
    await page.getByText('View Submission Guide').click();

    // Simulate QR code received after submission
    const addQRFromSubmission = page.getByText('Save QR Code');
    if (await addQRFromSubmission.isVisible()) {
      await addQRFromSubmission.click();
      
      // Should auto-populate with form data
      await expect(page.getByDisplayValue('Visit Japan Web - Test Trip')).toBeVisible();
      await expect(page.getByDisplayValue('Japan')).toBeVisible();
      
      await page.getByLabel('QR Code Data').fill('https://vjw.digital.go.jp/submission/ABC123');
      await page.getByText('Save QR Code').click();
    }

    // Navigate to QR Wallet to verify
    await page.getByText('QR Wallet').click();
    await expect(page.getByText('Visit Japan Web - Test Trip')).toBeVisible();
    await expect(page.getByText('Japan')).toBeVisible();
  });
});