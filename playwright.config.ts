import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'npx webpack serve --config webpack.config.js --port 3000',
    port: 3000,
    timeout: 30000,
    reuseExistingServer: !process.env.CI,
  },
});
