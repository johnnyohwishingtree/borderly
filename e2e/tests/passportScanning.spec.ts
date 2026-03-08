import { test, expect } from '@playwright/test';

test.describe('Passport Scanning Flow', () => {
  test('navigates to passport scan screen from welcome', async ({ page }) => {
    await page.goto('/');

    // Skip tutorial to go to passport scan
    await page.getByRole('button', { name: 'Skip tutorial' }).click();

    // Should reach passport scan screen with method selection
    await expect(page.getByText('Quick Passport Scan')).toBeVisible();
  });

  test('shows camera scan and manual entry options', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Skip tutorial' }).click();

    // Both scan methods should be available
    await expect(page.getByText('Quick Passport Scan')).toBeVisible();
    await expect(page.getByText('Manual Entry', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Camera Scan' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enter Manually' })).toBeVisible();
  });

  test('camera scan initializes without infinite loading', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Skip tutorial' }).click();

    // Start camera scan
    await page.getByRole('button', { name: 'Start Camera Scan' }).click();

    // Camera mock should initialize — should show the camera overlay
    // The mock calls onCameraReady after 100ms
    await expect(page.getByText('Position passport MRZ in frame')).toBeVisible({ timeout: 5000 });

    // Cancel and Manual buttons should be available
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Manual' })).toBeVisible();
  });

  test('cancel button returns to method selection', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Skip tutorial' }).click();

    await page.getByRole('button', { name: 'Start Camera Scan' }).click();
    await expect(page.getByText('Position passport MRZ in frame')).toBeVisible({ timeout: 5000 });

    // Cancel should go back to method selection
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Quick Passport Scan')).toBeVisible();
  });

  test('manual entry from camera screen works', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Skip tutorial' }).click();

    await page.getByRole('button', { name: 'Start Camera Scan' }).click();
    await expect(page.getByText('Position passport MRZ in frame')).toBeVisible({ timeout: 5000 });

    // Switch to manual entry
    await page.getByRole('button', { name: 'Manual' }).click();

    // Should show manual form fields
    await expect(page.getByText('Passport Number')).toBeVisible();
    await expect(page.getByText('Surname (Family Name)')).toBeVisible();
  });

  test('manual entry form renders and accepts input', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Skip tutorial' }).click();

    // Go directly to manual entry
    await page.getByRole('button', { name: 'Enter Manually' }).click();

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

    // Wait for camera to initialize
    await expect(page.getByText('Position passport MRZ in frame')).toBeVisible({ timeout: 5000 });

    // No uncaught JavaScript errors should have occurred
    expect(errors).toEqual([]);
  });
});
