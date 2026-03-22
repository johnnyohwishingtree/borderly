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
  testMatch: ['captureScreenshots.spec.ts', 'captureFlowSequences.spec.ts', 'captureComponents.spec.ts'],
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
      'onboarding.spec.ts',
      'addCompanions.spec.ts',
      'completeUserFlow.spec.ts',
      'tripCreation.spec.ts',
      'passportScanning.spec.ts',
      'fullJourney.spec.ts',
      'tripAndSubmit.spec.ts',
      'boardingPassScan.spec.ts',
      'formCompletion.spec.ts',
      'settings.spec.ts',
      'theme.spec.ts',
      'demoScan.spec.ts',
      'backup-restore.spec.ts',
      'app-lock.spec.ts',
    ],
    use: { ...devices['Desktop Chrome'], launchOptions: chromiumLaunchOptions },
  },
  {
    name: 'qr-workflow',
    testMatch: 'qrWorkflow.spec.ts',
    use: { ...devices['Desktop Chrome'], launchOptions: chromiumLaunchOptions },
  },
  {
    // Performance tests + deadline/trip-detail smoke tests.
    // deadline-reminders and trip-detail moved here from the chromium project
    // to keep the test-chromium CI job within its 5-minute timeout.
    name: 'performance',
    testMatch: [
      'performance.spec.ts',
      'deadline-reminders.spec.ts',
      'trip-detail.spec.ts',
      'readiness-checklist.spec.ts',
      'leg-form-action-buttons.spec.ts',
      'submission-guide.spec.ts',
      'trip-templates.spec.ts',
      'submission-tracking.spec.ts',
    ],
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
  {
    name: 'portal-submission',
    testMatch: [
      'portalSubmission.spec.ts',
      'passiveAutoFill.spec.ts',
    ],
    use: { ...devices['Desktop Chrome'], launchOptions: chromiumLaunchOptions },
  },
  {
    name: 'account-setup',
    testMatch: 'accountSetup.spec.ts',
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
      'document-validity.spec.ts',
    ],
    use: { ...devices['Desktop Chrome'], launchOptions: chromiumLaunchOptions },
  },
  {
    name: 'country-submissions',
    testMatch: [
      'canadaSubmission.spec.ts',
      'malaysiaSubmission.spec.ts',
      'singaporeSubmission.spec.ts',
      'thailandSubmission.spec.ts',
      'tha-leg.spec.ts',
      'ukSubmission.spec.ts',
      'usaSubmission.spec.ts',
      'vietnamSubmission.spec.ts',
      'vnm-leg.spec.ts',
      'can-gbr-usa-leg.spec.ts',
      'aus-nzl-kor-leg.spec.ts',
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
