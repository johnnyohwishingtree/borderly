import { test, expect } from '@playwright/test';
import { SUPPORTED_COUNTRY_NAMES } from '../../src/constants/countries';

test.describe('Complete User Flow', () => {
  test('welcome screen shows onboarding for new users', async ({ page }) => {
    // No injected state — fresh user sees onboarding
    await page.goto('/');

    // Welcome screen
    await expect(page.getByText('Welcome to')).toBeVisible();
    await expect(page.getByText('Borderly').first()).toBeVisible();

    // Feature descriptions
    await expect(page.getByText('Private & Secure')).toBeVisible();
    await expect(page.getByText('Works Offline')).toBeVisible();
    await expect(page.getByText('Lightning Fast')).toBeVisible();

    // CTA buttons
    await expect(page.getByRole('button', { name: 'Take quick tutorial' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Skip tutorial' })).toBeVisible();
  });

  test('welcome screen shows supported countries', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Supported Countries')).toBeVisible();
    
    for (const countryName of SUPPORTED_COUNTRY_NAMES) {
      await expect(page.getByText(countryName).first()).toBeVisible();
    }
  });

  test('get started navigates to passport information screen', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Skip tutorial' }).click();

    // Passport scan screen shows method selection
    await expect(page.getByText(/Quick Passport Scan|Optimized Passport Scan/)).toBeVisible();
    await expect(page.getByText('Manual Entry', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enter Manually' })).toBeVisible();
  });

  test('can navigate to manual entry from passport screen', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await expect(page.getByText(/Quick Passport Scan|Optimized Passport Scan/)).toBeVisible();

    // Click "Enter Manually" button
    await page.getByRole('button', { name: 'Enter Manually' }).click();

    // Manual entry form should show passport fields
    await expect(page.getByText('Passport Number')).toBeVisible();
    await expect(page.getByText('Surname (Family Name)')).toBeVisible();
    await expect(page.getByText('Given Names')).toBeVisible();
  });

  test('manual entry form has required field indicators', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await expect(page.getByText(/Quick Passport Scan|Optimized Passport Scan/)).toBeVisible();

    await page.getByRole('button', { name: 'Enter Manually' }).click();

    // All required fields should be visible with their labels
    await expect(page.getByRole('textbox', { name: 'Passport Number' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Surname (Family Name)' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Given Names' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Nationality' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Date of Birth' })).toBeVisible();

    // Gender options should be available
    await expect(page.getByRole('button', { name: 'Male' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Female' }).first()).toBeVisible();

    // Continue and Back buttons
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
  });

  test('onboarding complete users skip to trip list', async ({ page }) => {
    // Inject completed onboarding state
    await page.addInitScript(() => {
      window.__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          firstName: 'Jane',
          lastName: 'Smith',
          passportNumber: 'CD9876543',
          nationality: 'CA',
          dateOfBirth: '1985-05-15',
          gender: 'F'
        },
      };
    });
    await page.goto('/');

    // Should skip onboarding and show trip list
    await expect(page.getByText('My Trips')).toBeVisible();
    await expect(page.getByText('No trips yet')).toBeVisible();
  });

  test('can navigate back from passport screen to welcome', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await expect(page.getByText(/Quick Passport Scan|Optimized Passport Scan/)).toBeVisible();

    // Go back
    await page.getByRole('button', { name: 'Back' }).click();

    // Should return to welcome screen
    await expect(page.getByText('Welcome to')).toBeVisible();
    await expect(page.getByText('Borderly').first()).toBeVisible();
  });
});
