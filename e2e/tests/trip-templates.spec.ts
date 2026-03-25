/**
 * E2E smoke tests for Trip Templates feature.
 *
 * Verifies:
 * - TemplatesScreen is reachable from TripListScreen header
 * - Empty state renders when no templates exist
 * - 'Save as Template' button is visible on TripDetailScreen
 * - SaveTemplateModal renders when 'Save as Template' is tapped
 */

import { test, expect } from '@playwright/test';
import { baseState, injectState } from '../helpers/fixtures';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function stateWithTrip() {
  return baseState({
    trips: [
      {
        id: 'tpl-test-trip',
        name: 'Japan Loop',
        status: 'upcoming',
      },
    ],
    tripLegs: {
      'tpl-test-trip': [
        {
          id: 'tpl-leg-1',
          destinationCountry: 'JPN',
          arrivalDateISO: '2027-09-01',
          departureDateISO: '2027-09-07',
          flightNumber: 'NH101',
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
// Tests: TemplatesScreen
// ---------------------------------------------------------------------------

test.describe('TemplatesScreen', () => {
  test('Templates button is visible on TripListScreen', async ({ page }) => {
    await injectState(page, baseState());
    await page.goto('/');
    await expect(page.getByText('My Trips')).toBeVisible({ timeout: 10000 });

    // The Templates navigation button should be visible in the header
    const templatesButton = page.getByTestId('templates-nav-button');
    await expect(templatesButton).toBeVisible({ timeout: 5000 });
  });

  test('TemplatesScreen renders empty state when no templates exist', async ({ page }) => {
    await injectState(page, baseState());
    await page.goto('/');
    await expect(page.getByText('My Trips')).toBeVisible({ timeout: 10000 });

    // Navigate to TemplatesScreen
    const templatesButton = page.getByTestId('templates-nav-button');
    await expect(templatesButton).toBeVisible({ timeout: 5000 });
    await templatesButton.click();

    // Should show the Templates screen header
    await expect(page.getByText('Trip Templates')).toBeVisible({ timeout: 8000 });

    // Should show empty state text
    await expect(page.getByText('No templates yet')).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Helper: state with a saved template
// ---------------------------------------------------------------------------

function stateWithTemplate() {
  const template = {
    id: 'tpl_e2e_001',
    name: 'Japan Loop',
    legs: [
      { countryCode: 'JPN', typicalDurationDays: 7, order: 0 },
      { countryCode: 'SGP', typicalDurationDays: 3, order: 1 },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  };
  return baseState({
    mmkv: {
      trip_templates: JSON.stringify([template]),
    },
  });
}

// ---------------------------------------------------------------------------
// Tests: Use Template — navigates to CreateTrip
// ---------------------------------------------------------------------------

test.describe('TemplatesScreen — Use Template flow', () => {
  test('Use Template button is visible when templates exist', async ({ page }) => {
    await injectState(page, stateWithTemplate());
    await page.goto('/');
    await expect(page.getByText('My Trips')).toBeVisible({ timeout: 10000 });

    // Navigate to TemplatesScreen
    const templatesButton = page.getByTestId('templates-nav-button');
    await expect(templatesButton).toBeVisible({ timeout: 5000 });
    await templatesButton.click();

    // Should show the template name and Use Template button
    await expect(page.getByText('Trip Templates')).toBeVisible({ timeout: 8000 });
    const useButton = page.getByTestId('use-template-tpl_e2e_001');
    await expect(useButton).toBeVisible({ timeout: 8000 });
  });

  test('tapping Use Template navigates to CreateTrip screen', async ({ page }) => {
    await injectState(page, stateWithTemplate());
    await page.goto('/');
    await expect(page.getByText('My Trips')).toBeVisible({ timeout: 10000 });

    // Navigate to TemplatesScreen
    await page.getByTestId('templates-nav-button').click();
    await expect(page.getByText('Trip Templates')).toBeVisible({ timeout: 8000 });

    // Tap Use Template
    const useButton = page.getByTestId('use-template-tpl_e2e_001');
    await expect(useButton).toBeVisible({ timeout: 8000 });
    await useButton.click();

    // Should land on CreateTrip screen with template pre-filled
    await expect(page.getByText('Trip from Template')).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Tests: Save as Template from TripDetailScreen
// ---------------------------------------------------------------------------

test.describe('TripDetailScreen — Save as Template', () => {
  test('"Save as Template" button is visible on trip detail', async ({ page }) => {
    await injectState(page, stateWithTrip());
    await page.goto('/');
    await expect(page.getByText('My Trips')).toBeVisible({ timeout: 10000 });

    // Navigate to the trip
    await page.getByText('Japan Loop').click();
    await expect(page.getByText('Itinerary', { exact: true })).toBeVisible({ timeout: 10000 });

    // The Save as Template button should be visible
    const saveButton = page.getByTestId('save-as-template-button');
    await expect(saveButton).toBeVisible({ timeout: 5000 });
  });

  test('SaveTemplateModal opens when "Save as Template" is tapped', async ({ page }) => {
    await injectState(page, stateWithTrip());
    await page.goto('/');
    await expect(page.getByText('My Trips')).toBeVisible({ timeout: 10000 });

    await page.getByText('Japan Loop').click();
    await expect(page.getByText('Itinerary', { exact: true })).toBeVisible({ timeout: 10000 });

    // Tap Save as Template — scroll into view first (button may be below fold)
    const saveButton = page.getByTestId('save-as-template-button');
    await saveButton.scrollIntoViewIfNeeded();
    await saveButton.click();

    // Modal should appear — name input is the definitive signal
    const nameInput = page.getByTestId('save-template-modal-name-input');
    await expect(nameInput).toBeVisible({ timeout: 8000 });
  });
});
