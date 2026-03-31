/**
 * Shared E2E journey definitions.
 *
 * Each journey is a function that takes an E2EDriver and executes
 * the same steps regardless of platform. Both Playwright and mobile
 * tests import these — change once, both tests update.
 *
 * Journeys describe WHAT to do. Drivers describe HOW to do it.
 */
import type { E2EDriver } from './e2eDriver';

// ── Onboarding ──────────────────────────────────────────────────────────────

export async function onboardWithDemoPassport(driver: E2EDriver) {
  await driver.assertVisible('Welcome to');
  await driver.screenshot('welcome-initial');
  await driver.tapById('take-tutorial-button');

  // Passport scan
  await driver.assertVisible('Passport Information');
  await driver.screenshot('passport-scan');
  // Dismiss performance hint if present
  try { await driver.tapById('dismiss-performance-hint-button'); } catch { /* may not appear */ }
  await driver.tapById('demo-scan-adult-button');

  // Passport preview — confirm
  await driver.assertVisible('SMITH');
  await driver.screenshot('passport-preview');
  await driver.tapById('confirm-scan-button');

  // Confirm profile — completes onboarding
  await driver.assertVisible('Confirm Your Profile');
  await driver.screenshot('confirm-profile');
  await driver.tapById('continue-to-security-button');
}

// ── Wizard Step 1: Select Countries ─────────────────────────────────────────

/**
 * Select countries by ISO code (e.g. 'MYS', 'JPN').
 * Uses testID-based tapping — each row has `country-row-{CODE}`.
 */
export async function selectCountries(driver: E2EDriver, countryCodes: string[]) {
  await driver.assertVisible('Where are you going?');
  await driver.screenshot('select-countries-initial');

  for (const code of countryCodes) {
    await driver.tapById(`country-row-${code}`);
  }
  await driver.screenshot('select-countries-selected');
  await driver.tapById('select-countries-next-button');
}

// ── Wizard Step 2: Select Travelers (auto-skipped for solo) ─────────────────

// No function needed — solo travelers skip to SmartForm automatically.
// For family tests, add a selectTravelers() journey here.

// ── Wizard Step 3: Smart Form ───────────────────────────────────────────────

export async function fillSmartForm(
  driver: E2EDriver,
  fields?: { testID: string; value: string }[],
) {
  await driver.assertVisible('Fill your forms', { timeout: 10000 });
  await driver.screenshot('smart-form-initial');

  if (fields) {
    for (const { testID, value } of fields) {
      await driver.fillById(testID, value);
    }
    await driver.screenshot('smart-form-filled');
  }

  await driver.tapById('smart-form-done-button');
}

// ── Wizard Step 4: Portal Links ─────────────────────────────────────────────

export async function launchPortal(driver: E2EDriver, countryCode: string) {
  await driver.assertVisible('Submit your forms', { timeout: 10000 });
  await driver.screenshot('portal-links');
  await driver.tapById(`launch-portal-button-${countryCode}`);
}

// ── Portal Submission ───────────────────────────────────────────────────────

export async function portalAutoFill(driver: E2EDriver) {
  await driver.assertVisible('Step 1 of', { timeout: 20000 });
  await driver.screenshot('portal-loaded');

  // Auto-fill pill is a native overlay not in accessibility tree
  await driver.tap(200, 770);
  await driver.sleep(3000);
  await driver.screenshot('portal-after-autofill');
}

export async function closePortal(driver: E2EDriver) {
  // X button in portal header
  await driver.tap(380, 78);
  await driver.assertVisible('Submit your forms', { timeout: 10000 });
  await driver.screenshot('portal-links-final');
}

// ── Full journey: onboard → wizard → portal ─────────────────────────────────

export async function fullWizardJourney(driver: E2EDriver) {
  await onboardWithDemoPassport(driver);
  await selectCountries(driver, ['MYS']);
  // Solo traveler — auto-skips to SmartForm
  await fillSmartForm(driver);
  // TODO: PortalLinks depends on SmartForm creating a trip — implement useSmartForm fully
  // await launchPortal(driver, 'MYS');
  // await portalAutoFill(driver);
  // await closePortal(driver);
}
