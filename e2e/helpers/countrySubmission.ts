/**
 * Parameterized country submission test factory.
 *
 * Each country submission test file defines its trip config and calls
 * this factory. The factory generates the standard 2-test suite:
 *   1. Trip detail shows the country's leg card
 *   2. Leg form renders with DynamicForm
 *
 * This eliminates ~130 lines of duplicated boilerplate per country.
 */
import { test, expect } from '@playwright/test';
import { type CountryTripConfig, countryTripState, injectState } from './fixtures';
import { createErrorTracker } from './errorTracking';

export interface CountrySubmissionConfig extends CountryTripConfig {
  /** Display name for the test suite, e.g. "Canada eTA" */
  suiteName: string;
}

export function createCountrySubmissionTests(config: CountrySubmissionConfig) {
  const state = countryTripState(config);
  const tracker = createErrorTracker();

  test.describe(`${config.suiteName} Submission`, () => {
    test.beforeEach(async ({ page }) => {
      tracker.setup(page);
    });

    test.afterEach(() => {
      tracker.assertNoCriticalErrors();
    });

    test(`trip detail shows ${config.countryCode} leg card`, async ({ page }) => {
      await injectState(page, state);
      await page.goto('/');

      await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 10000 });

      const tripCard = page.getByTestId(`trip-card-${config.tripName}`);
      await tripCard.click();
      await expect(page.getByText('Itinerary', { exact: true })).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId(`leg-card-${config.countryCode}`)).toBeVisible({ timeout: 5000 });
    });

    test(`${config.countryCode} leg form renders with DynamicForm`, async ({ page }) => {
      test.setTimeout(45000);
      await injectState(page, state);
      await page.goto('/');

      await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 10000 });

      const tripCard = page.getByTestId(`trip-card-${config.tripName}`);
      await tripCard.click();
      await expect(page.getByTestId(`leg-card-${config.countryCode}`)).toBeVisible({ timeout: 10000 });
      await page.getByTestId(`leg-card-${config.countryCode}`).click();

      await expect(page.getByText('Travel Form')).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId('dynamic-form')).toBeVisible({ timeout: 10000 });
    });
  });
}
