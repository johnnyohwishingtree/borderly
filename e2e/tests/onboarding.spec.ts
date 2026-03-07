import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test('welcome screen renders and CTA is interactive', async ({ page }) => {
    await page.goto('/');

    // Welcome screen loads
    await expect(page.getByText('Welcome to')).toBeVisible();
    await expect(page.getByText('Borderly')).toBeVisible();

    // CTA button is present and enabled
    const button = page.getByLabel('Get started with Borderly');
    await button.scrollIntoViewIfNeeded();
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });
});
