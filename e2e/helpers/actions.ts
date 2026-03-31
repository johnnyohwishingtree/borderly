/**
 * Shared Playwright actions for E2E tests.
 *
 * Reusable page interactions (onboarding, wizard flow, navigation)
 * that multiple test files need. Import these instead of copy-pasting.
 */
import { expect, type Page } from '@playwright/test';
import { TEST_PASSPORT } from './fixtures';

// ── Manual onboarding flow (enter passport → confirm → done) ──

export async function completeOnboarding(page: Page) {
  await page.getByRole('button', { name: /get started/i }).click();
  await expect(page.getByText(/Quick Passport Scan/)).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: /enter manually/i }).click();

  await page.getByTestId('passport-number-field').fill(TEST_PASSPORT.number);
  await page.getByTestId('surname-field').fill(TEST_PASSPORT.surname);
  await page.getByTestId('given-names-field').fill(TEST_PASSPORT.givenNames);
  await page.getByTestId('nationality-field-trigger').click();
  await page.getByTestId('nationality-field-search').fill('United States');
  await page.getByTestId('nationality-field-option-USA').click();
  await page.getByTestId('dob-field').fill(TEST_PASSPORT.dob);
  await page.getByTestId('gender-Male-button').click();
  await page.getByTestId('passport-expiry-field').fill(TEST_PASSPORT.expiry);
  await page.getByTestId('issuing-country-field-trigger').click();
  await page.getByTestId('issuing-country-field-search').fill('United States');
  await page.getByTestId('issuing-country-field-option-USA').click();

  await page.getByTestId('passport-continue-button').click();
  await expect(page.getByText('Confirm Your Profile')).toBeVisible({ timeout: 10000 });
  await page.getByTestId('continue-to-security-button').click();
  // After onboarding, lands on Forms tab (SelectCountries)
  await expect(page.getByText('Where are you going?')).toBeVisible({ timeout: 10000 });
}

// ── Select countries in the wizard (Step 1) ──

export async function selectCountries(page: Page, countryCodes: string[]) {
  await expect(page.getByText('Where are you going?')).toBeVisible({ timeout: 10000 });
  for (const code of countryCodes) {
    await page.getByTestId(`country-row-${code}`).click();
  }
  await page.getByTestId('select-countries-next-button').click();
}

// ── Fill smart form fields (Step 3 — travelers skipped for solo) ──

export async function fillSmartForm(page: Page, fields: Record<string, string>) {
  await expect(page.getByText('Fill your forms')).toBeVisible({ timeout: 10000 });
  for (const [testId, value] of Object.entries(fields)) {
    await page.getByTestId(testId).fill(value);
  }
  await page.getByTestId('smart-form-done-button').click();
}

// ── Launch a portal from Portal Links (Step 4) ──

export async function launchPortal(page: Page, countryCode: string) {
  await expect(page.getByText('Submit your forms')).toBeVisible({ timeout: 10000 });
  await page.getByTestId(`launch-portal-button-${countryCode}`).click();
}

// ── Imperative navigation via __navigationRef (for state-injected tests) ──

export async function navigateImperatively(page: Page, screen: string, params?: any) {
  await page.waitForFunction(() => (window as any).__navigationRef?.isReady(), { timeout: 10000 });
  await page.evaluate(
    ({ screenName, screenParams }) => {
      const navRef = (window as any).__navigationRef;
      if (screenParams) {
        navRef.navigate(screenName, screenParams);
      } else {
        navRef.navigate(screenName);
      }
    },
    { screenName: screen, screenParams: params },
  );
}
