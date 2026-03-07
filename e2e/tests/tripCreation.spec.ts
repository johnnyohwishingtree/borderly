import { test, expect } from '@playwright/test';

test.describe('Trip Creation and Management', () => {
  test.beforeEach(async ({ page }) => {
    // Set up a basic profile to start from main app
    await page.goto('/');
    await page.evaluate(() => {
      // Mock that onboarding is complete
      localStorage.setItem('borderly-onboarding-complete', 'true');
      localStorage.setItem('borderly-profile', JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        passportNumber: 'AB1234567',
        nationality: 'US',
        dateOfBirth: '1990-01-01',
        gender: 'M'
      }));
    });
    await page.reload();
  });

  test('creates a single-destination trip', async ({ page }) => {
    // Should be on trip list screen
    await expect(page.getByText('My Trips')).toBeVisible();
    await expect(page.getByText('Create Your First Trip')).toBeVisible();

    // Create new trip
    await page.getByText('Create Trip').click();

    // Fill trip basic info
    await expect(page.getByText('Create New Trip')).toBeVisible();
    await page.getByLabel('Trip Name').fill('Japan Solo Adventure');
    await page.getByLabel('Start Date').fill('2024-09-01');
    await page.getByLabel('End Date').fill('2024-09-10');

    // Add destination
    await page.getByText('Add Destination').click();
    await page.getByLabel('Country').click();
    await page.getByText('Japan').click();
    await page.getByLabel('Arrival Date').fill('2024-09-01');
    await page.getByLabel('Departure Date').fill('2024-09-10');

    // Save trip
    await page.getByText('Create Trip').click();

    // Should navigate to trip detail
    await expect(page.getByText('Japan Solo Adventure')).toBeVisible();
    await expect(page.getByText('Japan')).toBeVisible();
    await expect(page.getByText('Sep 1, 2024')).toBeVisible();
    await expect(page.getByText('Sep 10, 2024')).toBeVisible();

    // Should show form generation option
    await expect(page.getByTestId('japan-form-button')).toBeVisible();
    await expect(page.getByText('Generate Form')).toBeVisible();
  });

  test('creates a multi-destination trip', async ({ page }) => {
    await expect(page.getByText('My Trips')).toBeVisible();
    await page.getByText('Create Trip').click();

    await page.getByLabel('Trip Name').fill('Southeast Asia Tour');
    await page.getByLabel('Start Date').fill('2024-11-01');
    await page.getByLabel('End Date').fill('2024-11-20');

    // Add first destination - Singapore
    await page.getByText('Add Destination').click();
    await page.getByLabel('Country').click();
    await page.getByText('Singapore').click();
    await page.getByLabel('Arrival Date').fill('2024-11-01');
    await page.getByLabel('Departure Date').fill('2024-11-07');

    // Add second destination - Malaysia
    await page.getByText('Add Another Destination').click();
    await page.locator('[data-testid="destination-1"] [aria-label="Country"]').click();
    await page.getByText('Malaysia').click();
    await page.locator('[data-testid="destination-1"] [aria-label="Arrival Date"]').fill('2024-11-07');
    await page.locator('[data-testid="destination-1"] [aria-label="Departure Date"]').fill('2024-11-14');

    // Add third destination - Japan
    await page.getByText('Add Another Destination').click();
    await page.locator('[data-testid="destination-2"] [aria-label="Country"]').click();
    await page.getByText('Japan').click();
    await page.locator('[data-testid="destination-2"] [aria-label="Arrival Date"]').fill('2024-11-14');
    await page.locator('[data-testid="destination-2"] [aria-label="Departure Date"]').fill('2024-11-20');

    await page.getByText('Create Trip').click();

    // Verify trip detail shows all destinations in order
    await expect(page.getByText('Southeast Asia Tour')).toBeVisible();
    await expect(page.getByTestId('destination-singapore')).toBeVisible();
    await expect(page.getByTestId('destination-malaysia')).toBeVisible();
    await expect(page.getByTestId('destination-japan')).toBeVisible();

    // Verify chronological order
    const destinations = await page.locator('[data-testid^="destination-"]').all();
    const destinationTexts = await Promise.all(destinations.map(d => d.textContent()));
    expect(destinationTexts[0]).toContain('Singapore');
    expect(destinationTexts[1]).toContain('Malaysia');
    expect(destinationTexts[2]).toContain('Japan');
  });

  test('validates trip creation form', async ({ page }) => {
    await page.getByText('Create Trip').click();

    // Try to create without required fields
    await page.getByText('Create Trip').click();

    // Should show validation errors
    await expect(page.getByText('Trip name is required')).toBeVisible();
    await expect(page.getByText('Start date is required')).toBeVisible();
    await expect(page.getByText('End date is required')).toBeVisible();

    // Test end date before start date
    await page.getByLabel('Trip Name').fill('Test Trip');
    await page.getByLabel('Start Date').fill('2024-12-01');
    await page.getByLabel('End Date').fill('2024-11-01');
    await page.getByText('Create Trip').click();

    await expect(page.getByText('End date must be after start date')).toBeVisible();

    // Test past dates
    await page.getByLabel('Start Date').fill('2023-01-01');
    await page.getByLabel('End Date').fill('2023-01-10');
    await page.getByText('Create Trip').click();

    await expect(page.getByText('Trip cannot be in the past')).toBeVisible();
  });

  test('validates destination dates', async ({ page }) => {
    await page.getByText('Create Trip').click();

    await page.getByLabel('Trip Name').fill('Validation Test');
    await page.getByLabel('Start Date').fill('2024-12-01');
    await page.getByLabel('End Date').fill('2024-12-10');

    // Add destination with invalid dates
    await page.getByText('Add Destination').click();
    await page.getByLabel('Country').click();
    await page.getByText('Japan').click();
    
    // Arrival before trip start
    await page.getByLabel('Arrival Date').fill('2024-11-30');
    await page.getByLabel('Departure Date').fill('2024-12-05');
    await page.getByText('Create Trip').click();

    await expect(page.getByText('Arrival date cannot be before trip start')).toBeVisible();

    // Departure after trip end
    await page.getByLabel('Arrival Date').fill('2024-12-01');
    await page.getByLabel('Departure Date').fill('2024-12-15');
    await page.getByText('Create Trip').click();

    await expect(page.getByText('Departure date cannot be after trip end')).toBeVisible();

    // Departure before arrival
    await page.getByLabel('Arrival Date').fill('2024-12-05');
    await page.getByLabel('Departure Date').fill('2024-12-03');
    await page.getByText('Create Trip').click();

    await expect(page.getByText('Departure date must be after arrival date')).toBeVisible();
  });

  test('removes destinations', async ({ page }) => {
    await page.getByText('Create Trip').click();

    await page.getByLabel('Trip Name').fill('Remove Test');
    await page.getByLabel('Start Date').fill('2024-12-01');
    await page.getByLabel('End Date').fill('2024-12-10');

    // Add multiple destinations
    await page.getByText('Add Destination').click();
    await page.getByLabel('Country').click();
    await page.getByText('Singapore').click();

    await page.getByText('Add Another Destination').click();
    await page.locator('[data-testid="destination-1"] [aria-label="Country"]').click();
    await page.getByText('Malaysia').click();

    // Remove first destination
    await page.getByTestId('remove-destination-0').click();

    // Should only have Malaysia destination left
    await expect(page.getByText('Singapore')).not.toBeVisible();
    await expect(page.getByText('Malaysia')).toBeVisible();

    // Verify destination index updated
    await expect(page.locator('[data-testid="destination-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="destination-1"]')).not.toBeVisible();
  });

  test('edits existing trip', async ({ page }) => {
    // Create a trip first
    await page.getByText('Create Trip').click();
    await page.getByLabel('Trip Name').fill('Original Trip');
    await page.getByLabel('Start Date').fill('2024-12-01');
    await page.getByLabel('End Date').fill('2024-12-10');

    await page.getByText('Add Destination').click();
    await page.getByLabel('Country').click();
    await page.getByText('Japan').click();
    await page.getByLabel('Arrival Date').fill('2024-12-01');
    await page.getByLabel('Departure Date').fill('2024-12-10');

    await page.getByText('Create Trip').click();

    // Edit the trip
    await page.getByTestId('edit-trip-button').click();

    // Modify trip details
    await page.getByLabel('Trip Name').fill('Updated Trip Name');
    await page.getByLabel('End Date').fill('2024-12-15');

    // Add another destination
    await page.getByText('Add Another Destination').click();
    await page.locator('[data-testid="destination-1"] [aria-label="Country"]').click();
    await page.getByText('Singapore').click();
    await page.locator('[data-testid="destination-1"] [aria-label="Arrival Date"]').fill('2024-12-10');
    await page.locator('[data-testid="destination-1"] [aria-label="Departure Date"]').fill('2024-12-15');

    await page.getByText('Save Changes').click();

    // Verify changes
    await expect(page.getByText('Updated Trip Name')).toBeVisible();
    await expect(page.getByText('Dec 15, 2024')).toBeVisible();
    await expect(page.getByTestId('destination-japan')).toBeVisible();
    await expect(page.getByTestId('destination-singapore')).toBeVisible();
  });

  test('deletes trip with confirmation', async ({ page }) => {
    // Create a trip first
    await page.getByText('Create Trip').click();
    await page.getByLabel('Trip Name').fill('Trip To Delete');
    await page.getByLabel('Start Date').fill('2024-12-01');
    await page.getByLabel('End Date').fill('2024-12-10');
    await page.getByText('Create Trip').click();

    // Back to trip list
    await page.getByText('Back to Trips').click();
    await expect(page.getByText('Trip To Delete')).toBeVisible();

    // Delete trip
    await page.getByTestId('trip-menu-Trip To Delete').click();
    await page.getByText('Delete Trip').click();

    // Confirm deletion
    await expect(page.getByText('Delete Trip?')).toBeVisible();
    await expect(page.getByText('This action cannot be undone')).toBeVisible();
    await page.getByText('Yes, Delete').click();

    // Trip should be removed
    await expect(page.getByText('Trip To Delete')).not.toBeVisible();
    await expect(page.getByText('Create Your First Trip')).toBeVisible();
  });

  test('cancels trip deletion', async ({ page }) => {
    // Create a trip first
    await page.getByText('Create Trip').click();
    await page.getByLabel('Trip Name').fill('Trip To Keep');
    await page.getByLabel('Start Date').fill('2024-12-01');
    await page.getByLabel('End Date').fill('2024-12-10');
    await page.getByText('Create Trip').click();

    await page.getByText('Back to Trips').click();
    
    // Start delete but cancel
    await page.getByTestId('trip-menu-Trip To Keep').click();
    await page.getByText('Delete Trip').click();
    
    await page.getByText('Cancel').click();

    // Trip should still be there
    await expect(page.getByText('Trip To Keep')).toBeVisible();
  });

  test('handles trip list when no trips exist', async ({ page }) => {
    await expect(page.getByText('My Trips')).toBeVisible();
    await expect(page.getByText('Create Your First Trip')).toBeVisible();
    await expect(page.getByText('Ready to start traveling?')).toBeVisible();
    
    // Should show call-to-action
    await expect(page.getByText('Create Trip')).toBeVisible();
  });

  test('shows trip completion status', async ({ page }) => {
    // Create trip with multiple destinations
    await page.getByText('Create Trip').click();
    await page.getByLabel('Trip Name').fill('Status Test Trip');
    await page.getByLabel('Start Date').fill('2024-12-01');
    await page.getByLabel('End Date').fill('2024-12-15');

    // Add Japan
    await page.getByText('Add Destination').click();
    await page.getByLabel('Country').click();
    await page.getByText('Japan').click();
    await page.getByLabel('Arrival Date').fill('2024-12-01');
    await page.getByLabel('Departure Date').fill('2024-12-08');

    // Add Singapore
    await page.getByText('Add Another Destination').click();
    await page.locator('[data-testid="destination-1"] [aria-label="Country"]').click();
    await page.getByText('Singapore').click();
    await page.locator('[data-testid="destination-1"] [aria-label="Arrival Date"]').fill('2024-12-08');
    await page.locator('[data-testid="destination-1"] [aria-label="Departure Date"]').fill('2024-12-15');

    await page.getByText('Create Trip').click();

    // Initially, no forms should be completed
    await expect(page.getByTestId('japan-status-pending')).toBeVisible();
    await expect(page.getByTestId('singapore-status-pending')).toBeVisible();
    await expect(page.getByText('0 of 2 forms completed')).toBeVisible();

    // Complete Japan form (simulated)
    await page.evaluate(() => {
      localStorage.setItem('borderly-form-japan-Status Test Trip', 'completed');
    });
    await page.reload();

    await expect(page.getByTestId('japan-status-complete')).toBeVisible();
    await expect(page.getByTestId('singapore-status-pending')).toBeVisible();
    await expect(page.getByText('1 of 2 forms completed')).toBeVisible();
  });

  test('sorts trips by start date', async ({ page }) => {
    // Create multiple trips
    const trips = [
      { name: 'Future Trip', start: '2025-01-01', end: '2025-01-10' },
      { name: 'Near Trip', start: '2024-12-01', end: '2024-12-10' },
      { name: 'Far Trip', start: '2025-06-01', end: '2025-06-10' }
    ];

    for (const trip of trips) {
      await page.getByText('Create Trip').click();
      await page.getByLabel('Trip Name').fill(trip.name);
      await page.getByLabel('Start Date').fill(trip.start);
      await page.getByLabel('End Date').fill(trip.end);
      await page.getByText('Create Trip').click();
      await page.getByText('Back to Trips').click();
    }

    // Should be sorted with nearest trip first
    const tripCards = await page.locator('[data-testid^="trip-card-"]').all();
    const tripNames = await Promise.all(tripCards.map(card => card.locator('h3').textContent()));
    
    expect(tripNames[0]).toBe('Near Trip');
    expect(tripNames[1]).toBe('Future Trip');
    expect(tripNames[2]).toBe('Far Trip');
  });
});