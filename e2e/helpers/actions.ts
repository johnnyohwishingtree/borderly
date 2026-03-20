/**
 * Shared Playwright actions for E2E tests.
 *
 * Reusable page interactions (onboarding, trip creation, navigation)
 * that multiple test files need. Import these instead of copy-pasting.
 */
import { expect, type Page } from '@playwright/test';
import { TEST_PASSPORT } from './fixtures';

// ── Manual onboarding flow (skip tutorial → enter passport → confirm → skip biometric) ──

export async function completeOnboarding(page: Page) {
  await page.getByRole('button', { name: 'Skip tutorial' }).click();
  await page.getByRole('button', { name: 'Enter Manually' }).click();

  await page.getByTestId('passport-number-input').fill(TEST_PASSPORT.number);
  await page.getByTestId('surname-input').fill(TEST_PASSPORT.surname);
  await page.getByTestId('given-names-input').fill(TEST_PASSPORT.givenNames);
  await page.getByTestId('nationality-input-trigger').click();
  await page.getByTestId('nationality-input-search').fill('United States');
  await page.getByTestId('nationality-input-option-USA').click();
  await page.getByTestId('dob-input').fill(TEST_PASSPORT.dob);
  await page.getByTestId('gender-Male-button').click();
  await page.getByTestId('passport-expiry-input').fill(TEST_PASSPORT.expiry);
  await page.getByTestId('issuing-country-input-trigger').click();
  await page.getByTestId('issuing-country-input-search').fill('United States');
  await page.getByTestId('issuing-country-input-option-USA').click();

  await page.getByTestId('passport-continue-button').click();
  await expect(page.getByText('Confirm Your Profile')).toBeVisible({ timeout: 10000 });
  await page.getByTestId('continue-to-security-button').click();
  await expect(page.getByTestId('add-companions-title')).toBeVisible({ timeout: 10000 });
  await page.getByTestId('companions-continue-button').click();
  await expect(page.getByText('Secure Your Profile')).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'Skip for Now' }).click();
  await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 10000 });
}

// ── Navigate through onboarding up to the AddCompanions screen ──

export async function navigateToAddCompanions(page: Page) {
  await page.goto('/');
  await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Skip tutorial' }).click();
  await expect(page.getByText(/Quick Passport Scan/)).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Or enter manually' }).click();

  await page.getByTestId('passport-number-input').fill('AB1234567');
  await page.getByTestId('surname-input').fill('SMITH');
  await page.getByTestId('given-names-input').fill('JOHN');
  await page.getByTestId('nationality-input-trigger').click();
  await page.getByTestId('nationality-input-search').fill('United States');
  await page.getByTestId('nationality-input-option-USA').click();
  await page.getByTestId('dob-input').fill('1990-01-15');
  await page.getByTestId('gender-Male-button').click();
  await page.getByTestId('passport-expiry-input').fill('2030-12-31');
  await page.getByTestId('issuing-country-input-trigger').click();
  await page.getByTestId('issuing-country-input-search').fill('United States');
  await page.getByTestId('issuing-country-input-option-USA').click();

  await page.getByTestId('passport-continue-button').click();
  await expect(page.getByText('Confirm Your Profile')).toBeVisible({ timeout: 10000 });
  await page.getByTestId('continue-to-security-button').click();
  await expect(page.getByTestId('add-companions-title')).toBeVisible({ timeout: 10000 });
}

// ── Create a Japan trip (from the My Trips screen) ──

export async function createJapanTrip(page: Page) {
  await page.getByTestId('create-first-trip-button').click();
  await expect(page.getByText('Create New Trip')).toBeVisible({ timeout: 10000 });

  await page.getByTestId('add-destination-button').click();
  await page.getByTestId('country-JPN').click();

  await page.getByTestId('trip-name-input').fill('Smith Family Asia');

  await page.getByTestId('leg-0-arrival-date').fill('2026-07-01');
  await page.getByTestId('leg-0-departure-date').fill('2026-07-07');
  await page.getByTestId('leg-0-flight-number').fill('NH101');
  await page.getByTestId('leg-0-airline-code').fill('NH');
  await page.getByTestId('leg-0-arrival-airport').fill('NRT');
  await page.getByTestId('leg-0-accommodation-name').fill('Park Hyatt Tokyo');
  await page.getByTestId('leg-0-accommodation-address').fill('3-7-1-2 Nishi Shinjuku');
  await page.getByTestId('leg-0-accommodation-city').fill('Tokyo');
  await page.getByTestId('leg-0-accommodation-postal-code').fill('163-1055');

  await page.getByTestId('create-trip-button').click();
  await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
}

// ── Navigate from trip list to a specific leg form ──

export async function navigateToLegForm(page: Page, tripName: string, countryCode: string) {
  await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 10000 });

  const tripCard = page.getByTestId(`trip-card-${tripName}`);
  await tripCard.click();
  await expect(page.getByText('Itinerary', { exact: true })).toBeVisible({ timeout: 10000 });

  await page.getByTestId(`leg-card-${countryCode}`).click();
  await expect(page.getByText('Travel Form')).toBeVisible({ timeout: 15000 });
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
