import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Component screenshot capture test.
 *
 * Renders each registered component variant via the component harness
 * and saves screenshots to src/components/<domain>/<Component>/__screenshots__/.
 *
 * Run with:
 *   E2E_PROJECT=screenshot-capture npx playwright test captureComponents --project=screenshot-capture --workers=1
 *
 * This is much faster than the full-app captureScreenshots.spec.ts because
 * it renders isolated components — no navigation, no state injection, no sleeps.
 */

const SRC_COMPONENTS_DIR = path.resolve(__dirname, '../../src/components');

// Import the registry at runtime via the page — we can't import TSX directly
// in Playwright. Instead, we fetch the registry structure from the harness.

test.describe('Component Screenshot Capture', () => {
  test.setTimeout(120000);

  test('capture all component variants', async ({ page }) => {
    // First, get the list of all components and variants from the harness
    await page.goto('/component-harness');
    await expect(page.getByText('Registered components:')).toBeVisible({ timeout: 15000 });

    // Get component list from the page
    const registeredText = await page.getByText('Registered components:').textContent();
    const componentNames = registeredText!
      .replace('Registered components: ', '')
      .split(', ')
      .map(s => s.trim())
      .filter(Boolean);

    expect(componentNames.length).toBeGreaterThan(0);

    let totalCaptured = 0;

    for (const componentName of componentNames) {
      // Navigate to the component with no variant to get the variant list
      await page.goto(`/component-harness?component=${componentName}&variant=__list__`);
      // The harness shows "Unknown variant: __list__ for X\nAvailable: v1, v2, ..."
      const availableText = await page.locator('text=Available:').textContent();
      const variants = availableText!
        .replace('Available: ', '')
        .split(', ')
        .map(s => s.trim())
        .filter(Boolean);

      for (const variant of variants) {
        await page.goto(`/component-harness?component=${componentName}&variant=${variant}`);
        // Wait for the harness container to render
        await expect(page.getByTestId('component-harness')).toBeVisible({ timeout: 5000 });

        // Determine the screenshot output path
        const screenshotsDir = path.join(SRC_COMPONENTS_DIR, getDomain(componentName), componentName, '__screenshots__');
        fs.mkdirSync(screenshotsDir, { recursive: true });

        const screenshotPath = path.join(screenshotsDir, `${variant}.png`);

        // Screenshot just the component container, not the full page
        const harness = page.getByTestId('component-harness');
        await harness.screenshot({ path: screenshotPath });

        totalCaptured++;
      }

      // Write per-component manifest
      const screenshotsDir = path.join(SRC_COMPONENTS_DIR, getDomain(componentName), componentName, '__screenshots__');
      const manifestPath = path.join(screenshotsDir, 'manifest.json');
      const manifest = {
        component: componentName,
        domain: getDomain(componentName),
        capturedAt: new Date().toISOString(),
        variants: variants.map(v => ({
          file: `${v}.png`,
          variant: v,
        })),
      };
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    }

    console.log(`Captured ${totalCaptured} component screenshots across ${componentNames.length} components`);
  });
});

// Domain mapping — matches the registry structure
// We derive this from the filesystem since the registry isn't importable in Playwright
function getDomain(componentName: string): string {
  const SRC = path.resolve(__dirname, '../../src/components');
  for (const domain of fs.readdirSync(SRC, { withFileTypes: true })) {
    if (!domain.isDirectory()) continue;
    const files = fs.readdirSync(path.join(SRC, domain.name));
    if (files.includes(`${componentName}.tsx`)) {
      return domain.name;
    }
  }
  return 'ui'; // fallback
}
