import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Component screenshot capture test — parallelizable.
 *
 * Renders each registered component variant via the component harness
 * and saves screenshots to src/components/<domain>/<Component>/__screenshots__/.
 *
 * Run with:
 *   E2E_PROJECT=screenshot-capture npx playwright test captureComponents --project=screenshot-capture
 *
 * This is much faster than the full-app captureScreenshots.spec.ts because
 * it renders isolated components — no navigation, no state injection, no sleeps.
 * Each component is a separate test, so Playwright can run them in parallel.
 */

const SRC_COMPONENTS_DIR = path.resolve(__dirname, '../../src/components');

// Build the component list at file parse time by scanning the components
// directory. This avoids a runtime page load to discover components, allowing
// Playwright to generate parallel tests statically.
// On a fresh repo (no components yet), fall back to a single serial test.
//
// Handles two layouts:
//   - File-based:      src/components/<domain>/<ComponentName>.tsx
//   - Directory-based: src/components/<domain>/<ComponentName>/<ComponentName>.tsx
// Results are deduplicated (a component may have both a .tsx file and a
// sibling directory for __screenshots__) and sorted for deterministic output.
function discoverComponents(): string[] {
  const componentSet = new Set<string>();
  for (const domain of fs.readdirSync(SRC_COMPONENTS_DIR, { withFileTypes: true })) {
    if (!domain.isDirectory()) continue;
    const domainPath = path.join(SRC_COMPONENTS_DIR, domain.name);
    for (const item of fs.readdirSync(domainPath, { withFileTypes: true })) {
      if (item.isFile()) {
        // File-based component: PascalCase .tsx file (skip .web.tsx platform overrides)
        if (item.name.endsWith('.tsx') && !item.name.includes('.web.') && /^[A-Z]/.test(item.name)) {
          componentSet.add(item.name.slice(0, -4)); // strip .tsx
        }
      } else if (item.isDirectory() && /^[A-Z]/.test(item.name)) {
        // Directory-based component: PascalCase dir containing a .tsx file
        const hasTsx = fs.readdirSync(path.join(domainPath, item.name))
          .some(f => f.endsWith('.tsx') && !f.includes('.web.'));
        if (hasTsx) {
          componentSet.add(item.name);
        }
      }
    }
  }
  return [...componentSet].sort();
}

function getDomain(componentName: string): string {
  for (const domain of fs.readdirSync(SRC_COMPONENTS_DIR, { withFileTypes: true })) {
    if (!domain.isDirectory()) continue;
    const files = fs.readdirSync(path.join(SRC_COMPONENTS_DIR, domain.name));
    if (files.includes(`${componentName}.tsx`) || files.includes(componentName)) {
      return domain.name;
    }
  }
  return 'ui';
}

async function getVariants(page: import('@playwright/test').Page, componentName: string): Promise<string[]> {
  await page.goto(`/component-harness?component=${componentName}&variant=__list__`);
  const availableEl = page.locator('text=Available:');
  // If the component isn't in the registry, it won't have an "Available:" line
  if (!(await availableEl.isVisible({ timeout: 3000 }).catch(() => false))) {
    return [];
  }
  const availableText = await availableEl.textContent();
  return availableText!
    .replace('Available: ', '')
    .split(', ')
    .map(s => s.trim())
    .filter(Boolean);
}

async function captureComponent(page: import('@playwright/test').Page, componentName: string) {
  const variants = await getVariants(page, componentName);
  if (variants.length === 0) return 0;

  const domain = getDomain(componentName);
  const screenshotsDir = path.join(SRC_COMPONENTS_DIR, domain, componentName, '__screenshots__');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  for (const variant of variants) {
    await page.goto(`/component-harness?component=${componentName}&variant=${variant}`);
    await expect(page.getByTestId('component-harness')).toBeVisible({ timeout: 5000 });

    const screenshotPath = path.join(screenshotsDir, `${variant}.png`);
    await page.getByTestId('component-harness').screenshot({ path: screenshotPath });
  }

  // Write per-component manifest
  const manifestPath = path.join(screenshotsDir, 'manifest.json');
  const manifest = {
    component: componentName,
    domain,
    capturedAt: new Date().toISOString(),
    variants: variants.map(v => ({ file: `${v}.png`, variant: v })),
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  return variants.length;
}

// Discover components from filesystem
const knownComponents = discoverComponents();

// If we have known components, create a parallel test per component.
// Otherwise fall back to a single serial discovery test (first run).
if (knownComponents.length > 0) {
  test.describe('Component Screenshot Capture', () => {
    test.describe.configure({ mode: 'parallel' });

    for (const componentName of knownComponents) {
      test(`capture ${componentName}`, async ({ page }) => {
        const count = await captureComponent(page, componentName);
        if (count > 0) {
          // eslint-disable-next-line no-console
          console.log(`  ${componentName}: ${count} variants`);
        }
      });
    }
  });
} else {
  // Fallback: discover from harness and capture serially (first run only)
  test('capture all component variants (initial discovery)', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/component-harness');
    await expect(page.getByText('Registered components:')).toBeVisible({ timeout: 15000 });

    const registeredText = await page.getByText('Registered components:').textContent();
    const componentNames = registeredText!
      .replace('Registered components: ', '')
      .split(', ')
      .map(s => s.trim())
      .filter(Boolean);

    let total = 0;
    for (const name of componentNames) {
      total += await captureComponent(page, name);
    }
    // eslint-disable-next-line no-console
    console.log(`Captured ${total} screenshots across ${componentNames.length} components`);
  });
}
