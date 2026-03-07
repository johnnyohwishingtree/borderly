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

// CI can target a specific project via E2E_PROJECT env var
const targetProject = process.env.E2E_PROJECT;

const allProjects = [
  {
    name: 'chromium',
    testMatch: [
      'smoke.spec.ts',
      'onboarding.spec.ts',
      'completeUserFlow.spec.ts',
      'tripCreation.spec.ts',
      'passportScanning.spec.ts',
    ],
    use: { ...devices['Desktop Chrome'], launchOptions: chromiumLaunchOptions },
  },
  {
    name: 'qr-workflow',
    testMatch: 'qrWorkflow.spec.ts',
    use: { ...devices['Desktop Chrome'], launchOptions: chromiumLaunchOptions },
  },
  {
    name: 'performance',
    testMatch: 'performance.spec.ts',
    timeout: 45000,
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
  projects: targetProject
    ? allProjects.filter(p => p.name === targetProject)
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
