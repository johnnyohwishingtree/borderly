import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        profile: {
          firstName: 'Performance',
          lastName: 'Test',
          passportNumber: 'PF1234567',
          nationality: 'US',
          dateOfBirth: '1990-01-01',
          gender: 'M'
        },
      };
    });
    await page.goto('/');
  });

  test('app startup time is within acceptable limits', async ({ page }) => {
    const startTime = Date.now();
    await expect(page.getByText('My Trips')).toBeVisible();
    const startupTime = Date.now() - startTime;

    expect(startupTime).toBeLessThan(3000);
    console.log(`App startup time: ${startupTime}ms`);
  });

  test('trip list renders quickly with empty state', async ({ page }) => {
    const startTime = Date.now();

    await expect(page.getByText('No trips yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Your First Trip' })).toBeVisible();

    const renderTime = Date.now() - startTime;
    expect(renderTime).toBeLessThan(3000);
    console.log(`Trip list empty state render time: ${renderTime}ms`);
  });

  test('create trip screen loads quickly', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Your First Trip' }).click();

    const startTime = Date.now();
    await expect(page.getByText('Create New Trip')).toBeVisible();
    await expect(page.getByPlaceholder('e.g., Asia Summer 2025')).toBeVisible();
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);
    console.log(`Create trip screen load time: ${loadTime}ms`);
  });

  test('form input is responsive', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Your First Trip' }).click();
    await expect(page.getByText('Create New Trip')).toBeVisible();

    const startTime = Date.now();
    const nameInput = page.getByPlaceholder('e.g., Asia Summer 2025');
    await nameInput.fill('Performance Test Trip');
    await expect(nameInput).toHaveValue('Performance Test Trip');
    const inputTime = Date.now() - startTime;

    expect(inputTime).toBeLessThan(1000);
    console.log(`Form input time: ${inputTime}ms`);
  });

  test('adding destination is responsive', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Your First Trip' }).click();
    await expect(page.getByText('Create New Trip')).toBeVisible();

    const startTime = Date.now();
    await page.getByRole('button', { name: 'Add Manually' }).click();
    await expect(page.getByText('No destinations added yet')).not.toBeVisible();
    const addTime = Date.now() - startTime;

    expect(addTime).toBeLessThan(1000);
    console.log(`Add destination time: ${addTime}ms`);
  });

  test('memory usage during form operations', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Memory measurement is only available in Chromium');

    await page.evaluate(() => {
      if (window.gc) window.gc();
    });

    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
    });

    // Navigate to create trip and interact
    await page.getByRole('button', { name: 'Create Your First Trip' }).click();
    await expect(page.getByText('Create New Trip')).toBeVisible();
    await page.getByPlaceholder('e.g., Asia Summer 2025').fill('Memory Test Trip');
    await page.getByRole('button', { name: 'Add Manually' }).click();

    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
    });

    const memoryIncrease = finalMemory - initialMemory;
    if (finalMemory > 0) {
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    }
  });

  test('back navigation is responsive', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Your First Trip' }).click();
    await expect(page.getByText('Create New Trip')).toBeVisible();

    // Navigate back using the back link
    const startTime = Date.now();
    await page.getByRole('link', { name: /back/i }).click();
    await expect(page.getByText('My Trips')).toBeVisible();
    const navTime = Date.now() - startTime;

    expect(navTime).toBeLessThan(2000);
    console.log(`Back navigation time: ${navTime}ms`);
  });

  test('repeated navigation is stable', async ({ page }) => {
    const startTime = Date.now();

    // Navigate back and forth between trip list and create trip
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Create Your First Trip' }).click();
      await expect(page.getByText('Create New Trip')).toBeVisible();
      await page.getByRole('link', { name: /back/i }).click();
      await expect(page.getByText('My Trips')).toBeVisible();
    }

    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(10000);
    console.log(`3x round-trip navigation time: ${totalTime}ms`);
  });

  test('tab bar renders correctly', async ({ page }) => {
    const startTime = Date.now();

    await expect(page.getByRole('tab', { name: 'Trips tab' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'QR Wallet tab' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Profile tab' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Settings tab' })).toBeVisible();

    const renderTime = Date.now() - startTime;
    expect(renderTime).toBeLessThan(1000);
    console.log(`Tab bar render time: ${renderTime}ms`);
  });
});
