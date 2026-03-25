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

test.describe('TripListScreen search and filter', () => {
  test.beforeEach(async ({ page }) => {
    await injectState(page, tripListState());
    await page.goto('/');
    // Navigate to trip list (post-onboarding, should land on trips tab)
    await expect(page.getByText('Your Trips')).toBeVisible({ timeout: 10000 });
  });

  test('search bar is visible and filters trips by name', async ({ page }) => {
    const searchInput = page.getByTestId('trip-search-input');
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
    const searchInput = page.getByTestId('trip-search-input');
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
    const searchInput = page.getByTestId('trip-search-input');
    await searchInput.fill('Tokyo');
    await page.waitForTimeout(400);

    // Only Tokyo Business (active + matches Tokyo)
    await expect(page.getByText('Tokyo Business')).toBeVisible();
    await expect(page.getByText('Paris Weekend')).not.toBeVisible();
    await expect(page.getByText('Tokyo Adventure')).not.toBeVisible();
  });

  test('shows no-match empty state when filters return zero results', async ({ page }) => {
    const searchInput = page.getByTestId('trip-search-input');
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
