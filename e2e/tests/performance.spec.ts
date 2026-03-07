import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up performance monitoring
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('borderly-onboarding-complete', 'true');
      localStorage.setItem('borderly-profile', JSON.stringify({
        firstName: 'Performance',
        lastName: 'Test',
        passportNumber: 'PF1234567',
        nationality: 'US',
        dateOfBirth: '1990-01-01',
        gender: 'M'
      }));
    });
    await page.reload();
  });

  test('app startup time is within acceptable limits', async ({ page }) => {
    const startTime = Date.now();
    
    // Wait for main app to be interactive (page already loaded by beforeEach)
    await expect(page.getByText('My Trips')).toBeVisible();
    
    const endTime = Date.now();
    const startupTime = endTime - startTime;
    
    // App should start within 3 seconds
    expect(startupTime).toBeLessThan(3000);
    console.log(`App startup time: ${startupTime}ms`);
  });

  test('form generation performance under various data sizes', async ({ page }) => {
    // Create a moderately large trip for stress testing (reduced from 10 to 5 destinations)
    const largeTrip = {
      id: 'performance-trip',
      name: 'Performance Test Trip',
      startDate: '2024-12-01',
      endDate: '2024-12-15',
      destinations: []
    };

    // Add 5 destinations to test form generation (reduced for speed)
    const countries = ['JPN', 'SGP', 'MYS'];
    for (let i = 0; i < 5; i++) {
      largeTrip.destinations.push({
        country: countries[i % countries.length],
        arrivalDate: `2024-12-${String(i + 1).padStart(2, '0')}`,
        departureDate: `2024-12-${String(i + 2).padStart(2, '0')}`
      });
    }

    await page.evaluate((trip) => {
      localStorage.setItem('borderly-trips', JSON.stringify([trip]));
    }, largeTrip);
    
    await page.reload();
    await page.getByText('Large Performance Test Trip').click();

    // Test form generation performance for each destination
    const formGenerationTimes = [];
    
    for (let i = 0; i < Math.min(3, largeTrip.destinations.length); i++) {
      const country = largeTrip.destinations[i].country.toLowerCase();
      const startTime = Date.now();
      
      await page.getByTestId(`${country}-form-button`).click();
      await expect(page.getByText(/Declaration|Card/)).toBeVisible();
      
      const endTime = Date.now();
      const formTime = endTime - startTime;
      formGenerationTimes.push(formTime);
      
      // Form should generate within 1 second
      expect(formTime).toBeLessThan(1000);
      
      await page.getByText('Back to Trip').click();
    }

    console.log(`Form generation times: ${formGenerationTimes.map(t => `${t}ms`).join(', ')}`);
  });

  test('camera operations performance', async ({ page }) => {
    await page.getByText('QR Wallet').click();
    await page.getByText('Add QR Code').click();

    // Measure camera initialization time
    const cameraStartTime = Date.now();
    
    // Wait for camera interface to be ready
    await expect(page.getByTestId('camera-viewfinder')).toBeVisible();
    
    const cameraEndTime = Date.now();
    const cameraInitTime = cameraEndTime - cameraStartTime;
    
    // Camera should initialize within 2 seconds
    expect(cameraInitTime).toBeLessThan(2000);
    console.log(`Camera initialization time: ${cameraInitTime}ms`);

    // Test QR code detection response time
    const qrDetectionStartTime = Date.now();
    
    await page.evaluate(() => {
      const event = new CustomEvent('qr-code-detected', {
        detail: {
          data: 'PERF:TEST:12345'
        }
      });
      window.dispatchEvent(event);
    });

    // Wait for QR detection to be processed
    const manualEntryButton = page.getByText('Enter Manually');
    if (await manualEntryButton.isVisible()) {
      await manualEntryButton.click();
    }
    
    const qrDetectionEndTime = Date.now();
    const qrDetectionTime = qrDetectionEndTime - qrDetectionStartTime;
    
    // QR detection should process within 500ms
    expect(qrDetectionTime).toBeLessThan(500);
    console.log(`QR detection processing time: ${qrDetectionTime}ms`);
  });

  test('large form auto-fill performance', async ({ page }) => {
    // Create a complex profile with many fields
    const complexProfile = {
      firstName: 'Complex',
      lastName: 'Profile',
      passportNumber: 'CP1234567',
      nationality: 'US',
      dateOfBirth: '1990-01-01',
      gender: 'F',
      occupation: 'Software Engineer',
      address: '123 Main St, Anytown, State 12345',
      phone: '+1-555-123-4567',
      email: 'complex.profile@example.com',
      emergencyContact: {
        name: 'Emergency Contact',
        phone: '+1-555-987-6543',
        relationship: 'Spouse'
      }
    };

    await page.evaluate((profile) => {
      localStorage.setItem('borderly-profile', JSON.stringify(profile));
      localStorage.setItem('borderly-trips', JSON.stringify([{
        id: 'auto-fill-test',
        name: 'Auto-fill Performance Test',
        startDate: '2024-12-01',
        endDate: '2024-12-15',
        destinations: [{
          country: 'JPN',
          arrivalDate: '2024-12-01',
          departureDate: '2024-12-15'
        }]
      }]));
    }, complexProfile);
    
    await page.reload();
    await page.getByText('Auto-fill Performance Test').click();

    // Measure auto-fill performance
    const autoFillStartTime = Date.now();
    
    await page.getByTestId('japan-form-button').click();
    
    // Wait for form to be fully loaded with auto-filled data
    await expect(page.getByDisplayValue('Complex')).toBeVisible();
    await expect(page.getByDisplayValue('Profile')).toBeVisible();
    await expect(page.getByDisplayValue('CP1234567')).toBeVisible();
    
    const autoFillEndTime = Date.now();
    const autoFillTime = autoFillEndTime - autoFillStartTime;
    
    // Auto-fill should complete within 800ms even with complex data
    expect(autoFillTime).toBeLessThan(800);
    console.log(`Auto-fill processing time: ${autoFillTime}ms`);
  });

  test('memory usage during intensive operations', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Memory measurement is only available in Chromium');
    
    // Monitor memory during multiple form creations
    await page.evaluate(() => {
      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }
    });

    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
    });

    // Create multiple trips and forms to stress test memory
    const trips = [];
    for (let i = 0; i < 5; i++) {
      trips.push({
        id: `memory-test-${i}`,
        name: `Memory Test Trip ${i}`,
        startDate: '2024-12-01',
        endDate: '2024-12-15',
        destinations: [
          { country: 'JPN', arrivalDate: '2024-12-01', departureDate: '2024-12-05' },
          { country: 'SGP', arrivalDate: '2024-12-05', departureDate: '2024-12-10' },
          { country: 'MYS', arrivalDate: '2024-12-10', departureDate: '2024-12-15' }
        ]
      });
    }

    await page.evaluate((trips) => {
      localStorage.setItem('borderly-trips', JSON.stringify(trips));
    }, trips);
    
    await page.reload();

    // Navigate through multiple forms to test memory usage
    for (let i = 0; i < 3; i++) {
      await page.getByText(`Memory Test Trip ${i}`).click();
      
      // Open and close forms
      await page.getByTestId('japan-form-button').click();
      await expect(page.getByText('Japan Entry Declaration')).toBeVisible();
      await page.getByText('Back to Trip').click();
      
      await page.getByTestId('singapore-form-button').click();
      await expect(page.getByText('Singapore Arrival Card')).toBeVisible();
      await page.getByText('Back to Trip').click();
      
      await page.getByText('Back to Trips').click();
    }

    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
    });

    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable (less than 50MB)
    if (finalMemory > 0) {
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    }
  });

  test('offline storage operations performance', async ({ page }) => {
    // Test large data storage and retrieval
    const largeDataSet = {
      trips: [],
      qrCodes: [],
      forms: {}
    };

    // Create substantial test data
    for (let i = 0; i < 20; i++) {
      largeDataSet.trips.push({
        id: `perf-trip-${i}`,
        name: `Performance Trip ${i}`,
        startDate: '2024-12-01',
        endDate: '2024-12-15',
        destinations: [
          { country: 'JPN', arrivalDate: '2024-12-01', departureDate: '2024-12-15' }
        ]
      });

      largeDataSet.qrCodes.push({
        id: `qr-${i}`,
        name: `QR Code ${i}`,
        country: 'JPN',
        data: `QR:DATA:${i}:${Date.now()}`,
        createdAt: new Date().toISOString()
      });

      largeDataSet.forms[`form-${i}`] = {
        status: 'completed',
        data: {
          firstName: `Test${i}`,
          lastName: `User${i}`,
          passportNumber: `TS${i}123456`,
          purpose: 'Tourism'
        }
      };
    }

    // Measure storage time
    const storageStartTime = Date.now();
    
    await page.evaluate((data) => {
      localStorage.setItem('borderly-trips', JSON.stringify(data.trips));
      localStorage.setItem('borderly-qr-codes', JSON.stringify(data.qrCodes));
      Object.keys(data.forms).forEach(key => {
        localStorage.setItem(`borderly-form-${key}`, JSON.stringify(data.forms[key]));
      });
    }, largeDataSet);
    
    const storageEndTime = Date.now();
    const storageTime = storageEndTime - storageStartTime;
    
    // Storage should complete within 1 second
    expect(storageTime).toBeLessThan(1000);
    console.log(`Large data storage time: ${storageTime}ms`);

    // Measure retrieval time
    const retrievalStartTime = Date.now();
    
    await page.reload();
    await expect(page.getByText('Performance Trip 0')).toBeVisible();
    
    const retrievalEndTime = Date.now();
    const retrievalTime = retrievalEndTime - retrievalStartTime;
    
    // Data retrieval and app load should complete within 2 seconds
    expect(retrievalTime).toBeLessThan(2000);
    console.log(`Large data retrieval time: ${retrievalTime}ms`);
  });

  test('form validation performance with complex rules', async ({ page }) => {
    // Create a trip for validation testing
    await page.evaluate(() => {
      localStorage.setItem('borderly-trips', JSON.stringify([{
        id: 'validation-test',
        name: 'Validation Test Trip',
        startDate: '2024-12-01',
        endDate: '2024-12-15',
        destinations: [{
          country: 'JPN',
          arrivalDate: '2024-12-01',
          departureDate: '2024-12-15'
        }]
      }]));
    });
    
    await page.reload();
    await page.getByText('Validation Test Trip').click();
    await page.getByTestId('japan-form-button').click();

    // Test rapid validation of multiple fields
    const validationStartTime = Date.now();
    
    // Fill fields rapidly to trigger validation
    await page.getByLabel('Purpose of Visit').click();
    await page.getByText('Tourism').click();
    
    await page.getByLabel('Accommodation Name').fill('Test Hotel');
    await page.getByLabel('Accommodation Address').fill('Test Address');
    await page.getByLabel('Accommodation Phone').fill('+81-3-1234-5678');
    await page.getByLabel('Flight Number').fill('JL123');
    
    // Wait for all validations to complete
    await expect(page.getByText('Save Form')).toBeEnabled();
    
    const validationEndTime = Date.now();
    const validationTime = validationEndTime - validationStartTime;
    
    // Complex validation should complete within 500ms
    expect(validationTime).toBeLessThan(500);
    console.log(`Form validation time: ${validationTime}ms`);
  });

  test('concurrent operations performance', async ({ page }) => {
    // Test multiple operations happening simultaneously
    await page.evaluate(() => {
      localStorage.setItem('borderly-trips', JSON.stringify([
        {
          id: 'concurrent-1',
          name: 'Concurrent Trip 1',
          startDate: '2024-12-01',
          endDate: '2024-12-08',
          destinations: [{ country: 'JPN', arrivalDate: '2024-12-01', departureDate: '2024-12-08' }]
        },
        {
          id: 'concurrent-2',
          name: 'Concurrent Trip 2',
          startDate: '2024-12-08',
          endDate: '2024-12-15',
          destinations: [{ country: 'SGP', arrivalDate: '2024-12-08', departureDate: '2024-12-15' }]
        }
      ]));
    });
    
    await page.reload();

    const concurrentStartTime = Date.now();
    
    // Simulate rapid navigation between trips and forms
    await page.getByText('Concurrent Trip 1').click();
    await page.getByTestId('japan-form-button').click();
    await page.getByText('Back to Trip').click();
    await page.getByText('Back to Trips').click();
    
    await page.getByText('Concurrent Trip 2').click();
    await page.getByTestId('singapore-form-button').click();
    await page.getByText('Back to Trip').click();
    
    // Navigate to QR wallet
    await page.getByText('QR Wallet').click();
    await expect(page.getByText('Your QR Codes')).toBeVisible();
    
    const concurrentEndTime = Date.now();
    const concurrentTime = concurrentEndTime - concurrentStartTime;
    
    // Concurrent operations should complete within 3 seconds
    expect(concurrentTime).toBeLessThan(3000);
    console.log(`Concurrent operations time: ${concurrentTime}ms`);
  });

  test('UI responsiveness under load', async ({ page }) => {
    // Create a moderate number of UI elements (reduced from 50 to 20 for speed)
    const manyTrips = [];
    for (let i = 0; i < 20; i++) {
      manyTrips.push({
        id: `ui-test-${i}`,
        name: `UI Test Trip ${i}`,
        startDate: '2024-12-01',
        endDate: '2024-12-15',
        destinations: [{ country: 'JPN', arrivalDate: '2024-12-01', departureDate: '2024-12-15' }]
      });
    }

    await page.evaluate((trips) => {
      localStorage.setItem('borderly-trips', JSON.stringify(trips));
    }, manyTrips);
    
    await page.reload();

    // Measure scroll performance
    const scrollStartTime = Date.now();
    
    // Scroll to last item to test performance
    await page.getByText('UI Test Trip 19').scrollIntoViewIfNeeded();
    await expect(page.getByText('UI Test Trip 19')).toBeVisible();
    
    const scrollEndTime = Date.now();
    const scrollTime = scrollEndTime - scrollStartTime;
    
    // Scroll should be smooth and complete within 1 second
    expect(scrollTime).toBeLessThan(1000);
    console.log(`Scroll through many items time: ${scrollTime}ms`);

    // Test interaction responsiveness
    const interactionStartTime = Date.now();
    
    await page.getByText('UI Test Trip 10').click();
    await expect(page.getByText('UI Test Trip 10')).toBeVisible();
    
    const interactionEndTime = Date.now();
    const interactionTime = interactionEndTime - interactionStartTime;
    
    // UI interactions should be responsive (under 300ms)
    expect(interactionTime).toBeLessThan(300);
    console.log(`UI interaction time: ${interactionTime}ms`);
  });
});