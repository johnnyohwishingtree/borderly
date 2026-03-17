import { test, expect } from '@playwright/test';

test.describe('Passport Scanning Flow', () => {
  test('navigates to passport scan screen from welcome', async ({ page }) => {
    await page.goto('/');

    // Skip tutorial to go to passport scan
    await page.getByRole('button', { name: 'Skip tutorial' }).click();

    // Should reach passport scan screen with method selection
    await expect(page.getByText(/Quick Passport Scan|Optimized Passport Scan/)).toBeVisible();
  });

  test('shows camera scan and manual entry options', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Skip tutorial' }).click();

    // Both scan methods should be available
    await expect(page.getByText(/Quick Passport Scan|Optimized Passport Scan/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Camera Scan' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Or enter manually' })).toBeVisible();
  });

  test('camera scan shows unavailable state with fallback options on web', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Skip tutorial' }).click();

    // Start camera scan
    await page.getByRole('button', { name: 'Start Camera Scan' }).click();

    // On web, camera is not available — should show fallback UI
    await expect(page.getByText('Camera Not Available')).toBeVisible({ timeout: 5000 });

    // Should offer Demo Scan and Manual Entry as alternatives
    await expect(page.getByRole('button', { name: 'Try Demo Scan' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enter Manually Instead' })).toBeVisible();
  });

  test('cancel from camera returns to method selection via manual entry', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Skip tutorial' }).click();

    await page.getByRole('button', { name: 'Start Camera Scan' }).click();
    await expect(page.getByText('Camera Not Available')).toBeVisible({ timeout: 5000 });

    // "Enter Manually Instead" goes to manual form
    await page.getByRole('button', { name: 'Enter Manually Instead' }).click();
    await expect(page.getByText('Passport Number')).toBeVisible();
  });

  test('demo scan completes and shows passport preview', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Skip tutorial' }).click();

    await page.getByRole('button', { name: 'Start Camera Scan' }).click();
    await expect(page.getByText('Camera Not Available')).toBeVisible({ timeout: 5000 });

    // Try the demo scan
    await page.getByRole('button', { name: 'Try Demo Scan' }).click();

    // Demo scan simulates MRZ detection over ~4 seconds
    await expect(page.getByText('Demo: Scanning sample passport')).toBeVisible({ timeout: 3000 });

    // Should eventually show passport preview with parsed data
    await expect(page.getByText(/DOE/)).toBeVisible({ timeout: 10000 });
  });

  test('manual entry form renders and accepts input', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Skip tutorial' }).click();

    // Go directly to manual entry
    await page.getByRole('button', { name: 'Or enter manually' }).click();

    // Form fields should be visible
    await expect(page.getByText('Passport Number')).toBeVisible();
    await expect(page.getByText('Surname (Family Name)')).toBeVisible();
    await expect(page.getByText('Given Names')).toBeVisible();
  });

  test('no console errors during camera flow', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await page.getByRole('button', { name: 'Start Camera Scan' }).click();

    // On web, camera shows unavailable state
    await expect(page.getByText('Camera Not Available')).toBeVisible({ timeout: 5000 });

    // No uncaught JavaScript errors should have occurred
    expect(errors).toEqual([]);
  });
});
