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

// Serialisable shape exposed by the harness via window.__componentRegistry.
type RegistryInfo = Record<string, { domain: string; variants: string[] }>;

test.describe('Component Screenshot Capture', () => {
  test.setTimeout(120000);

  test('capture all component variants', async ({ page }) => {
    // Load the harness once to read the registry from the window object.
    await page.goto('/component-harness');
    await page.waitForLoadState('networkidle');

    // Read the registry metadata that component-harness.tsx exposes on window.
    const registry: RegistryInfo = await page.evaluate(() =>
      (window as unknown as Record<string, RegistryInfo>).__componentRegistry,
    );

    const componentNames = Object.keys(registry);
    expect(componentNames.length).toBeGreaterThan(0);

    let totalCaptured = 0;

    for (const componentName of componentNames) {
      const { domain, variants } = registry[componentName];

      for (const variant of variants) {
        await page.goto(`/component-harness?component=${componentName}&variant=${variant}`);
        // Wait for the harness container to render
        await expect(page.getByTestId('component-harness')).toBeVisible({ timeout: 5000 });

        // Determine the screenshot output path
        const screenshotsDir = path.join(SRC_COMPONENTS_DIR, domain, componentName, '__screenshots__');
        fs.mkdirSync(screenshotsDir, { recursive: true });

        const screenshotPath = path.join(screenshotsDir, `${variant}.png`);

        // Screenshot just the component container, not the full page
        const harness = page.getByTestId('component-harness');
        await harness.screenshot({ path: screenshotPath });

        totalCaptured++;
      }

      // Write per-component manifest
      const screenshotsDir = path.join(SRC_COMPONENTS_DIR, domain, componentName, '__screenshots__');
      const manifestPath = path.join(screenshotsDir, 'manifest.json');
      const manifest = {
        component: componentName,
        domain,
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
