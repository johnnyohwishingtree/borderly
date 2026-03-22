/**
 * E2E smoke tests for Submission Status Tracking (Story #694).
 *
 * Verifies that key submission-tracking UI elements render correctly
 * without crashing across common trip scenarios.
 *
 * These are smoke tests — they confirm elements appear, not full interaction flows.
 */

import { test, expect } from '@playwright/test';
import { baseState, injectState } from '../helpers/fixtures';

// ---------------------------------------------------------------------------
// State factories
// ---------------------------------------------------------------------------

function tripWithNotStartedLeg() {
  const tripId = 'submission-tracking-test-1';
  return baseState({
    trips: [{ id: tripId, name: 'Submission Tracking Trip', status: 'upcoming' }],
    tripLegs: {
      [tripId]: [
        {
          id: 'leg-tracking-jpn',
          destinationCountry: 'JPN',
          arrivalDateISO: '2027-09-01',
          departureDateISO: '2027-09-10',
          flightNumber: 'NH201',
          airlineCode: 'NH',
          formStatus: 'ready',
          submissionStatus: 'not_started',
          order: 0,
          accommodation: {
            name: 'Park Hyatt Tokyo',
            address: {
              street: '3-7-1-2 Nishi-Shinjuku',
              city: 'Tokyo',
              country: 'Japan',
              postalCode: '163-1055',
            },
          },
        },
      ],
    },
  });
}

function tripWithSubmittedLeg() {
  const tripId = 'submission-tracking-test-2';
  return baseState({
    trips: [{ id: tripId, name: 'Already Submitted Trip', status: 'active' }],
    tripLegs: {
      [tripId]: [
        {
          id: 'leg-submitted-sgp',
          destinationCountry: 'SGP',
          arrivalDateISO: '2027-09-11',
          departureDateISO: '2027-09-18',
          flightNumber: 'SQ302',
          airlineCode: 'SQ',
          formStatus: 'submitted',
          submissionStatus: 'submitted',
          order: 0,
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

function tripWithMultipleLegs() {
  const tripId = 'submission-tracking-test-3';
  return baseState({
    trips: [{ id: tripId, name: 'Multi-Leg Submission Trip', status: 'upcoming' }],
    tripLegs: {
      [tripId]: [
        {
          id: 'leg-multi-jpn',
          destinationCountry: 'JPN',
          arrivalDateISO: '2027-10-01',
          departureDateISO: '2027-10-07',
          flightNumber: 'NH101',
          airlineCode: 'NH',
          formStatus: 'ready',
          submissionStatus: 'not_started',
          order: 0,
          accommodation: {
            name: 'Shinjuku Hotel',
            address: {
              street: '1-1 Shinjuku',
              city: 'Tokyo',
              country: 'Japan',
              postalCode: '160-0022',
            },
          },
        },
        {
          id: 'leg-multi-sgp',
          destinationCountry: 'SGP',
          arrivalDateISO: '2027-10-08',
          departureDateISO: '2027-10-14',
          flightNumber: 'SQ616',
          airlineCode: 'SQ',
          formStatus: 'in_progress',
          submissionStatus: 'not_started',
          order: 1,
          accommodation: {
            name: 'Singapore Hotel',
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
// Navigation helper
// ---------------------------------------------------------------------------

async function goToTripDetail(page: any, tripName: string) {
  await page.goto('/');
  await expect(page.getByText('My Trips')).toBeVisible({ timeout: 10000 });
  await page.getByText(tripName).click();
  await expect(
    page.getByText('Itinerary', { exact: true }),
  ).toBeVisible({ timeout: 10000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Submission Tracking — key screens render without crashing', () => {
  test('TripDetailScreen renders with submission progress summary', async ({ page }) => {
    await injectState(page, tripWithNotStartedLeg());
    await goToTripDetail(page, 'Submission Tracking Trip');

    // Submission progress summary section must be visible
    await expect(
      page.getByTestId('submission-progress-summary'),
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Submitted to portals')).toBeVisible({ timeout: 5000 });
  });

  test('SubmissionStatusBadge renders on leg card (not_started state)', async ({ page }) => {
    await injectState(page, tripWithNotStartedLeg());
    await goToTripDetail(page, 'Submission Tracking Trip');

    // The submission status badge for the JPN leg should be visible
    await expect(
      page.getByTestId('submission-status-badge-JPN'),
    ).toBeVisible({ timeout: 5000 });
  });

  test('"Mark as Submitted" button is visible for a non-submitted leg', async ({ page }) => {
    await injectState(page, tripWithNotStartedLeg());
    await goToTripDetail(page, 'Submission Tracking Trip');

    // Button should be present since the leg is not yet submitted
    await expect(
      page.getByTestId('mark-submitted-JPN'),
    ).toBeVisible({ timeout: 5000 });
  });

  test('SubmissionStatusBadge shows submitted state and no "Mark" button for submitted leg', async ({ page }) => {
    await injectState(page, tripWithSubmittedLeg());
    await goToTripDetail(page, 'Already Submitted Trip');

    // Badge should still render
    await expect(
      page.getByTestId('submission-status-badge-SGP'),
    ).toBeVisible({ timeout: 5000 });

    // "Mark as Submitted" button should NOT be visible
    await expect(
      page.getByTestId('mark-submitted-SGP'),
    ).not.toBeVisible();
  });

  test('submission progress summary shows 0/1 for a fresh single-leg trip', async ({ page }) => {
    await injectState(page, tripWithNotStartedLeg());
    await goToTripDetail(page, 'Submission Tracking Trip');

    // "0/1" fraction must appear in the summary
    await expect(
      page.getByTestId('submission-progress-summary').getByText('0/1'),
    ).toBeVisible({ timeout: 5000 });
  });

  test('submission progress summary shows 1/1 when leg is already submitted', async ({ page }) => {
    await injectState(page, tripWithSubmittedLeg());
    await goToTripDetail(page, 'Already Submitted Trip');

    // "1/1" fraction must appear in the summary
    await expect(
      page.getByTestId('submission-progress-summary').getByText('1/1'),
    ).toBeVisible({ timeout: 5000 });
  });

  test('multiple leg cards each have a SubmissionStatusBadge', async ({ page }) => {
    await injectState(page, tripWithMultipleLegs());
    await goToTripDetail(page, 'Multi-Leg Submission Trip');

    await expect(
      page.getByTestId('submission-status-badge-JPN'),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByTestId('submission-status-badge-SGP'),
    ).toBeVisible({ timeout: 5000 });
  });

  test('multiple leg cards each have "Mark as Submitted" when none are submitted', async ({ page }) => {
    await injectState(page, tripWithMultipleLegs());
    await goToTripDetail(page, 'Multi-Leg Submission Trip');

    await expect(
      page.getByTestId('mark-submitted-JPN'),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByTestId('mark-submitted-SGP'),
    ).toBeVisible({ timeout: 5000 });
  });

  test('submission progress summary shows 0/2 for a two-leg trip with none submitted', async ({ page }) => {
    await injectState(page, tripWithMultipleLegs());
    await goToTripDetail(page, 'Multi-Leg Submission Trip');

    await expect(
      page.getByTestId('submission-progress-summary').getByText('0/2'),
    ).toBeVisible({ timeout: 5000 });
  });
});
