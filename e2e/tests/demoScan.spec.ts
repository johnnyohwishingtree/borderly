import { test, expect } from '@playwright/test';

test.describe('Demo Passport Scan Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Skip tutorial
    await page.getByTestId('take-tutorial-button').click();
    await page.getByTestId('tutorial-skip-button').click();
    // Wait for passport scan screen
    await expect(page.getByText('Passport Information')).toBeVisible({ timeout: 15000 });
  });

  test('demo scan buttons are visible in dev mode', async ({ page }) => {
    await expect(page.getByTestId('demo-scan-adult')).toBeVisible();
    await expect(page.getByTestId('demo-scan-spouse')).toBeVisible();
    await expect(page.getByTestId('demo-scan-child')).toBeVisible();
  });

  test('demo scan adult fills passport preview with correct data', async ({ page }) => {
    await page.getByTestId('demo-scan-adult').click();

    // Should show passport preview with demo data
    await expect(page.getByText('L12345678')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('JOHN MICHAEL SMITH')).toBeVisible();
    await expect(page.getByText('USA')).toBeVisible();
  });

  test('demo scan spouse fills with different persona', async ({ page }) => {
    await page.getByTestId('demo-scan-spouse').click();

    await expect(page.getByText('M98765432')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('JANE MARIE SMITH')).toBeVisible();
  });

  test('demo scan child fills with child persona', async ({ page }) => {
    await page.getByTestId('demo-scan-child').click();

    await expect(page.getByText('N55512345')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('EMMA SMITH')).toBeVisible();
  });

  test('demo scan confirm navigates to ConfirmProfile', async ({ page }) => {
    await page.getByTestId('demo-scan-adult').click();

    // Confirm the scan
    await expect(page.getByTestId('confirm-scan-button')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('confirm-scan-button').click();

    // Should navigate to Confirm Profile screen
    await expect(page.getByText('Confirm Your Profile')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('L12345678')).toBeVisible();
    await expect(page.getByText('JOHN MICHAEL SMITH')).toBeVisible();
  });
});
