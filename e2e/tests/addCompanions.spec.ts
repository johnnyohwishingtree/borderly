import { test, expect } from '@playwright/test';
import { navigateToAddCompanions } from '../helpers/actions';

/**
 * E2E tests for the AddCompanionsScreen in the onboarding flow.
 *
 * Verifies:
 * - Screen renders correctly after ConfirmProfile
 * - "Traveling with family?" headline is visible
 * - "Add a travel companion" button is visible
 * - "Continue — just me" skip button works → navigates to BiometricSetup
 */

test.describe('AddCompanions Screen', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
  });

  test('renders after ConfirmProfile with correct headline', async ({ page }) => {
    await navigateToAddCompanions(page);

    await expect(page.getByTestId('add-companions-title')).toBeVisible();
    await expect(page.getByText('Traveling with family?')).toBeVisible();
    await expect(page.getByText('Scan their passports now so forms auto-fill for everyone')).toBeVisible();
  });

  test('shows add companion button', async ({ page }) => {
    await navigateToAddCompanions(page);

    await expect(page.getByTestId('add-companion-button')).toBeVisible();
    await expect(page.getByTestId('add-companion-button')).toBeEnabled();
  });

  test('skip/continue button is visible and navigates to BiometricSetup', async ({ page }) => {
    await navigateToAddCompanions(page);

    const continueBtn = page.getByTestId('companions-continue-button');
    await expect(continueBtn).toBeVisible();
    await expect(continueBtn).toBeEnabled();

    // "Continue — just me" when no companions added
    await expect(continueBtn).toContainText(/Continue/i);

    await continueBtn.click();
    await expect(page.getByText('Secure Your Profile')).toBeVisible({ timeout: 10000 });
  });

  test('ConfirmProfile "Continue" navigates to AddCompanions (not BiometricSetup)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await page.getByRole('button', { name: 'Or enter manually' }).click();

    await page.getByTestId('passport-number-input').fill('ZX9876543');
    await page.getByTestId('surname-input').fill('JONES');
    await page.getByTestId('given-names-input').fill('ALICE');
    await page.getByTestId('nationality-input-trigger').click();
    await page.getByTestId('nationality-input-search').fill('United States');
    await page.getByTestId('nationality-input-option-USA').click();
    await page.getByTestId('dob-input').fill('1988-03-22');
    await page.getByTestId('gender-Female-button').click();
    await page.getByTestId('passport-expiry-input').fill('2029-09-15');
    await page.getByTestId('issuing-country-input-trigger').click();
    await page.getByTestId('issuing-country-input-search').fill('United States');
    await page.getByTestId('issuing-country-input-option-USA').click();

    await page.getByTestId('passport-continue-button').click();
    await expect(page.getByText('Confirm Your Profile')).toBeVisible({ timeout: 10000 });

    // Clicking Continue should go to AddCompanions, NOT BiometricSetup
    await page.getByTestId('continue-to-security-button').click();
    await expect(page.getByTestId('add-companions-title')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Traveling with family?')).toBeVisible();
    // Should NOT be on BiometricSetup
    await expect(page.getByText('Secure Your Profile')).not.toBeVisible();
  });
});
