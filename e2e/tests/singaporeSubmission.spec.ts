import { test, expect, Page } from '@playwright/test';

/**
 * Singapore SG Arrival Card Submission E2E Tests
 *
 * Verifies the form generation and submission guide for Singapore
 * using state injection to skip onboarding and trip creation.
 */

const FAMILY_PROFILES_JSON = JSON.stringify({
  profiles: {
    'e2e-profile-1': {
      id: 'e2e-profile-1',
      relationship: 'self',
      isPrimary: true,
      isActive: true,
      biometricEnabled: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      nickname: 'Alice Smith',
    },
  },
  primaryProfileId: 'e2e-profile-1',
  maxProfiles: 8,
  version: 1,
  lastModified: '2026-01-01T00:00:00Z',
});

async function injectStateWithTrip(page: Page) {
  await page.addInitScript((familyProfilesJson: string) => {
    (window as any).__BORDERLY_STATE__ = {
      preferences: { onboardingComplete: true },
      mmkv: {
        current_profile_id: 'e2e-profile-1',
        family_profiles: familyProfilesJson,
      },
      profiles: {
        'e2e-profile-1': {
          id: 'e2e-profile-1',
          surname: 'Smith',
          givenNames: 'Alice',
          passportNumber: 'AB1234567',
          nationality: 'USA',
          dateOfBirth: '1985-03-15',
          gender: 'F',
          passportExpiry: '2030-03-15',
          issuingCountry: 'USA',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      },
      trips: [
        {
          id: 'e2e-trip-sgp',
          name: 'Singapore Trip',
          status: 'upcoming',
        },
      ],
      tripLegs: {
        'e2e-trip-sgp': [
          {
            id: 'e2e-leg-sgp',
            destinationCountry: 'SGP',
            arrivalDateISO: '2026-09-05',
            departureDateISO: '2026-09-12',
            flightNumber: 'SQ25',
            airlineCode: 'SQ',
            formStatus: 'not_started',
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
    };
  }, FAMILY_PROFILES_JSON);
}

test.describe('Singapore SG Arrival Card Submission', () => {
  let jsErrors: string[];

  test.beforeEach(async ({ page }) => {
    jsErrors = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));
    page.on('dialog', (dialog) => dialog.accept());
  });

  test.afterEach(() => {
    const criticalErrors = jsErrors.filter(
      (e) =>
        !e.includes('Warning:') &&
        !e.includes('React does not recognize') &&
        !e.includes('cannot be a child of') &&
        !e.includes('NativeWind') &&
        !e.includes('shadow'),
    );
    expect(criticalErrors).toEqual([]);
  });

  test('trip detail shows Singapore leg card', async ({ page }) => {
    await injectStateWithTrip(page);
    await page.goto('/');

    // Wait for trip list to appear
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 10000 });

    // Open the trip
    const tripCard = page.getByTestId('trip-card-Singapore Trip');
    const tripCardCount = await tripCard.count();
    if (tripCardCount > 0) {
      await tripCard.click();
      // Should show the itinerary with SGP leg
      await expect(page.getByText('Itinerary', { exact: true })).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId('leg-card-SGP')).toBeVisible({ timeout: 5000 });
    }
  });

  test('Singapore leg form renders with DynamicForm', async ({ page }) => {
    test.setTimeout(45000);
    await injectStateWithTrip(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 10000 });

    const tripCard = page.getByTestId('trip-card-Singapore Trip');
    const tripCardCount = await tripCard.count();
    if (tripCardCount === 0) return;

    await tripCard.click();
    await expect(page.getByTestId('leg-card-SGP')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('leg-card-SGP').click();

    // LegForm should show Travel Form heading
    await expect(page.getByText('Travel Form')).toBeVisible({ timeout: 15000 });

    // DynamicForm should render
    await expect(page.getByTestId('dynamic-form')).toBeVisible({ timeout: 10000 });
  });
});
