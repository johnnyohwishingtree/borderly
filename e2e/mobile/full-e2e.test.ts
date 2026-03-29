/**
 * Full E2E test — same flow Claude uses via mobile-mcp, but deterministic.
 *
 * Onboard → create trip → verify auto-fill → save → verify trip list.
 * No Maestro, no YAML generation, no brute-force scrolling.
 * Uses mobilecli for element discovery + coordinate-based tapping.
 *
 * Run: pnpm e2e:mobile
 */
import { MobileDriver } from './driver';

const APP_ID = 'com.borderly.app';

let device: MobileDriver;

beforeAll(async () => {
  device = await MobileDriver.connect();
}, 15000);

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
    await device.tapById('take-tutorial-button');

    // ── Tutorial (3 steps — buttons always visible) ──
    console.log('[E2E] Tutorial');
    await device.assertVisible('Step 1 of 3');
    await device.tapById('next-step-button');
    await device.tapById('next-step-button');
    await device.tapById('next-step-button');

    // ── Passport — demo scan ──
    console.log('[E2E] Passport scan');
    await device.assertVisible('Passport Information');
    const perfHint = await device.findById('dismiss-performance-hint-button');
    if (perfHint) await device.tapById('dismiss-performance-hint-button');
    await device.tapById('demo-scan-adult-button');

    // ── Passport preview — confirm ──
    console.log('[E2E] Passport preview');
    await device.assertVisible('SMITH');
    await device.tapById('confirm-scan-button');

    // ── Confirm profile ──
    console.log('[E2E] Confirm profile');
    await device.assertVisible('Confirm Your Profile');
    await device.assertVisible('JOHN MICHAEL SMITH');
    await device.tapById('continue-to-security-button');

    // ── Add companions — skip ──
    console.log('[E2E] Add companions');
    await device.assertVisible('Traveling with family?');
    await device.tapText('Skip for now');

    // ── Biometric setup — skip ──
    console.log('[E2E] Biometric setup');
    await device.assertVisible('Secure Your Profile');
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
    await device.assertVisible('No trips yet');
    await device.tapById('create-first-trip-button');

    // ── Create trip ──
    console.log('[E2E] Create trip');
    await device.assertVisible('Create New Trip');
    await device.fillById('trip-name-field', 'Malaysia Trip 2026');
    await device.tapById('add-destination-button');

    // Wait for leg card to render
    await device.assertVisible('Destination 1');

    // Country select
    await device.selectById('country-select-0', 'Malaysia');

    // Arrival date — tap to open custom picker, tap Done
    await device.tapById('leg-0-arrival-date');
    await device.assertVisible('Done', { timeout: 2000 });
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
    await device.tapById('create-trip-button');
    await device.handleAlert('OK'); // "Success" alert

    // ── Trip detail — verify ──
    await device.assertVisible('Malaysia Trip 2026');
    await device.assertVisibleId('leg-card-MYS');

    // ── Open leg form ──
    console.log('[E2E] Open leg form — tapping leg card');
    await device.tapById('leg-card-MYS');
    console.log('[E2E] Tapped leg card, waiting for form');
    await device.assertVisible('Form Summary', { timeout: 10000 });
    console.log('[E2E] Leg form loaded');

    // ── Fill remaining fields not from trip data (email, phone) ──
    console.log('[E2E] Fill personal info fields');
    await device.tapById('smart-delta-button'); // expands all sections
    await device.fillById('input-email', 'test@borderly.app');
    await device.fillById('input-phoneNumber', '+60123456789');

    // ── Save and submit ──
    console.log('[E2E] Save progress');
    await device.tapById('save-progress-button');
    await device.handleAlert('OK');

    // ── Open portal submission ──
    console.log('[E2E] Open portal');
    await device.tapById('submit-in-app-button');

    // Wait for portal to load (real Malaysia MDAC website)
    console.log('[E2E] Wait for portal load');
    await device.assertVisible('Fields for this page', { timeout: 20000 });

    // ── Trigger auto-fill by tapping the pill at the bottom ──
    console.log('[E2E] Auto-fill');
    await device.tapText('Fields for this page');

    // ── Verify auto-fill results ──
    console.log('[E2E] Verify auto-fill');
    await device.assertVisible('Filled', { timeout: 10000 });

    // ── Close portal ──
    console.log('[E2E] Close portal');
    // Tap the X/close button or navigate back
    await device.tap(20, 100); // back area

    // ── Verify back at trip detail ──
    console.log('[E2E] Back at trip detail');
    await device.assertVisible('Malaysia Trip 2026', { timeout: 5000 });

    console.log('[E2E] ✓ Full flow complete');
  }, 300000); // 5 minute timeout for full flow
});
