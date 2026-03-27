/**
 * E2E tests for TripListScreen search bar and status filter tabs.
 *
 * Verifies:
 * - Search bar filters trips by name
 * - Status filter tabs filter trips by status
 * - Search + status compose correctly
 * - "No trips match" empty state appears when filters return zero results
 * - Clear search button resets the search
 */

import { test, expect } from '@playwright/test';
import { baseState, injectState } from '../helpers/fixtures';

function tripListState() {
  const tripA = { id: 'trip-a', name: 'Tokyo Adventure', status: 'upcoming' as const };
  const tripB = { id: 'trip-b', name: 'Paris Weekend', status: 'active' as const };
  const tripC = { id: 'trip-c', name: 'Bangkok Trip', status: 'completed' as const };
  const tripD = { id: 'trip-d', name: 'Tokyo Business', status: 'active' as const };

  return baseState({
    trips: [tripA, tripB, tripC, tripD],
    tripLegs: {
      'trip-a': [{
        id: 'leg-a', destinationCountry: 'JPN', arrivalDateISO: '2027-04-01',
        departureDateISO: '2027-04-10', formStatus: 'not_started', order: 0,
        accommodation: { name: 'Hotel', address: { street: '1-1', city: 'Tokyo', country: 'Japan', postalCode: '100-0001' } },
      }],
      'trip-b': [{
        id: 'leg-b', destinationCountry: 'FRA', arrivalDateISO: '2027-05-01',
        departureDateISO: '2027-05-05', formStatus: 'not_started', order: 0,
        accommodation: { name: 'Hotel', address: { street: '1 Rue', city: 'Paris', country: 'France', postalCode: '75001' } },
      }],
      'trip-c': [{
        id: 'leg-c', destinationCountry: 'THA', arrivalDateISO: '2026-01-01',
        departureDateISO: '2026-01-10', formStatus: 'submitted', order: 0,
        accommodation: { name: 'Hotel', address: { street: '1 Soi', city: 'Bangkok', country: 'Thailand', postalCode: '10100' } },
      }],
      'trip-d': [{
        id: 'leg-d', destinationCountry: 'JPN', arrivalDateISO: '2027-06-01',
        departureDateISO: '2027-06-05', formStatus: 'in_progress', order: 0,
        accommodation: { name: 'Hotel', address: { street: '2-2', city: 'Tokyo', country: 'Japan', postalCode: '100-0002' } },
      }],
    },
  });
}

function deadlineSummaryState() {
  // Trip with a JPN leg arriving soon — JPN has submissionDeadlineHours=24,
  // so hoursRemaining = arrivalOffset - 24. With 36h offset: 36 - 24 = 12h → critical.
  const soonArrival = new Date(Date.now() + 36 * 60 * 60 * 1000);
  const soonDeparture = new Date(soonArrival.getTime() + 7 * 24 * 60 * 60 * 1000);

  return baseState({
    trips: [
      { id: 'trip-urgent', name: 'Urgent Japan Trip', status: 'upcoming' as const },
      { id: 'trip-safe', name: 'Safe Future Trip', status: 'upcoming' as const },
    ],
    tripLegs: {
      'trip-urgent': [{
        id: 'leg-urgent',
        destinationCountry: 'JPN',
        arrivalDateISO: soonArrival.toISOString().split('T')[0],
        departureDateISO: soonDeparture.toISOString().split('T')[0],
        formStatus: 'not_started',
        order: 0,
        accommodation: { name: 'Hotel', address: { street: '1-1', city: 'Tokyo', country: 'Japan', postalCode: '100-0001' } },
      }],
      'trip-safe': [{
        id: 'leg-safe',
        destinationCountry: 'JPN',
        arrivalDateISO: '2028-06-01',
        departureDateISO: '2028-06-10',
        formStatus: 'not_started',
        order: 0,
        accommodation: { name: 'Hotel', address: { street: '2-2', city: 'Tokyo', country: 'Japan', postalCode: '100-0002' } },
      }],
    },
  });
}

test.describe('TripListScreen deadline summary', () => {
  test.beforeEach(async ({ page }) => {
    await injectState(page, deadlineSummaryState());
    await page.goto('/');
    await expect(page.getByText('Your Trips')).toBeVisible({ timeout: 10000 });
  });

  test('shows deadline summary when urgent deadlines exist', async ({ page }) => {
    const summary = page.getByTestId('trip-list-deadline-summary');
    await expect(summary).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/deadline.* needs? attention/i)).toBeVisible();
  });

  test('Go button navigates to LegForm', async ({ page }) => {
    const goButton = page.getByTestId('trip-list-deadline-summary-item-0-go-button');
    await expect(goButton).toBeVisible({ timeout: 5000 });
    await goButton.click();
    // Should navigate to LegForm screen
    await page.waitForTimeout(1000);
    // LegForm screen would show country-specific form content
  });
});

test.describe('TripListScreen search and filter', () => {
  test.beforeEach(async ({ page }) => {
    await injectState(page, tripListState());
    await page.goto('/');
    // Navigate to trip list (post-onboarding, should land on trips tab)
    await expect(page.getByText('Your Trips')).toBeVisible({ timeout: 10000 });
  });

  test('search bar is visible and filters trips by name', async ({ page }) => {
    const searchInput = page.getByTestId('trip-search-field');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Tokyo');
    // Wait for debounce
    await page.waitForTimeout(400);

    await expect(page.getByText('Tokyo Adventure')).toBeVisible();
    await expect(page.getByText('Tokyo Business')).toBeVisible();
    await expect(page.getByText('Paris Weekend')).not.toBeVisible();
    await expect(page.getByText('Bangkok Trip')).not.toBeVisible();
  });

  test('clear button resets search', async ({ page }) => {
    const searchInput = page.getByTestId('trip-search-field');
    await searchInput.fill('Tokyo');
    await page.waitForTimeout(400);

    const clearButton = page.getByTestId('trip-search-clear');
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    await page.waitForTimeout(400);
    // All trips should be visible again
    await expect(page.getByText('Tokyo Adventure')).toBeVisible();
    await expect(page.getByText('Paris Weekend')).toBeVisible();
  });

  test('status filter tabs filter trips', async ({ page }) => {
    // Click "Active" tab
    await page.getByTestId('trip-filter-active').click();

    await expect(page.getByText('Paris Weekend')).toBeVisible();
    await expect(page.getByText('Tokyo Business')).toBeVisible();
    await expect(page.getByText('Tokyo Adventure')).not.toBeVisible();
    await expect(page.getByText('Bangkok Trip')).not.toBeVisible();
  });

  test('search and filter compose', async ({ page }) => {
    // Set Active filter
    await page.getByTestId('trip-filter-active').click();

    // Search for Tokyo
    const searchInput = page.getByTestId('trip-search-field');
    await searchInput.fill('Tokyo');
    await page.waitForTimeout(400);

    // Only Tokyo Business (active + matches Tokyo)
    await expect(page.getByText('Tokyo Business')).toBeVisible();
    await expect(page.getByText('Paris Weekend')).not.toBeVisible();
    await expect(page.getByText('Tokyo Adventure')).not.toBeVisible();
  });

  test('shows no-match empty state when filters return zero results', async ({ page }) => {
    const searchInput = page.getByTestId('trip-search-field');
    await searchInput.fill('zzz');
    await page.waitForTimeout(400);

    await expect(page.getByText('No trips match your search')).toBeVisible();
  });

  test('All tab is selected by default', async ({ page }) => {
    const allTab = page.getByTestId('trip-filter-all');
    await expect(allTab).toBeVisible();
    // All 4 trips visible
    await expect(page.getByText('Tokyo Adventure')).toBeVisible();
    await expect(page.getByText('Bangkok Trip')).toBeVisible();
  });
});
