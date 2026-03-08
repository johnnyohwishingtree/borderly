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
    await expect(page.getByRole('button', { name: '📷 Scan Boarding Pass' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Manually' })).toBeVisible();

    // Top-level destination buttons
    await expect(page.getByRole('button', { name: '📷 Scan' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Add' })).toBeVisible();

    // Create button
    await expect(page.getByRole('button', { name: 'Create Trip' })).toBeVisible();
  });

  test('trip name can be entered', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Your First Trip' }).click();
    await expect(page.getByText('Create New Trip')).toBeVisible();

    const nameInput = page.getByPlaceholder('e.g., Asia Summer 2025');
    await nameInput.fill('Japan Solo Adventure');
    await expect(nameInput).toHaveValue('Japan Solo Adventure');
  });

  test('can add a destination manually', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Your First Trip' }).click();
    await expect(page.getByText('Create New Trip')).toBeVisible();

    await page.getByRole('button', { name: 'Add Manually' }).click();

    // After adding, the empty state should be gone
    await expect(page.getByText('No destinations added yet')).not.toBeVisible();
  });

  test('boarding pass scan option opens scanner', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Your First Trip' }).click();
    await expect(page.getByText('Create New Trip')).toBeVisible();

    await page.getByRole('button', { name: '📷 Scan Boarding Pass' }).click();

    // Should open the boarding pass scanner
    // In demo mode, should show scanning UI
    await expect(page.getByText('Position boarding pass barcode in frame')).toBeVisible();
    await expect(page.getByText('Supports PDF417, Aztec, and QR codes')).toBeVisible();

    // Should have cancel and manual entry options
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Manual' })).toBeVisible();
  });

  test('boarding pass scan cancel returns to form', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Your First Trip' }).click();
    await page.getByRole('button', { name: '📷 Scan Boarding Pass' }).click();
    
    // Wait for scanner to open
    await expect(page.getByText('Position boarding pass barcode in frame')).toBeVisible();
    
    // Cancel should return to trip creation
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Create New Trip')).toBeVisible();
    await expect(page.getByText('No destinations added yet')).toBeVisible();
  });

  test('boarding pass scan manual option adds destination', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Your First Trip' }).click();
    await page.getByRole('button', { name: '📷 Scan Boarding Pass' }).click();
    
    // Wait for scanner to open
    await expect(page.getByText('Position boarding pass barcode in frame')).toBeVisible();
    
    // Manual entry should add a destination and return to form
    await page.getByRole('button', { name: 'Manual' }).click();
    await expect(page.getByText('Create New Trip')).toBeVisible();
    await expect(page.getByText('No destinations added yet')).not.toBeVisible();
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
