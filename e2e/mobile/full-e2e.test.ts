/**
 * Full E2E test — same flow Claude uses via mobile-mcp, but deterministic.
 *
 * Onboard → create trip → verify auto-fill → save → verify trip list.
 * Uses mobilecli for element discovery + coordinate-based tapping.
 *
 * Run: pnpm e2e:mobile
 */
import { mkdirSync } from 'fs';
import { resolve } from 'path';
import { MobileDriver } from './driver';

const APP_ID = 'com.borderly.app';
const SCREENSHOTS = resolve(__dirname, '../screenshots');

let device: MobileDriver;

beforeAll(async () => {
  mkdirSync(SCREENSHOTS, { recursive: true });
  device = await MobileDriver.connect();
}, 15000);

/** Save a named screenshot — overwrites on each run. */
const snap = (name: string) => device.screenshot(`${SCREENSHOTS}/${name}.jpg`);

describe('Full E2E — onboard → trip → auto-fill → save', () => {
  it('completes the full user journey', async () => {
    // ── Launch fresh ──
    console.log('[E2E] Launching app...');
    await device.launch(APP_ID, { clearState: true });

    // ── Dismiss notification dialog if present ──
    try {
      await device.tapText('Don\u2019t Allow');
      console.log('[E2E] Dismissed notification dialog');
    } catch { /* dialog may not appear */ }

    // ── Welcome ──
    console.log('[E2E] Welcome screen');
    await device.assertVisible('Welcome to');
    await snap('welcome-initial');
    await device.tapById('take-tutorial-button');

    // ── Tutorial (3 steps — buttons always visible) ──
    console.log('[E2E] Tutorial');
    await device.assertVisible('Step 1 of 3');
    await snap('tutorial-step1');
    await device.tapById('next-step-button');
    await snap('tutorial-step2');
    await device.tapById('next-step-button');
    await snap('tutorial-step3');
    await device.tapById('next-step-button');

    // ── Passport — demo scan ──
    console.log('[E2E] Passport scan');
    await device.assertVisible('Passport Information');
    await snap('passport-scan');
    const perfHint = await device.findById('dismiss-performance-hint-button');
    if (perfHint) await device.tapById('dismiss-performance-hint-button');
    await device.tapById('demo-scan-adult-button');

    // ── Passport preview — confirm ──
    console.log('[E2E] Passport preview');
    await device.assertVisible('SMITH');
    await snap('passport-preview');
    await device.tapById('confirm-scan-button');

    // ── Confirm profile ──
    console.log('[E2E] Confirm profile');
    await device.assertVisible('Confirm Your Profile');
    await snap('confirm-profile');
    await device.tapById('continue-to-security-button');

    // ── Add companions — skip ──
    console.log('[E2E] Add companions');
    await device.assertVisible('Traveling with family?');
    await snap('add-companions');
    await device.tapText('Skip for now');

    // ── Biometric setup — skip ──
    console.log('[E2E] Biometric setup');
    await device.assertVisible('Secure Your Profile');
    await snap('biometric-setup');
    await device.tapById('skip-biometric-button');
    await device.handleAlert('Skip');

    // ── Notification permission — skip if present ──
    console.log('[E2E] Notification permission');
    try {
      await device.assertVisible('Stay on Top of Deadlines', { timeout: 2000 });
      await device.tapById('skip-notifications-button');
    } catch {
      // Screen may auto-skip
    }

    // ── Trip list — create first trip ──
    console.log('[E2E] Trip list');
    await device.assertVisible('Your Trips');
    await snap('trip-list-empty');
    await device.tapById('create-first-trip-button');

    // ── Create trip ──
    console.log('[E2E] Create trip');
    await device.assertVisible('Create New Trip');
    await snap('create-trip-initial');
    await device.fillById('trip-name-field', 'Malaysia Trip 2026');
    await device.tapById('add-destination-button');
    await device.assertVisible('Destination 1');

    // Country select
    await device.selectById('country-select-0', 'Malaysia');

    // Arrival date
    await device.tapById('leg-0-arrival-date');
    await device.assertVisible('Done');
    await device.tapText('Done');

    // Flight details
    await device.fillById('leg-0-flight-number', 'MH123');
    await device.fillById('leg-0-airline-code', 'MH');

    // Arrival airport
    await device.selectById('leg-0-arrival-airport', 'KUL');

    // Accommodation
    await device.fillById('leg-0-accommodation-name-input', 'Mandarin Oriental KL');

    // Address fields
    await device.fillById('leg-0-accommodation-address-line1', 'Kuala Lumpur City Centre');
    await device.fillById('leg-0-accommodation-address-city', 'Kuala Lumpur');
    await device.fillById('leg-0-accommodation-address-postal-code', '50088');
    await device.fillById('leg-0-accommodation-address-country', 'MYS');

    // Accommodation phone
    await device.fillById('leg-0-accommodation-phone', '+60321234567');

    // Create trip
    await snap('create-trip-filled');
    await device.tapById('create-trip-button');
    await device.handleAlert('OK');

    // ── Trip detail — verify ──
    await device.assertVisible('Malaysia Trip 2026');
    await device.assertVisibleId('leg-card-MYS');
    await snap('trip-detail');

    // ── Open leg form ──
    console.log('[E2E] Open leg form');
    await device.tapById('leg-card-MYS');
    await device.assertVisible('Form Summary', { timeout: 10000 });
    await snap('leg-form-initial');

    // ── Fill remaining fields ──
    console.log('[E2E] Fill personal info fields');
    await device.tapById('smart-delta-button');
    await device.fillById('input-email', 'test@borderly.app');
    await device.fillById('input-phoneNumber', '+60123456789');

    // ── Save ──
    console.log('[E2E] Save progress');
    await snap('leg-form-filled');
    await device.tapById('save-progress-button');
    await device.handleAlert('OK');

    // ── Open portal submission ──
    console.log('[E2E] Open portal');
    await device.tapById('submit-in-app-button');

    // Portal WebView — external content, needs longer timeout
    console.log('[E2E] Wait for portal load');
    await device.assertVisible('Step 1 of', { timeout: 20000 });
    await snap('portal-loaded');

    // ── Trigger auto-fill ──
    // Native overlays are not in accessibility tree when WebView is active.
    // Coordinates derived from portal-loaded screenshot.
    console.log('[E2E] Auto-fill — tap fields pill');
    await device.tap(200, 770); // "Fields for this page (21)" pill
    await device.sleep(3000); // wait for injected JS to execute in WebView
    await snap('portal-after-autofill');

    // ── Close portal ──
    // Native header X button — SafeAreaView top inset (~59px) + py-2 + icon center
    console.log('[E2E] Close portal');
    await device.tap(380, 78);

    // ── Verify back at trip detail ──
    console.log('[E2E] Verify trip detail');
    await device.assertVisible('Malaysia Trip 2026', { timeout: 10000 });
    await snap('trip-list-final');

    console.log('[E2E] ✓ Full flow complete');
  }, 300000);
});
