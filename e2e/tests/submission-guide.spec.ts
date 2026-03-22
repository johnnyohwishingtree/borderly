/**
 * E2E smoke tests for SubmissionGuideScreen — Mark as Submitted CTA.
 *
 * Verifies:
 * - SubmissionGuideScreen renders when navigated to directly
 * - "Mark as Complete" buttons are visible for each step
 * - After completing all steps the "Mark as Submitted" button appears
 */

import { test, expect } from '@playwright/test';
import { countryTripState, injectState, navigateImperatively } from '../helpers';

const JPN_STATE = countryTripState({
  countryCode: 'JPN',
  tripName: 'Japan Trip',
  flightNumber: 'NH101',
  airlineCode: 'NH',
  arrivalDate: '2026-09-01',
  departureDate: '2026-09-10',
  accommodation: {
    name: 'Park Hyatt Tokyo',
    address: {
      street: '3-7-1-2 Nishi Shinjuku',
      city: 'Tokyo',
      country: 'Japan',
      postalCode: '163-1055',
    },
  },
});

// Override formStatus to 'ready' so the Submission Guide is accessible
const READY_LEG_STATE = {
  ...JPN_STATE,
  tripLegs: {
    ...JPN_STATE.tripLegs,
    'e2e-trip-jpn': [
      {
        ...(JPN_STATE.tripLegs['e2e-trip-jpn']?.[0] ?? {}),
        formStatus: 'ready',
      },
    ],
  },
};

test.describe('SubmissionGuideScreen — Mark as Submitted CTA', () => {
  test('mark-as-submitted-button is visible after completing all guide steps', async ({ page }) => {
    test.setTimeout(60000);
    page.on('dialog', dialog => dialog.accept());

    await injectState(page, READY_LEG_STATE);
    await page.goto('/');

    // Navigate to TripDetail via UI — this ensures loadTrips() has completed
    // (trip card is only rendered after loadTrips() returns) AND that
    // loadFamilyProfiles() is called (TripDetailScreen calls it on focus).
    await expect(page.getByText('My Trips')).toBeVisible({ timeout: 15000 });
    await page.getByText('Japan Trip').click();
    await expect(page.getByText('Itinerary', { exact: true })).toBeVisible({ timeout: 10000 });

    await navigateImperatively(page, 'SubmissionGuide', {
      tripId: 'e2e-trip-jpn',
      legId: 'e2e-leg-jpn',
      countryCode: 'JPN',
    });

    // Wait for the submission guide to load
    await expect(page.getByText('Submission Guide')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Submission Timing')).toBeVisible({ timeout: 10000 });

    // Complete all steps by clicking "Mark as Complete" buttons sequentially
    let stepButtonVisible = true;
    let safetyCounter = 0;
    while (stepButtonVisible && safetyCounter < 20) {
      const markCompleteBtn = page.getByRole('button', { name: 'Mark as Complete' });
      const isVisible = await markCompleteBtn.isVisible().catch(() => false);
      if (!isVisible) {
        stepButtonVisible = false;
      } else {
        await markCompleteBtn.click();
        await page.waitForTimeout(300);
      }
      safetyCounter++;
    }

    // After all steps are complete, the "Mark as Submitted" CTA should appear
    const markAsSubmittedBtn = page.getByTestId('mark-as-submitted-button');
    await expect(markAsSubmittedBtn).toBeVisible({ timeout: 10000 });
    await expect(markAsSubmittedBtn).toBeEnabled();
  });

  test('submission guide screen renders the portal info card and step list', async ({ page }) => {
    test.setTimeout(45000);
    page.on('dialog', dialog => dialog.accept());

    await injectState(page, READY_LEG_STATE);
    await page.goto('/');

    // Navigate to TripDetail via UI — this ensures loadTrips() has completed
    // (trip card is only rendered after loadTrips() returns) AND that
    // loadFamilyProfiles() is called (TripDetailScreen calls it on focus).
    await expect(page.getByText('My Trips')).toBeVisible({ timeout: 15000 });
    await page.getByText('Japan Trip').click();
    await expect(page.getByText('Itinerary', { exact: true })).toBeVisible({ timeout: 10000 });

    await navigateImperatively(page, 'SubmissionGuide', {
      tripId: 'e2e-trip-jpn',
      legId: 'e2e-leg-jpn',
      countryCode: 'JPN',
    });

    await expect(page.getByText('Japan Submission Guide')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Visit Japan Web')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Submission Timing')).toBeVisible();
    // Submit in App and Open in Browser buttons should be present
    await expect(page.getByTestId('submit-in-app-button')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('open-in-browser-button')).toBeVisible({ timeout: 5000 });
  });
});
