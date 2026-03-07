import { test, expect } from '@playwright/test';

test.describe('QR Code Workflow and Wallet', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          firstName: 'Bob',
          lastName: 'Wilson',
          passportNumber: 'CA9876543',
          nationality: 'CA',
          dateOfBirth: '1990-07-20',
          gender: 'M'
        },
      };
    });
    await page.goto('/');
  });

  test('shows trip list as default screen', async ({ page }) => {
    // Verify we land on the trip list (main screen after onboarding)
    await expect(page.getByText('My Trips')).toBeVisible();
    await expect(page.getByText('No trips yet')).toBeVisible();
  });

  test('QR Wallet tab is visible in tab bar', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'QR Wallet tab' })).toBeVisible();
  });

  test('all navigation tabs are present', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Trips tab' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'QR Wallet tab' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Profile tab' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Settings tab' })).toBeVisible();
  });

  test('trips tab is selected by default', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Trips tab', selected: true })).toBeVisible();
  });

  test('can create a trip from empty state', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Your First Trip' }).click();
    await expect(page.getByText('Create New Trip')).toBeVisible();
    await expect(page.getByText('Trip Details')).toBeVisible();
  });

  test('trip creation form has destination section', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Your First Trip' }).click();
    await expect(page.getByText('Create New Trip')).toBeVisible();

    // Destination section
    await expect(page.getByText('Destinations', { exact: true })).toBeVisible();
    await expect(page.getByText('No destinations added yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Your First Destination' })).toBeVisible();
  });

  test('can fill trip name and add destination', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Your First Trip' }).click();
    await expect(page.getByText('Create New Trip')).toBeVisible();

    // Fill trip name
    const nameInput = page.getByPlaceholder('e.g., Asia Summer 2025');
    await nameInput.fill('QR Test Trip');
    await expect(nameInput).toHaveValue('QR Test Trip');

    // Add destination
    await page.getByRole('button', { name: 'Add Your First Destination' }).click();
    await expect(page.getByText('No destinations added yet')).not.toBeVisible();
  });
});
