import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0, // Reduced retries to save time
  workers: process.env.CI ? 3 : undefined, // Enable parallel execution in CI
  reporter: 'html',
  timeout: 30000, // Reduced timeout to 30s to fail fast
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off', // Disable video to save time
    // Speed up tests
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    // Primary test project - fast chromium for core functionality
    {
      name: 'chromium',
      testMatch: [
        'smoke.spec.ts',
        'onboarding.spec.ts',
        'completeUserFlow.spec.ts',
        'tripCreation.spec.ts',
        'passportScanning.spec.ts'
      ],
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--disable-extensions',
            '--disable-plugins',
            '--no-sandbox', // Faster startup
          ]
        }
      },
    },
    // QR workflow tests - medium priority  
    {
      name: 'qr-workflow',
      testMatch: 'qrWorkflow.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--disable-extensions',
            '--disable-plugins',
            '--no-sandbox',
          ]
        }
      },
    },
    // Performance tests - run only on chromium as they're browser-agnostic
    {
      name: 'performance',
      testMatch: 'performance.spec.ts',
      timeout: 45000, // Slightly longer for performance tests
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--disable-extensions',
            '--disable-plugins',
            '--no-sandbox',
          ]
        }
      },
    },
    // Cross-browser validation - only critical tests
    {
      name: 'firefox-smoke',
      testMatch: 'smoke.spec.ts',
      use: { ...devices['Desktop Firefox'] },
    },
    // Mobile validation - minimal critical tests only  
    {
      name: 'mobile-smoke',
      testMatch: 'smoke.spec.ts',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npx webpack serve --config webpack.config.js --port 3000',
    port: 3000,
    timeout: 60000,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
