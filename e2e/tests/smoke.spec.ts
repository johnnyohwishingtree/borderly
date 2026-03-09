import { test, expect } from '@playwright/test';
import { SUPPORTED_COUNTRY_NAMES } from '../../src/constants/countries';

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
    for (const countryName of SUPPORTED_COUNTRY_NAMES) {
      await expect(page.getByText(countryName)).toBeVisible();
    }

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

  test('icons render as visible SVGs', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible();

    // The welcome screen should have SVG icons (not empty spans or missing glyphs)
    const svgIcons = page.locator('svg[data-icon-name]');
    const count = await svgIcons.count();
    expect(count).toBeGreaterThanOrEqual(3); // At least Lock, Smartphone, Zap

    // Each SVG should have actual child elements (paths/circles), not be empty
    for (let i = 0; i < Math.min(count, 5); i++) {
      const svg = svgIcons.nth(i);
      const childCount = await svg.evaluate(
        (el) => el.querySelectorAll('path, circle, rect, polyline, line').length
      );
      expect(childCount).toBeGreaterThan(0);
    }

    // Verify icons have non-zero rendered dimensions
    const firstIcon = svgIcons.first();
    const box = await firstIcon.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });
});
