/**
 * E2E smoke tests for the deadline reminders feature.
 *
 * Verifies:
 * - A trip with a future departure date shows a DeadlineBadge for each leg in TripDetailScreen
 * - The "Trip Readiness: X of N legs ready" summary line is present
 * - DeadlineBadge shows "Ready" when leg formStatus is ready
 * - DeadlineBadge shows "Not Started" when leg formStatus is not_started
 */

import { test, expect } from '@playwright/test';
import { baseState, injectState } from '../helpers/fixtures';

// ---------------------------------------------------------------------------
// Fixtures: pre-built trip state helpers
// ---------------------------------------------------------------------------

const FUTURE_ARRIVAL = '2027-09-01';
const FUTURE_DEPARTURE = '2027-09-10';

function deadlineReminderTrip({
  tripId = 'trip-dr-test',
  legId = 'leg-dr-test',
  countryCode = 'JPN',
  formStatus = 'not_started' as 'not_started' | 'in_progress' | 'ready' | 'submitted',
} = {}) {
  return baseState({
    trips: [
      {
        id: tripId,
        name: 'Deadline Reminder Trip',
        status: 'upcoming',
      },
    ],
    tripLegs: {
      [tripId]: [
        {
          id: legId,
          destinationCountry: countryCode,
          arrivalDateISO: FUTURE_ARRIVAL,
          departureDateISO: FUTURE_DEPARTURE,
          flightNumber: 'NH201',
          airlineCode: 'NH',
          formStatus,
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

function deadlineReminderTwoLegTrip() {
  const tripId = 'trip-dr-two-legs';
  return baseState({
    trips: [
      {
        id: tripId,
        name: 'Two Leg Deadline Trip',
        status: 'upcoming',
      },
    ],
    tripLegs: {
      [tripId]: [
        {
          id: 'leg-dr-jpn',
          destinationCountry: 'JPN',
          arrivalDateISO: FUTURE_ARRIVAL,
          departureDateISO: FUTURE_DEPARTURE,
          flightNumber: 'NH201',
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
          id: 'leg-dr-sgp',
          destinationCountry: 'SGP',
          arrivalDateISO: '2027-09-12',
          departureDateISO: '2027-09-20',
          flightNumber: 'SQ421',
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
// Helper: navigate to the trip detail screen
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

test.describe('Deadline Reminders — TripDetailScreen', () => {
  test('Trip Readiness summary is visible for a trip with a future departure', async ({ page }) => {
    await injectState(page, deadlineReminderTrip());
    await goToTripDetail(page, 'Deadline Reminder Trip');

    await expect(page.getByTestId('trip-readiness-summary')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('trip-readiness-summary')).toContainText('Trip Readiness:');
    await expect(page.getByTestId('trip-readiness-summary')).toContainText('of 1 leg');
  });

  test('DeadlineBadge is visible for a leg with a future departure date', async ({ page }) => {
    await injectState(page, deadlineReminderTrip({ formStatus: 'not_started' }));
    await goToTripDetail(page, 'Deadline Reminder Trip');

    // Wait for async deadline computation to complete and badge to render
    await expect(page.getByTestId('deadline-badge-leg-dr-test')).toBeVisible({ timeout: 8000 });
  });

  test('DeadlineBadge shows "Not Started" when leg is not yet started', async ({ page }) => {
    await injectState(page, deadlineReminderTrip({ formStatus: 'not_started' }));
    await goToTripDetail(page, 'Deadline Reminder Trip');

    await expect(page.getByTestId('deadline-badge-leg-dr-test')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('deadline-badge-leg-dr-test')).toContainText('Not Started');
  });

  test('DeadlineBadge shows "Ready" when leg formStatus is ready', async ({ page }) => {
    await injectState(page, deadlineReminderTrip({ formStatus: 'ready' }));
    await goToTripDetail(page, 'Deadline Reminder Trip');

    await expect(page.getByTestId('deadline-badge-leg-dr-test')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('deadline-badge-leg-dr-test')).toContainText('Ready');
  });

  test('DeadlineBadge is visible for each leg in a multi-leg trip', async ({ page }) => {
    await injectState(page, deadlineReminderTwoLegTrip());
    await goToTripDetail(page, 'Two Leg Deadline Trip');

    // Both leg cards should be visible
    await expect(page.getByTestId('leg-card-JPN')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('leg-card-SGP')).toBeVisible({ timeout: 5000 });

    // Each leg should have a deadline badge
    await expect(page.getByTestId('deadline-badge-leg-dr-jpn')).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('deadline-badge-leg-dr-sgp')).toBeVisible({ timeout: 8000 });
  });

  test('Trip Readiness summary shows correct ready count for multi-leg trip', async ({ page }) => {
    await injectState(page, deadlineReminderTwoLegTrip());
    await goToTripDetail(page, 'Two Leg Deadline Trip');

    await expect(page.getByTestId('trip-readiness-summary')).toBeVisible({ timeout: 5000 });
    // 1 ready leg out of 2 total
    await expect(page.getByTestId('trip-readiness-summary')).toContainText('1 of 2 legs ready');
  });

  test('LegCard renders for the JPN destination in a deadline reminder trip', async ({ page }) => {
    await injectState(page, deadlineReminderTrip());
    await goToTripDetail(page, 'Deadline Reminder Trip');

    await expect(page.getByTestId('leg-card-JPN')).toBeVisible({ timeout: 5000 });
  });
});
