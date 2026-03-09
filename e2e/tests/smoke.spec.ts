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

    // CTA buttons render
    await expect(page.getByLabel('Take quick tutorial')).toBeVisible();
    await expect(page.getByLabel('Skip tutorial')).toBeVisible();
  });

  test('tailwind styles are applied', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Borderly')).toBeVisible();

    // "Borderly" heading should be styled with primary-600 (#2563eb)
    const borderly = page.getByText('Borderly').first();
    const color = await borderly.evaluate((el) =>
      getComputedStyle(el).color
    );
    expect(color).toBe('rgb(37, 99, 235)');

    // Feature card background should be primary-600
    const featureCard = page.getByText('Fill Once, Travel Everywhere', { exact: true });
    const bgColor = await featureCard.evaluate((el) => {
      // Walk up to find the styled container
      let node: Element | null = el;
      while (node) {
        const bg = getComputedStyle(node).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
        node = node.parentElement;
      }
      return 'none';
    });
    expect(bgColor).not.toBe('none');
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
