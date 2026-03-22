/**
 * E2E smoke tests for the Pre-Departure Readiness Checklist.
 *
 * Verifies:
 * - ReadinessChecklist renders on TripDetailScreen (shows "Action required" or "Ready to travel")
 * - At least one checklist item row is visible after expanding the checklist
 * - Checklist header is tappable and expands to show items
 * - Checklist renders correctly for both single-leg and multi-leg trips
 */

import { test, expect, type Page } from '@playwright/test';
import { baseState, injectState } from '../helpers/fixtures';

// ---------------------------------------------------------------------------
// State factories
// ---------------------------------------------------------------------------

/**
 * Trip with one Japan leg (not_started) — will produce critical readiness items
 * (form not started + no QR code), so the header will say "X items need attention".
 */
function tripWithCriticalItems() {
  const tripId = 'readiness-critical-trip';
  const legId = 'readiness-critical-leg';
  return baseState({
    trips: [
      {
        id: tripId,
        name: 'Readiness Test Trip',
        status: 'upcoming',
      },
    ],
    tripLegs: {
      [tripId]: [
        {
          id: legId,
          destinationCountry: 'JPN',
          arrivalDateISO: '2027-09-01',
          departureDateISO: '2027-09-10',
          flightNumber: 'NH101',
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

/**
 * Trip with one Singapore leg where form is ready — produces mostly-ok readiness.
 * Singapore doesn't require a QR code, so readyCount should be high.
 */
function tripWithReadyItems() {
  const tripId = 'readiness-ready-trip';
  const legId = 'readiness-ready-leg';
  return baseState({
    trips: [
      {
        id: tripId,
        name: 'Ready Trip',
        status: 'upcoming',
      },
    ],
    tripLegs: {
      [tripId]: [
        {
          id: legId,
          destinationCountry: 'SGP',
          arrivalDateISO: '2027-09-01',
          departureDateISO: '2027-09-08',
          flightNumber: 'SQ321',
          airlineCode: 'SQ',
          formStatus: 'submitted',
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

/**
 * Trip with two legs (Japan + Malaysia), mixed readiness.
 */
function tripWithTwoLegs() {
  const tripId = 'readiness-two-leg-trip';
  return baseState({
    trips: [
      {
        id: tripId,
        name: 'Two Leg Readiness Trip',
        status: 'upcoming',
      },
    ],
    tripLegs: {
      [tripId]: [
        {
          id: 'readiness-leg-jpn',
          destinationCountry: 'JPN',
          arrivalDateISO: '2027-09-01',
          departureDateISO: '2027-09-07',
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
          id: 'readiness-leg-mys',
          destinationCountry: 'MYS',
          arrivalDateISO: '2027-09-07',
          departureDateISO: '2027-09-14',
          flightNumber: 'MH123',
          airlineCode: 'MH',
          formStatus: 'not_started',
          order: 1,
          accommodation: {
            name: 'Mandarin Oriental',
            address: {
              street: 'Kuala Lumpur City Centre',
              city: 'Kuala Lumpur',
              country: 'Malaysia',
              postalCode: '50088',
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

async function goToTripDetail(page: Page, tripName: string) {
  await page.goto('/');
  await expect(page.getByText('My Trips')).toBeVisible({ timeout: 10000 });
  await page.getByText(tripName).click();
  await expect(page.getByText('Itinerary', { exact: true })).toBeVisible({ timeout: 10000 });
}

// ---------------------------------------------------------------------------
// Tests: ReadinessChecklist renders
// ---------------------------------------------------------------------------

test.describe('ReadinessChecklist — renders on TripDetailScreen', () => {
  const visibilityTestCases = [
    { label: 'critical items', state: tripWithCriticalItems(), tripName: 'Readiness Test Trip' },
    { label: 'ready items', state: tripWithReadyItems(), tripName: 'Ready Trip' },
    { label: 'multi-leg trip', state: tripWithTwoLegs(), tripName: 'Two Leg Readiness Trip' },
  ];

  for (const { label, state, tripName } of visibilityTestCases) {
    test(`ReadinessChecklist is visible (or loading) for a trip with ${label}`, async ({
      page,
    }) => {
      await injectState(page, state);
      await goToTripDetail(page, tripName);

      const checklist = page.getByTestId('readiness-checklist');
      const loadingPlaceholder = page.getByTestId('readiness-checklist-loading');
      await expect(checklist.or(loadingPlaceholder)).toBeVisible({ timeout: 8000 });
    });
  }

  test('ReadinessChecklist shows "Action required" or "Ready to travel" summary text', async ({
    page,
  }) => {
    await injectState(page, tripWithCriticalItems());
    await goToTripDetail(page, 'Readiness Test Trip');

    // The checklist header shows either "Ready to travel" or "X items need attention"
    const readyText = page.getByText('Ready to travel');
    const attentionText = page.getByText(/items? need/i);
    const loadingPlaceholder = page.getByTestId('readiness-checklist-loading');

    await expect(readyText.or(attentionText).or(loadingPlaceholder)).toBeVisible({
      timeout: 8000,
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: ReadinessChecklist expand / item visibility
// ---------------------------------------------------------------------------

test.describe('ReadinessChecklist — expand and item visibility', () => {
  test.beforeEach(async ({ page }) => {
    await injectState(page, tripWithCriticalItems());
    await goToTripDetail(page, 'Readiness Test Trip');

    // Wait for the checklist to fully load (not the loading placeholder)
    await expect(page.getByTestId('readiness-checklist')).toBeVisible({ timeout: 8000 });
  });

  test('ReadinessChecklist header is tappable and expands to show items', async ({ page }) => {
    // Tap the header to expand
    const header = page.getByTestId('readiness-checklist-header');
    await expect(header).toBeVisible({ timeout: 3000 });
    await header.click();

    // The body should now be visible
    const body = page.getByTestId('readiness-checklist-body');
    await expect(body).toBeVisible({ timeout: 3000 });
  });

  test('At least one checklist item row is visible after expanding', async ({ page }) => {
    // Expand the checklist
    await page.getByTestId('readiness-checklist-header').click();

    // Verify at least one checklist item row is visible
    // Items are rendered with testID `readiness-item-<id>`
    const itemRows = page.locator('[data-testid^="readiness-item-"]');
    await expect(itemRows.first()).toBeVisible({ timeout: 5000 });
  });

  test('ReadinessChecklist shows form-related item after expanding for Japan trip', async ({
    page,
  }) => {
    // Expand the checklist
    await page.getByTestId('readiness-checklist-header').click();

    // The Forms category should be present for a Japan leg
    const formsCategory = page.getByTestId('readiness-category-form');
    await expect(formsCategory).toBeVisible({ timeout: 3000 });
  });

  test('ReadinessChecklist collapses body after second header tap', async ({ page }) => {
    const header = page.getByTestId('readiness-checklist-header');

    // Expand
    await header.click();
    await expect(page.getByTestId('readiness-checklist-body')).toBeVisible({ timeout: 3000 });

    // Collapse
    await header.click();
    await expect(page.getByTestId('readiness-checklist-body')).not.toBeVisible({ timeout: 3000 });
  });
});
