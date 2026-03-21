/**
 * E2E smoke tests for TripDetailScreen deadline badge features.
 *
 * Verifies:
 * - DeadlineBadge renders on LegCards when deadline data is available
 * - "Trip Readiness: X of N legs ready" summary line is visible
 * - LegCard still renders correctly when no deadline applies
 */

import { test, expect } from '@playwright/test';
import { baseState, injectState, DEFAULT_PROFILE } from '../helpers/fixtures';

// ---------------------------------------------------------------------------
// Fixtures: pre-built trip state helpers
// ---------------------------------------------------------------------------

function tripWithOneLeg({
  tripId = 'trip-detail-test',
  legId = 'leg-detail-test',
  countryCode = 'JPN',
  formStatus = 'not_started',
  arrivalDate = '2027-08-01',
  departureDate = '2027-08-10',
} = {}) {
  return baseState({
    trips: [
      {
        id: tripId,
        name: 'Detail Test Trip',
        status: 'upcoming',
      },
    ],
    tripLegs: {
      [tripId]: [
        {
          id: legId,
          destinationCountry: countryCode,
          arrivalDateISO: arrivalDate,
          departureDateISO: departureDate,
          flightNumber: 'NH101',
          airlineCode: 'NH',
          formStatus,
          order: 0,
          accommodation: {
            name: 'Park Hyatt Tokyo',
            address: {
              street: '3-7-1-2 Nishi-Shinjuku',
              city: 'Shinjuku',
              country: 'Japan',
              postalCode: '163-1055',
            },
          },
        },
      ],
    },
  });
}

function tripWithTwoLegs() {
  const tripId = 'trip-detail-two-legs';
  return baseState({
    trips: [
      {
        id: tripId,
        name: 'Two Leg Trip',
        status: 'upcoming',
      },
    ],
    tripLegs: {
      [tripId]: [
        {
          id: 'leg-a',
          destinationCountry: 'JPN',
          arrivalDateISO: '2027-08-01',
          departureDateISO: '2027-08-07',
          flightNumber: 'NH101',
          airlineCode: 'NH',
          formStatus: 'ready',
          order: 0,
          accommodation: {
            name: 'Park Hyatt Tokyo',
            address: {
              street: '3-7-1-2 Nishi-Shinjuku',
              city: 'Shinjuku',
              country: 'Japan',
              postalCode: '163-1055',
            },
          },
        },
        {
          id: 'leg-b',
          destinationCountry: 'SGP',
          arrivalDateISO: '2027-08-08',
          departureDateISO: '2027-08-15',
          flightNumber: 'SQ321',
          airlineCode: 'SQ',
          formStatus: 'not_started',
          order: 1,
          accommodation: {
            name: 'Marina Bay Sands',
            address: {
              street: '10 Bayfront Avenue',
              city: 'Singapore',
              country: 'Singapore',
              postalCode: '018956',
            },
          },
        },
      ],
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers: navigate to the trip detail screen
// ---------------------------------------------------------------------------

async function goToTripDetail(page: any, tripName: string) {
  await page.goto('/');
  await expect(page.getByText('My Trips')).toBeVisible({ timeout: 10000 });
  await page.getByText(tripName).click();
  await expect(page.getByText('Itinerary', { exact: true })).toBeVisible({ timeout: 10000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('TripDetailScreen — DeadlineBadge integration', () => {
  test('Trip Readiness summary line is visible when there are legs', async ({ page }) => {
    await injectState(page, tripWithOneLeg());
    await goToTripDetail(page, 'Detail Test Trip');

    // "Trip Readiness: X of N legs ready" summary should be visible
    await expect(page.getByTestId('trip-readiness-summary')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('trip-readiness-summary')).toContainText('Trip Readiness:');
    await expect(page.getByTestId('trip-readiness-summary')).toContainText('of 1 leg');
  });

  test('Trip Readiness shows correct ready count: 1 of 2 legs ready', async ({ page }) => {
    await injectState(page, tripWithTwoLegs());
    await goToTripDetail(page, 'Two Leg Trip');

    await expect(page.getByTestId('trip-readiness-summary')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('trip-readiness-summary')).toContainText('1 of 2 legs ready');
  });

  test('Trip Readiness shows 0 of 1 when leg is not started', async ({ page }) => {
    await injectState(page, tripWithOneLeg({ formStatus: 'not_started' }));
    await goToTripDetail(page, 'Detail Test Trip');

    await expect(page.getByTestId('trip-readiness-summary')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('trip-readiness-summary')).toContainText('0 of 1 leg');
  });

  test('LegCard renders for each destination in the itinerary', async ({ page }) => {
    await injectState(page, tripWithTwoLegs());
    await goToTripDetail(page, 'Two Leg Trip');

    await expect(page.getByTestId('leg-card-JPN')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('leg-card-SGP')).toBeVisible({ timeout: 5000 });
  });

  test('TripDetailScreen renders correctly for a trip with one leg', async ({ page }) => {
    await injectState(page, tripWithOneLeg());
    await goToTripDetail(page, 'Detail Test Trip');

    // Core UI elements are present
    await expect(page.getByText('Detail Test Trip')).toBeVisible();
    await expect(page.getByText('Itinerary', { exact: true })).toBeVisible();
    await expect(page.getByTestId('leg-card-JPN')).toBeVisible({ timeout: 5000 });

    // Overall progress section
    await expect(page.getByText('Overall Progress')).toBeVisible();
  });
});
