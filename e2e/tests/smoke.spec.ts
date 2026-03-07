import { test, expect } from '@playwright/test';

test.describe('App Smoke Test', () => {
  test('app launches and renders welcome screen', async ({ page }) => {
    await page.goto('/');

    // Core text renders
    await expect(page.getByText('Welcome to')).toBeVisible();
    await expect(page.getByText('Borderly')).toBeVisible();

    // Feature highlights render
    await expect(page.getByText('Private & Secure')).toBeVisible();
    await expect(page.getByText('Works Offline')).toBeVisible();
    await expect(page.getByText('Lightning Fast')).toBeVisible();

    // Supported countries render
    await expect(page.getByText('Japan')).toBeVisible();
    await expect(page.getByText('Malaysia')).toBeVisible();
    await expect(page.getByText('Singapore')).toBeVisible();

    // CTA button renders
    await expect(page.getByLabel('Get started with Borderly')).toBeVisible();
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible();

    // Filter out known non-critical RN Web warnings
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('React does not recognize') &&
        !e.includes('Warning:') &&
        !e.includes('cannot be a child of') &&
        !e.includes('cannot contain a nested') &&
        !e.includes('shadow*') &&
        !e.includes('In HTML,')
    );
    expect(criticalErrors).toEqual([]);
  });
});
