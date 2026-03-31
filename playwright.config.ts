import { defineConfig, devices } from '@playwright/test';

const chromiumLaunchOptions = {
  args: [
    '--enable-precise-memory-info',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--disable-extensions',
    '--disable-plugins',
    '--no-sandbox',
  ],
};

// CI can target specific projects via E2E_PROJECT env var (comma-separated)
const targetProjects = process.env.E2E_PROJECT?.split(',').filter(Boolean);

// Screenshot capture project — excluded from CI, run manually for visual audits.
// Usage: npx playwright test captureScreenshots --project=screenshot-capture
const screenshotProject = {
  name: 'screenshot-capture',
  testMatch: ['captureComponents.spec.ts'],
  fullyParallel: false,
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    launchOptions: chromiumLaunchOptions,
  },
};

const allProjects = [
  {
    name: 'chromium',
    testMatch: [
      'smoke.spec.ts',
      'wizardFlow.spec.ts',
      'passportScanning.spec.ts',
      'formCompletion.spec.ts',
      'settings.spec.ts',
      'theme.spec.ts',
      'demoScan.spec.ts',
      'backup-restore.spec.ts',
    ],
    use: { ...devices['Desktop Chrome'], launchOptions: chromiumLaunchOptions },
  },
  {
    name: 'firefox-smoke',
    testMatch: 'smoke.spec.ts',
    use: { ...devices['Desktop Firefox'] },
  },
  {
    name: 'mobile-smoke',
    testMatch: 'smoke.spec.ts',
    use: { ...devices['Pixel 5'] },
  },
  {
    name: 'portal-submission',
    testMatch: [
      'passiveAutoFill.spec.ts',
    ],
    use: { ...devices['Desktop Chrome'], launchOptions: chromiumLaunchOptions },
  },
  {
    name: 'family',
    testMatch: [
      'family-management.spec.ts',
      'family-workflows.spec.ts',
    ],
    use: { ...devices['Desktop Chrome'], launchOptions: chromiumLaunchOptions },
  },
  {
    name: 'profile',
    testMatch: [
      'profile.spec.ts',
    ],
    use: { ...devices['Desktop Chrome'], launchOptions: chromiumLaunchOptions },
  },
];

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? 'line' : 'html',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: targetProjects?.length
    ? [...allProjects, screenshotProject].filter(p => targetProjects.includes(p.name))
    : allProjects,
  webServer: {
    // In CI with pre-built bundle, use a lightweight static server.
    // Locally, use webpack-dev-server for hot reload.
    command: process.env.CI
      ? 'npx serve e2e --listen 3000 --no-clipboard'
      : 'npx webpack serve --config webpack.config.js --port 3000',
    port: 3000,
    timeout: process.env.CI ? 10000 : 60000,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
