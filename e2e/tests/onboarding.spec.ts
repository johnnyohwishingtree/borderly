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
});
