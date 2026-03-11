import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test('welcome screen renders and CTA is interactive', async ({ page }) => {
    await page.goto('/');

    // Welcome screen loads
    await expect(page.getByText('Welcome to')).toBeVisible();
    await expect(page.getByText('Borderly').first()).toBeVisible();

    // Tutorial and skip buttons are present and enabled
    const tutorialButton = page.getByRole('button', { name: 'Take quick tutorial' });
    const skipButton = page.getByRole('button', { name: 'Skip tutorial' });
    await expect(tutorialButton).toBeVisible();
    await expect(tutorialButton).toBeEnabled();
    await expect(skipButton).toBeVisible();
    await expect(skipButton).toBeEnabled();
  });

  test('completes manual onboarding flow', async ({ page }) => {
    await page.goto('/');

    // Welcome screen -> Skip tutorial
    await page.getByRole('button', { name: 'Skip tutorial' }).click();

    // Passport selection -> Enter Manually
    await page.getByRole('button', { name: 'Enter Manually' }).click();

    // Fill passport form using testIDs
    await page.getByTestId('passport-number-input').fill('L12345678');
    await page.getByTestId('surname-input').fill('SMITH');
    await page.getByTestId('given-names-input').fill('JOHN MICHAEL');
    await page.getByTestId('nationality-input').fill('USA');
    await page.getByTestId('dob-input').fill('1985-06-15');
    
    // Gender selection
    await page.getByTestId('gender-Male-button').click();

    await page.getByTestId('passport-expiry-input').fill('2032-03-20');
    await page.getByTestId('issuing-country-input').fill('USA');

    // Submit and verify next screen
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Confirm Your Profile')).toBeVisible();
    await expect(page.getByText('L12345678')).toBeVisible();
    await expect(page.getByText('JOHN MICHAEL SMITH')).toBeVisible();
  });
});
