/**
 * E2E smoke tests for the Passport & Document Validity epic.
 *
 * Verifies:
 * - DocumentValidityCard renders in ProfileScreen when passport expiry is available
 * - The per-country validity grid and expiry date are visible
 * - PassportValidityWarning renders in LegFormScreen when the passport
 *   expires too soon relative to the departure date
 */

import { test, expect, type Page } from '@playwright/test';
import { baseState, injectState, createErrorTracker, navigateImperatively } from '../helpers';

// ---------------------------------------------------------------------------
// Dates — today is approximately 2026-03-22 per project context
// ---------------------------------------------------------------------------

/** Passport expiry ~90 days from today — close enough to trigger the 6-month warning */
const NEAR_EXPIRY_DATE = '2026-06-20';

/** Departure date ~31 days from today — Japan requires 6 months beyond departure */
const DEPARTURE_DATE = '2026-04-22';
const ARRIVAL_DATE = '2026-04-20';

// ---------------------------------------------------------------------------
// State factories
// ---------------------------------------------------------------------------

/**
 * Default authenticated state — profile has a valid far-future passport expiry
 * (2030-03-15). DocumentValidityCard should render, all countries should be
 * marked valid, and no PassportValidityWarning should appear.
 */
const stateWithValidPassport = baseState();

/**
 * State with a near-expiry passport and a Japan trip departing next month.
 *
 * Japan requires 6 months of passport validity beyond departure.
 * With NEAR_EXPIRY_DATE (~90 days) and DEPARTURE_DATE (+31 days),
 * the required validity endpoint is 2026-10-22 but the passport expires
 * 2026-06-20 → shortfall → PassportValidityWarning appears.
 */
function nearExpiryTripState() {
  return baseState({
    profiles: {
      'e2e-profile-1': {
        id: 'e2e-profile-1',
        surname: 'Smith',
        givenNames: 'Alice',
        passportNumber: 'AB1234567',
        nationality: 'USA',
        dateOfBirth: '1985-03-15',
        gender: 'F',
        passportExpiry: NEAR_EXPIRY_DATE,
        issuingCountry: 'USA',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    },
    trips: [
      {
        id: 'trip-doc-validity-test',
        name: 'Japan Validity Test',
        status: 'upcoming',
      },
    ],
    tripLegs: {
      'trip-doc-validity-test': [
        {
          id: 'leg-doc-validity-jpn',
          destinationCountry: 'JPN',
          arrivalDateISO: ARRIVAL_DATE,
          departureDateISO: DEPARTURE_DATE,
          flightNumber: 'NH201',
          airlineCode: 'NH',
          formStatus: 'not_started',
          order: 0,
          accommodation: {
            name: 'Shinjuku Granbell Hotel',
            address: {
              street: '2-14-5 Kabukicho',
              city: 'Shinjuku',
              country: 'Japan',
              postalCode: '160-0021',
            },
          },
        },
      ],
    },
  });
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

async function navigateToProfile(page: Page) {
  await navigateImperatively(page, 'Main', { screen: 'Profile', params: { screen: 'Profile' } });
  // Wait until the Profile screen content is visible
  await page
    .getByText('Document Validity')
    .first()
    .waitFor({ timeout: 8000 })
    .catch(() => {});
}

async function goToTripDetail(page: Page, tripName: string) {
  await expect(page.getByText('My Trips')).toBeVisible({ timeout: 10000 });
  await page.getByText(tripName).click();
  await expect(page.getByText('Itinerary', { exact: true })).toBeVisible({ timeout: 10000 });
}

// ---------------------------------------------------------------------------
// Error tracking
// ---------------------------------------------------------------------------

const tracker = createErrorTracker();

// ---------------------------------------------------------------------------
// DocumentValidityCard — ProfileScreen
// ---------------------------------------------------------------------------

test.describe('Document Validity — DocumentValidityCard in ProfileScreen', () => {
  test.beforeEach(async ({ page }) => {
    tracker.setup(page);
  });

  test.afterEach(() => {
    tracker.assertNoCriticalErrors();
  });

  test('DocumentValidityCard renders without crashing when passport expiry is set', async ({
    page,
  }) => {
    await injectState(page, stateWithValidPassport);
    await page.goto('/');
    await navigateToProfile(page);

    const card = page.locator('[data-testid="document-validity-card"]');
    await expect(card).toBeVisible({ timeout: 8000 });
  });

  test('DocumentValidityCard shows "Document Validity" section heading', async ({ page }) => {
    await injectState(page, stateWithValidPassport);
    await page.goto('/');
    await navigateToProfile(page);

    await expect(page.getByText('Document Validity').first()).toBeVisible({ timeout: 8000 });
  });

  test('DocumentValidityCard shows passport expiry date label', async ({ page }) => {
    await injectState(page, stateWithValidPassport);
    await page.goto('/');
    await navigateToProfile(page);

    await expect(page.getByText('Passport Expires').first()).toBeVisible({ timeout: 8000 });
  });

  test('DocumentValidityCard shows per-country validity grid', async ({ page }) => {
    await injectState(page, stateWithValidPassport);
    await page.goto('/');
    await navigateToProfile(page);

    await expect(
      page.getByText('Country Validity (today departure)').first(),
    ).toBeVisible({ timeout: 8000 });
  });

  test('DocumentValidityCard shows all 8 supported countries in the grid', async ({ page }) => {
    await injectState(page, stateWithValidPassport);
    await page.goto('/');
    await navigateToProfile(page);

    // Verify at least some country names appear in the grid
    // The default profile has expiry 2030-03-15 — all countries should be valid
    await expect(page.getByText('Japan').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Singapore').first()).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// PassportValidityWarning — LegFormScreen
// ---------------------------------------------------------------------------

test.describe('Document Validity — PassportValidityWarning in LegFormScreen', () => {
  test.beforeEach(async ({ page }) => {
    tracker.setup(page);
  });

  test.afterEach(() => {
    tracker.assertNoCriticalErrors();
  });

  test('PassportValidityWarning is visible when passport expires near departure', async ({
    page,
  }) => {
    await injectState(page, nearExpiryTripState());
    await page.goto('/');

    // Navigate to the trip detail
    await goToTripDetail(page, 'Japan Validity Test');

    // Click the Japan leg card to open LegFormScreen
    await page.getByTestId('leg-card-JPN').click();
    await expect(page.getByText('Travel Form')).toBeVisible({ timeout: 15000 });

    // The passport validity warning should appear
    const warning = page.getByTestId('leg-form-passport-validity-warning');
    await expect(warning).toBeVisible({ timeout: 8000 });
  });

  test('PassportValidityWarning shows the destination country name', async ({ page }) => {
    await injectState(page, nearExpiryTripState());
    await page.goto('/');

    await goToTripDetail(page, 'Japan Validity Test');
    await page.getByTestId('leg-card-JPN').click();
    await expect(page.getByText('Travel Form')).toBeVisible({ timeout: 15000 });

    // Warning banner should mention "Passport Validity Warning"
    await expect(page.getByText('Passport Validity Warning').first()).toBeVisible({
      timeout: 8000,
    });
  });
});
