import { test, expect } from '@playwright/test';

test.describe('Trip Creation and Management', () => {
  test.beforeEach(async ({ page }) => {
    // Inject state BEFORE page loads so the MMKV mock picks it up
    await page.addInitScript(() => {
      window.__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          passportNumber: 'AB1234567',
          nationality: 'US',
          dateOfBirth: '1990-01-01',
          gender: 'M'
        },
      };
    });
    await page.goto('/');
  });

  test('shows trip list screen with empty state', async ({ page }) => {
    await expect(page.getByText('My Trips')).toBeVisible();
    await expect(page.getByText('No trips yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Your First Trip' })).toBeVisible();
  });

  test('navigates to create trip screen', async ({ page }) => {
    await expect(page.getByText('My Trips')).toBeVisible();
    await page.getByRole('button', { name: 'Create Your First Trip' }).click();

    // Should show the create trip form
    await expect(page.getByText('Create New Trip')).toBeVisible();
    await expect(page.getByText('Trip Details')).toBeVisible();
    await expect(page.getByText('Destinations', { exact: true })).toBeVisible();
  });

  test('create trip form has required elements', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Your First Trip' }).click();
    await expect(page.getByText('Create New Trip')).toBeVisible();

    // Trip name input
    await expect(page.getByPlaceholder('e.g., Asia Summer 2025')).toBeVisible();

    // Destination section
    await expect(page.getByText('No destinations added yet')).toBeVisible();
    await expect(page.getByTestId('empty-state-scan-button')).toBeVisible();
    await expect(page.getByTestId('empty-state-add-button')).toBeVisible();

    // Top-level destination buttons (these are the small buttons in the header)
    await expect(page.getByTestId('add-destination-button')).toBeVisible();
    await expect(page.getByTestId('scan-destination-button')).toBeVisible();

    // Create button
    await expect(page.getByRole('button', { name: 'Create Trip' })).toBeVisible();
  });

  test('trip name can be entered', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Your First Trip' }).click();
    await expect(page.getByText('Create New Trip')).toBeVisible();

    const nameInput = page.getByTestId('trip-name-input');
    await nameInput.fill('Japan Solo Adventure');
    await expect(nameInput).toHaveValue('Japan Solo Adventure');
  });

  test('can add a destination manually', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Your First Trip' }).click();
    await expect(page.getByText('Create New Trip')).toBeVisible();

    await page.getByTestId('add-destination-button').click();

    // After adding, the empty state should be gone
    await expect(page.getByText('No destinations added yet')).not.toBeVisible();
  });

  test('boarding pass scan option opens scanner', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Your First Trip' }).click();
    await expect(page.getByText('Create New Trip')).toBeVisible();

    await page.getByRole('button', { name: 'Scan Boarding Pass' }).click();

    // Should open the boarding pass scanner
    // In demo mode, should show scanning UI
    await expect(page.getByText('Position boarding pass barcode in frame')).toBeVisible();
    await expect(page.getByText('Supports PDF417, Aztec, and QR codes')).toBeVisible();

    // Should have cancel and manual entry options (use more specific selectors)
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByTestId('camera-view').getByRole('button', { name: 'Manual' })).toBeVisible();
  });

  test.describe('when boarding pass scanner is open', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: 'Create Your First Trip' }).click();
      await page.getByRole('button', { name: 'Scan Boarding Pass' }).click();
      await expect(page.getByText('Position boarding pass barcode in frame')).toBeVisible();
    });

    test('cancel returns to form', async ({ page }) => {
      // Cancel should return to trip creation
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByText('Create New Trip')).toBeVisible();
      await expect(page.getByText('No destinations added yet')).toBeVisible();
    });

    test('manual option adds destination', async ({ page }) => {
      // Manual entry should add a destination and return to form (use specific selector)
      await page.getByTestId('camera-view').getByRole('button', { name: 'Manual' }).click();
      await expect(page.getByText('Create New Trip')).toBeVisible();
      await expect(page.getByText('No destinations added yet')).not.toBeVisible();
    });
  });

  test('can fill in destination details', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Your First Trip' }).click();
    await page.getByTestId('add-destination-button').click();

    // Fill arrival date
    await page.getByTestId('leg-0-arrival-date').fill('2026-07-01');
    await expect(page.getByTestId('leg-0-arrival-date')).toHaveValue('2026-07-01');

    // Fill departure date
    await page.getByTestId('leg-0-departure-date').fill('2026-07-07');
    await expect(page.getByTestId('leg-0-departure-date')).toHaveValue('2026-07-07');

    // Verify arrival date is NOT merged into departure date
    // (This indirectly tests that they are separate inputs correctly identified)
    await expect(page.getByTestId('leg-0-arrival-date')).not.toHaveValue(/2026-07-07/);
    await expect(page.getByTestId('leg-0-departure-date')).not.toHaveValue(/2026-07-012/); // Check for the merged case from screenshot

    // Fill other fields
    await page.getByTestId('leg-0-flight-number').fill('NH101');
    await page.getByTestId('leg-0-airline-code').fill('NH');
    await page.getByTestId('leg-0-arrival-airport').fill('NRT');

    await expect(page.getByTestId('leg-0-flight-number')).toHaveValue('NH101');
    await expect(page.getByTestId('leg-0-airline-code')).toHaveValue('NH');
    await expect(page.getByTestId('leg-0-arrival-airport')).toHaveValue('NRT');
  });

  test('tab bar shows all navigation options', async ({ page }) => {
    await expect(page.getByText('My Trips')).toBeVisible();

    // Tab bar should show all tabs
    await expect(page.getByRole('tab', { name: 'Trips tab' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'QR Wallet tab' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Profile tab' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Settings tab' })).toBeVisible();

    // Trips tab should be selected
    await expect(page.getByRole('tab', { name: 'Trips tab', selected: true })).toBeVisible();
  });
});
