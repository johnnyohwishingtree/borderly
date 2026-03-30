/**
 * Shared Playwright actions for E2E tests.
 *
 * Reusable page interactions (onboarding, trip creation, navigation)
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
  await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 10000 });
}

// ── Create a Japan trip (from the My Trips screen) ──

export async function createJapanTrip(page: Page) {
  await page.getByTestId('create-first-trip-button').click();
  await expect(page.getByText('Create New Trip')).toBeVisible({ timeout: 10000 });

  await page.getByTestId('add-destination-button').click();
  await page.getByTestId('country-select-0-trigger').click();
  await page.getByTestId('country-select-0-search').fill('Japan');
  await page.getByTestId('country-select-0-option-JPN').click();

  await page.getByTestId('trip-name-field').fill('Smith Family Asia');

  await page.getByTestId('leg-0-arrival-date').fill('2026-07-01');
  await page.getByTestId('leg-0-departure-date').fill('2026-07-07');
  await page.getByTestId('leg-0-flight-number').fill('NH101');
  await page.getByTestId('leg-0-airline-code').fill('NH');
  // Arrival airport is a SearchableSelect — open, search, select
  await page.getByTestId('leg-0-arrival-airport-trigger').click();
  await page.getByTestId('leg-0-arrival-airport-search').fill('NRT');
  await page.getByTestId('leg-0-arrival-airport-option-NRT').click();
  await page.getByTestId('leg-0-accommodation-name-input').fill('Park Hyatt Tokyo');
  await page.getByTestId('leg-0-accommodation-address-line1').fill('3-7-1-2 Nishi Shinjuku');
  await page.getByTestId('leg-0-accommodation-address-city').fill('Tokyo');
  await page.getByTestId('leg-0-accommodation-address-postal-code').fill('163-1055');

  await page.getByTestId('create-trip-button').click();
  // After trip creation the app navigates directly to TripDetail (issue #525)
  await expect(page.getByText('Itinerary', { exact: true })).toBeVisible({ timeout: 15000 });
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
