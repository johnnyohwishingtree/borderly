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

  test('tutorial has exactly 3 slides with correct content', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible();

    // Enter tutorial
    await page.getByRole('button', { name: 'Take quick tutorial' }).click();

    const slides = [
      { title: 'Fill Once, Travel Everywhere', step: 'Step 1 of 3' },
      { title: 'Your Data Stays on Your Phone', step: 'Step 2 of 3' },
      { title: "Let's Scan Your Passport", step: 'Step 3 of 3' },
    ];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      await expect(page.getByText(slide.title)).toBeVisible();
      await expect(page.getByText(slide.step)).toBeVisible();
      // Skip button is available on every slide
      await expect(page.getByTestId('skip-tutorial-button')).toBeVisible();
      await page.getByTestId('next-step-button').click();
    }

    // Final slide CTA (clicking next on last slide) navigates to PassportScan
    await expect(page.getByText(/Quick Passport Scan/)).toBeVisible({ timeout: 10000 });
  });

  test('completes manual onboarding flow', async ({ page }) => {
    await page.goto('/');

    // Welcome screen -> Skip tutorial
    await page.getByRole('button', { name: 'Skip tutorial' }).click();

    // Passport selection -> Enter Manually
    await page.getByRole('button', { name: 'Or enter manually' }).click();

    // Fill passport form using testIDs
    await page.getByTestId('passport-number-input').fill('L12345678');
    await page.getByTestId('surname-input').fill('SMITH');
    await page.getByTestId('given-names-input').fill('JOHN MICHAEL');
    await page.getByTestId('nationality-input-trigger').click();
    await page.getByTestId('nationality-input-search').fill('United States');
    await page.getByTestId('nationality-input-option-USA').click();
    await page.getByTestId('dob-input').fill('1985-06-15');
    
    // Gender selection
    await page.getByTestId('gender-Male-button').click();

    await page.getByTestId('passport-expiry-input').fill('2032-03-20');
    await page.getByTestId('issuing-country-input-trigger').click();
    await page.getByTestId('issuing-country-input-search').fill('United States');
    await page.getByTestId('issuing-country-input-option-USA').click();

    // Submit and verify next screen
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Confirm Your Profile')).toBeVisible();
    await expect(page.getByText('L12345678')).toBeVisible();
    await expect(page.getByText('JOHN MICHAEL SMITH')).toBeVisible();
  });
});
