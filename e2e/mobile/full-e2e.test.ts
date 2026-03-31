/**
 * Full mobile E2E test — runs against a real iOS simulator.
 *
 * Uses the shared journey definition so this test stays in sync
 * with the Playwright E2E (e2e/tests/wizardFlow.spec.ts).
 *
 * Run: pnpm e2e:mobile
 */
import { mkdirSync } from 'fs';
import { resolve } from 'path';
import { MobileDriverAdapter } from '../shared/mobileDriver';
import { fullWizardJourney } from '../shared/journeys';

const APP_ID = 'com.borderly.app';
const SCREENSHOTS = resolve(__dirname, '../screenshots');

let driver: MobileDriverAdapter;

beforeAll(async () => {
  mkdirSync(SCREENSHOTS, { recursive: true });
  driver = await MobileDriverAdapter.connect();
}, 15000);

describe('Full E2E — onboard → wizard → auto-fill', () => {
  it('completes the full user journey', async () => {
    // Launch fresh
    console.log('[E2E] Launching app...');
    await driver.raw.launch(APP_ID, { clearState: true });

    // Dismiss notification dialog if present
    try {
      await driver.tapText('Don\u2019t Allow');
      console.log('[E2E] Dismissed notification dialog');
    } catch { /* dialog may not appear */ }

    // Run the shared journey
    await fullWizardJourney(driver);

    console.log('[E2E] \u2713 Full flow complete');
  }, 300000);
});
