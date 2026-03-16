/**
 * Playwright config for portal selector validation.
 *
 * These tests load real government portal pages and verify that the CSS
 * selectors in the field mapping files match actual DOM elements. They are
 * separate from the in-app E2E tests (playwright.config.ts at the root) and
 * are run on-demand, NOT in CI, because government portals may be slow or
 * temporarily unreachable.
 *
 * Run: pnpm portal:validate
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['*.spec.ts'],
  // Government portals can be slow — use longer timeouts
  timeout: 60000,
  use: {
    // No baseURL — each test navigates to a real external URL
    actionTimeout: 30000,
    navigationTimeout: 45000,
    // Headless by default; set PWDEBUG=1 to run headed
    headless: true,
    // Mimic a real browser to avoid bot-detection blocks
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    // Capture screenshot on failure for debugging
    screenshot: 'only-on-failure',
    video: 'off',
  },
  // Validation tests run sequentially — no parallel load on gov portals
  workers: 1,
  fullyParallel: false,
  // Never retry — a pass/fail result should be deterministic for a given run
  retries: 0,
  reporter: [
    ['list'],
    // JSON reporter writes e2e/portal-validation/report.json
    ['json', { outputFile: 'e2e/portal-validation/report.json' }],
  ],
  projects: [
    {
      name: 'portal-validation',
      use: {
        ...devices['Desktop Chrome'],
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    },
  ],
});
