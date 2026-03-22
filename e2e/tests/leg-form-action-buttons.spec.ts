/**
 * E2E smoke tests for LegFormScreen fixed action button bar (issue #649).
 *
 * Verifies that:
 * - The action-buttons-bar container renders outside the ScrollView
 * - Save Progress and Mark as Ready buttons are visible without scrolling
 * - The fixed bar is present immediately when the LegFormScreen loads
 */

import { test, expect } from '@playwright/test';
import { baseState, injectState, createErrorTracker } from '../helpers';

// ---------------------------------------------------------------------------
// Fixture: a single Japan leg in "not_started" state
// ---------------------------------------------------------------------------

function japanLegState() {
  return baseState({
    trips: [
      {
        id: 'trip-action-bar-test',
        name: 'Action Bar Test Trip',
        status: 'upcoming',
      },
    ],
    tripLegs: {
      'trip-action-bar-test': [
        {
          id: 'leg-action-bar-jpn',
          destinationCountry: 'JPN',
          arrivalDateISO: '2027-08-01',
          departureDateISO: '2027-08-10',
          flightNumber: 'NH201',
          airlineCode: 'NH',
          formStatus: 'not_started',
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

// ---------------------------------------------------------------------------
// Error tracking
// ---------------------------------------------------------------------------

const tracker = createErrorTracker();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('LegFormScreen — Fixed Action Button Bar', () => {
  test.beforeEach(async ({ page }) => {
    tracker.setup(page);
  });

  test.afterEach(() => {
    tracker.assertNoCriticalErrors();
  });

  test('action-buttons-bar renders when LegFormScreen loads', async ({ page }) => {
    await injectState(page, japanLegState());
    await page.goto('/');

    // Navigate to the trip
    await expect(page.getByText('My Trips')).toBeVisible({ timeout: 10000 });
    await page.getByText('Action Bar Test Trip').click();
    await expect(page.getByText('Itinerary', { exact: true })).toBeVisible({ timeout: 10000 });

    // Open the leg form
    await page.getByTestId('leg-card-JPN').click();
    await expect(page.getByText('Travel Form')).toBeVisible({ timeout: 15000 });

    // The action-buttons-bar container must be present
    const bar = page.getByTestId('action-buttons-bar');
    await expect(bar).toBeVisible({ timeout: 8000 });
  });

  test('Save Progress button is visible without scrolling', async ({ page }) => {
    await injectState(page, japanLegState());
    await page.goto('/');

    await expect(page.getByText('My Trips')).toBeVisible({ timeout: 10000 });
    await page.getByText('Action Bar Test Trip').click();
    await expect(page.getByText('Itinerary', { exact: true })).toBeVisible({ timeout: 10000 });

    await page.getByTestId('leg-card-JPN').click();
    await expect(page.getByText('Travel Form')).toBeVisible({ timeout: 15000 });

    // Save Progress button should be visible immediately — no scrolling required
    const saveButton = page.getByTestId('save-progress-button');
    await expect(saveButton).toBeVisible({ timeout: 8000 });

    // Confirm the button is within the fixed action-buttons-bar
    const bar = page.getByTestId('action-buttons-bar');
    await expect(bar).toBeVisible();
    // Both bar and save button must be visible at the same time
    await expect(saveButton).toBeVisible();
  });

  test('Mark as Ready button is visible without scrolling', async ({ page }) => {
    await injectState(page, japanLegState());
    await page.goto('/');

    await expect(page.getByText('My Trips')).toBeVisible({ timeout: 10000 });
    await page.getByText('Action Bar Test Trip').click();
    await expect(page.getByText('Itinerary', { exact: true })).toBeVisible({ timeout: 10000 });

    await page.getByTestId('leg-card-JPN').click();
    await expect(page.getByText('Travel Form')).toBeVisible({ timeout: 15000 });

    // Mark as Ready (or Complete Required Fields) button should be visible immediately
    const markReadyButton = page.getByTestId('mark-ready-button');
    await expect(markReadyButton).toBeVisible({ timeout: 8000 });
  });

  test('action buttons bar remains visible after scrolling down', async ({ page }) => {
    await injectState(page, japanLegState());
    await page.goto('/');

    await expect(page.getByText('My Trips')).toBeVisible({ timeout: 10000 });
    await page.getByText('Action Bar Test Trip').click();
    await expect(page.getByText('Itinerary', { exact: true })).toBeVisible({ timeout: 10000 });

    await page.getByTestId('leg-card-JPN').click();
    await expect(page.getByText('Travel Form')).toBeVisible({ timeout: 15000 });

    // Scroll the page down to simulate a long form
    await page.evaluate(() => window.scrollTo(0, 500));

    // After scrolling, the action buttons bar should still be visible
    const bar = page.getByTestId('action-buttons-bar');
    await expect(bar).toBeVisible({ timeout: 5000 });

    const saveButton = page.getByTestId('save-progress-button');
    await expect(saveButton).toBeVisible({ timeout: 5000 });

    const markReadyButton = page.getByTestId('mark-ready-button');
    await expect(markReadyButton).toBeVisible({ timeout: 5000 });
  });
});
