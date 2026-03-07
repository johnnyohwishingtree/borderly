import { test, expect } from '@playwright/test';

test.describe('Passport Scanning Flow', () => {
  test('navigates to passport scan screen from welcome', async ({ page }) => {
    await page.goto('/');

    // Click Get Started
    await page.getByLabel('Get started with Borderly').click();

    // Should reach passport scan screen with method selection
    await expect(page.getByText('Passport Information', { exact: true })).toBeVisible();
  });

  test('shows camera scan and manual entry options', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Get started with Borderly').click();

    // Both scan methods should be available
    await expect(page.getByText('Quick Passport Scan')).toBeVisible();
    await expect(page.getByText('Manual Entry')).toBeVisible();
    await expect(page.getByText('Start Camera Scan')).toBeVisible();
    await expect(page.getByText('Enter Manually')).toBeVisible();
  });

  test('camera scan initializes without infinite loading', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Get started with Borderly').click();

    // Start camera scan
    await page.getByText('Start Camera Scan').click();

    // Camera mock should initialize — should NOT be stuck on "Initializing camera..."
    // The mock calls onCameraReady after 100ms, so the camera overlay should appear
    await expect(page.getByText('Position passport MRZ in frame')).toBeVisible({ timeout: 5000 });

    // Cancel and Manual buttons should be available
    await expect(page.getByText('Cancel')).toBeVisible();
    await expect(page.getByText('Manual')).toBeVisible();
  });

  test('cancel button returns to method selection', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Get started with Borderly').click();

    await page.getByText('Start Camera Scan').click();
    await expect(page.getByText('Position passport MRZ in frame')).toBeVisible({ timeout: 5000 });

    // Cancel should go back
    await page.getByText('Cancel').click();
    await expect(page.getByText('Quick Passport Scan')).toBeVisible();
  });

  test('manual entry from camera screen works', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Get started with Borderly').click();

    await page.getByText('Start Camera Scan').click();
    await expect(page.getByText('Position passport MRZ in frame')).toBeVisible({ timeout: 5000 });

    // Switch to manual entry
    await page.getByText('Manual').click();

    // Should show manual form fields
    await expect(page.getByText('Passport Number')).toBeVisible();
    await expect(page.getByText('Surname (Family Name)')).toBeVisible();
  });

  test('manual entry form renders and accepts input', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Get started with Borderly').click();

    // Go directly to manual entry
    await page.getByText('Enter Manually').click();

    // Form fields should be visible
    await expect(page.getByText('Passport Number')).toBeVisible();
    await expect(page.getByText('Surname (Family Name)')).toBeVisible();
    await expect(page.getByText('Given Names')).toBeVisible();
    await expect(page.getByText('Nationality')).toBeVisible();
    await expect(page.getByText('Date of Birth')).toBeVisible();
  });

  test('no console errors during camera flow', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.getByLabel('Get started with Borderly').click();
    await page.getByText('Start Camera Scan').click();

    // Wait for camera to initialize
    await expect(page.getByText('Position passport MRZ in frame')).toBeVisible({ timeout: 5000 });

    // No fatal errors should have occurred
    const fatalErrors = errors.filter(
      e => !e.includes('Warning:') && !e.includes('cannot be a child of')
    );
    expect(fatalErrors).toEqual([]);
  });
});
