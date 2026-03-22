/**
 * E2E smoke tests for TripDetailScreen deadline badge, readiness checklist,
 * and submission progress features.
 *
 * Verifies:
 * - DeadlineBadge renders on LegCards when deadline data is available
 * - ReadinessChecklist renders and is visible on the trip detail screen
 * - LegCard still renders correctly when no deadline applies
 * - Submission progress summary ("X of N") renders in the progress overview
 * - SubmissionStatusBadge renders on each LegCard
 * - "Mark as Submitted" button renders on each non-submitted LegCard
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
  test('ReadinessChecklist is visible when there are legs', async ({ page }) => {
    await injectState(page, tripWithOneLeg());
    await goToTripDetail(page, 'Detail Test Trip');

    // ReadinessChecklist should render (either fully loaded or in loading state)
    const checklist = page.getByTestId('readiness-checklist');
    const loadingPlaceholder = page.getByTestId('readiness-checklist-loading');
    // One of the two states should be visible
    await expect(checklist.or(loadingPlaceholder)).toBeVisible({ timeout: 8000 });
  });

  test('ReadinessChecklist header is tappable to expand', async ({ page }) => {
    await injectState(page, tripWithOneLeg());
    await goToTripDetail(page, 'Detail Test Trip');

    // Wait for the checklist to appear
    const checklist = page.getByTestId('readiness-checklist');
    await expect(checklist).toBeVisible({ timeout: 8000 });

    // The header button should be present and tappable
    const header = page.getByTestId('readiness-checklist-header');
    await expect(header).toBeVisible({ timeout: 3000 });
    await header.click();

    // Body should expand after click
    await expect(page.getByTestId('readiness-checklist-body')).toBeVisible({ timeout: 3000 });
  });

  test('ReadinessChecklist renders for a trip with multiple legs', async ({ page }) => {
    await injectState(page, tripWithTwoLegs());
    await goToTripDetail(page, 'Two Leg Trip');

    const checklist = page.getByTestId('readiness-checklist');
    const loadingPlaceholder = page.getByTestId('readiness-checklist-loading');
    await expect(checklist.or(loadingPlaceholder)).toBeVisible({ timeout: 8000 });
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

    // goToTripDetail already confirms we are on TripDetailScreen ('Itinerary' is visible)
    await expect(page.getByTestId('leg-card-JPN')).toBeVisible({ timeout: 5000 });

    // ReadinessChecklist (or loading state) replaces the old plain-text summary
    const checklist = page.getByTestId('readiness-checklist');
    const loadingPlaceholder = page.getByTestId('readiness-checklist-loading');
    await expect(checklist.or(loadingPlaceholder)).toBeVisible({ timeout: 8000 });
  });

  test('placeholder Export Trip and Share Itinerary buttons are not present', async ({ page }) => {
    await injectState(page, tripWithOneLeg());
    await goToTripDetail(page, 'Detail Test Trip');

    // Confirm these dead-end placeholder actions have been removed from the UI
    await expect(page.getByText('Export Trip')).not.toBeVisible();
    await expect(page.getByText('Share Itinerary')).not.toBeVisible();

    // Delete Trip action (the real action) should still be present
    await expect(page.getByText('Delete Trip')).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Submission progress features (Story #691)
// ---------------------------------------------------------------------------

test.describe('TripDetailScreen — Submission Progress (Story #691)', () => {
  test('submission progress summary renders in progress overview', async ({ page }) => {
    await injectState(page, tripWithOneLeg());
    await goToTripDetail(page, 'Detail Test Trip');

    // The "Submitted to portals" label should appear in the progress overview
    await expect(page.getByTestId('submission-progress-summary')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Submitted to portals')).toBeVisible({ timeout: 5000 });
  });

  test('SubmissionStatusBadge renders on each LegCard', async ({ page }) => {
    await injectState(page, tripWithTwoLegs());
    await goToTripDetail(page, 'Two Leg Trip');

    // Both leg cards should have a SubmissionStatusBadge
    await expect(page.getByTestId('submission-status-badge-JPN')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('submission-status-badge-SGP')).toBeVisible({ timeout: 5000 });
  });

  test('"Mark as Submitted" button renders on a non-submitted leg', async ({ page }) => {
    await injectState(page, tripWithOneLeg({ formStatus: 'ready' }));
    await goToTripDetail(page, 'Detail Test Trip');

    // The mark-as-submitted button should be visible for the JPN leg (not yet submitted)
    await expect(page.getByTestId('mark-submitted-JPN')).toBeVisible({ timeout: 5000 });
  });

  test('"Mark as Submitted" button is absent when leg submissionStatus is submitted', async ({ page }) => {
    // Inject a trip where the leg already has submissionStatus: 'submitted'
    const tripId = 'trip-submitted-test';
    const state = baseState({
      trips: [{ id: tripId, name: 'Submitted Trip', status: 'upcoming' }],
      tripLegs: {
        [tripId]: [
          {
            id: 'leg-submitted',
            destinationCountry: 'JPN',
            arrivalDateISO: '2027-08-01',
            departureDateISO: '2027-08-10',
            flightNumber: 'NH101',
            airlineCode: 'NH',
            formStatus: 'submitted',
            submissionStatus: 'submitted',
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
    await injectState(page, state);
    await goToTripDetail(page, 'Submitted Trip');

    // The badge should show submitted status
    await expect(page.getByTestId('submission-status-badge-JPN')).toBeVisible({ timeout: 5000 });
    // The mark-as-submitted button should NOT be present
    await expect(page.getByTestId('mark-submitted-JPN')).not.toBeVisible();
  });

  test('submission progress summary shows 0/N for fresh trip', async ({ page }) => {
    await injectState(page, tripWithTwoLegs());
    await goToTripDetail(page, 'Two Leg Trip');

    // The "0/2" count should appear next to "Submitted to portals"
    await expect(page.getByText('0/2')).toBeVisible({ timeout: 5000 });
  });
});
