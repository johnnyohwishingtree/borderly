import { test, expect, Page } from '@playwright/test';

/**
 * Horizontal overflow detection test.
 *
 * Renders screens at a narrow mobile viewport (375px — iPhone SE) and checks
 * that no content overflows horizontally. This catches `flex-row` containers
 * missing `flex-wrap` that cause buttons/elements to spill past the viewport.
 *
 * The check: `document.documentElement.scrollWidth > window.innerWidth`
 * If true, something is wider than the screen.
 */

const NARROW_WIDTH = 375;
const VIEWPORT_HEIGHT = 667;

// ── State injection helpers ──

const FAMILY_PROFILES_JSON = JSON.stringify({
  profiles: {
    'overflow-profile-1': {
      id: 'overflow-profile-1',
      relationship: 'self',
      isPrimary: true,
      isActive: true,
      biometricEnabled: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      nickname: 'John Smith',
    },
    'overflow-profile-2': {
      id: 'overflow-profile-2',
      relationship: 'spouse',
      isPrimary: false,
      isActive: true,
      biometricEnabled: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      nickname: 'Jane Smith',
    },
  },
  primaryProfileId: 'overflow-profile-1',
  maxProfiles: 8,
  version: 1,
  lastModified: '2026-01-01T00:00:00Z',
});

async function injectOnboardedState(page: Page) {
  await page.addInitScript((familyJson: string) => {
    (window as any).__BORDERLY_STATE__ = {
      preferences: { onboardingComplete: true },
      mmkv: {
        'current_profile_id': 'overflow-profile-1',
        'family_profiles': familyJson,
      },
      profiles: {
        'overflow-profile-1': {
          id: 'overflow-profile-1',
          surname: 'SMITH',
          givenNames: 'JOHN',
          passportNumber: 'AB1234567',
          nationality: 'USA',
          dateOfBirth: '1990-01-15',
          gender: 'M',
          passportExpiry: '2030-12-31',
          issuingCountry: 'USA',
          email: 'john@example.com',
          defaultDeclarations: {
            hasItemsToDeclar: false,
            carryingCurrency: false,
            carryingProhibitedItems: false,
            visitedFarm: false,
            hasCriminalRecord: false,
            carryingCommercialGoods: false,
          },
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        'overflow-profile-2': {
          id: 'overflow-profile-2',
          surname: 'SMITH',
          givenNames: 'JANE',
          passportNumber: 'CD9876543',
          nationality: 'USA',
          dateOfBirth: '1992-05-20',
          gender: 'F',
          passportExpiry: '2031-06-15',
          issuingCountry: 'USA',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      },
    };
  }, FAMILY_PROFILES_JSON);
}

async function injectStateWithTrip(page: Page) {
  await page.addInitScript((familyJson: string) => {
    (window as any).__BORDERLY_STATE__ = {
      preferences: { onboardingComplete: true },
      mmkv: {
        'current_profile_id': 'overflow-profile-1',
        'family_profiles': familyJson,
      },
      profiles: {
        'overflow-profile-1': {
          id: 'overflow-profile-1',
          surname: 'SMITH',
          givenNames: 'JOHN',
          passportNumber: 'AB1234567',
          nationality: 'USA',
          dateOfBirth: '1990-01-15',
          gender: 'M',
          passportExpiry: '2030-12-31',
          issuingCountry: 'USA',
          email: 'john@example.com',
          defaultDeclarations: {
            hasItemsToDeclar: false,
            carryingCurrency: false,
            carryingProhibitedItems: false,
            visitedFarm: false,
            hasCriminalRecord: false,
            carryingCommercialGoods: false,
          },
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        'overflow-profile-2': {
          id: 'overflow-profile-2',
          surname: 'SMITH',
          givenNames: 'JANE',
          passportNumber: 'CD9876543',
          nationality: 'USA',
          dateOfBirth: '1992-05-20',
          gender: 'F',
          passportExpiry: '2031-06-15',
          issuingCountry: 'USA',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      },
      trips: [
        {
          id: 'trip-japan',
          name: 'Asia Summer 2026',
          status: 'upcoming',
        },
      ],
      tripLegs: {
        'trip-japan': [
          {
            id: 'leg-jpn',
            destinationCountry: 'JPN',
            arrivalDateISO: '2026-07-01',
            departureDateISO: '2026-07-07',
            flightNumber: 'NH101',
            airlineCode: 'NH',
            arrivalAirport: 'NRT',
            formStatus: 'not_started',
            order: 0,
            accommodation: {
              name: 'Park Hyatt Tokyo',
              address: {
                street: '3-7-1-2 Nishi Shinjuku',
                city: 'Tokyo',
                country: 'JPN',
                postalCode: '163-1055',
              },
            },
          },
        ],
      },
    };
  }, FAMILY_PROFILES_JSON);
}

/**
 * Check that no element overflows the viewport horizontally.
 * Returns { overflows, scrollWidth, clientWidth } for diagnostics.
 */
async function checkHorizontalOverflow(page: Page): Promise<{
  overflows: boolean;
  scrollWidth: number;
  clientWidth: number;
}> {
  return page.evaluate(() => {
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    return {
      overflows: scrollWidth > clientWidth,
      scrollWidth,
      clientWidth,
    };
  });
}

// ── Tests ──

test.describe('Horizontal overflow detection (375px viewport)', () => {
  test.use({ viewport: { width: NARROW_WIDTH, height: VIEWPORT_HEIGHT } });

  // -- Onboarding screens (no injected state needed) --

  test('Welcome screen has no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 15000 });
    const result = await checkHorizontalOverflow(page);
    expect(result.overflows, `scrollWidth=${result.scrollWidth} > clientWidth=${result.clientWidth}`).toBe(false);
  });

  test('Passport scan (method) screen has no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await expect(page.getByText(/Quick Passport Scan/)).toBeVisible({ timeout: 10000 });

    const result = await checkHorizontalOverflow(page);
    expect(result.overflows, `scrollWidth=${result.scrollWidth} > clientWidth=${result.clientWidth}`).toBe(false);
  });

  test('Passport scan (manual entry) screen has no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await expect(page.getByText(/Quick Passport Scan/)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Or enter manually' }).click();
    // Wait for the manual form to render
    await expect(page.getByTestId('passport-number-input')).toBeVisible({ timeout: 5000 });

    const result = await checkHorizontalOverflow(page);
    expect(result.overflows, `scrollWidth=${result.scrollWidth} > clientWidth=${result.clientWidth}`).toBe(false);
  });

  // -- Post-onboarding screens (injected state) --

  test('Trip list (empty) screen has no horizontal overflow', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 10000 });

    const result = await checkHorizontalOverflow(page);
    expect(result.overflows, `scrollWidth=${result.scrollWidth} > clientWidth=${result.clientWidth}`).toBe(false);
  });

  test('Create trip screen has no horizontal overflow', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 10000 });

    // Navigate to create trip
    const createBtn = page.getByTestId('create-first-trip-button');
    const count = await createBtn.count();
    if (count > 0) {
      await createBtn.click();
    } else {
      await page.getByTestId('create-trip-fab').click().catch(() => {
        // Fallback: use imperative navigation
      });
      await page.waitForFunction(() => (window as any).__navigationRef?.isReady(), { timeout: 5000 });
      await page.evaluate(() => (window as any).__navigationRef?.navigate('CreateTrip'));
    }
    await expect(page.getByText('Create New Trip')).toBeVisible({ timeout: 10000 });

    const result = await checkHorizontalOverflow(page);
    expect(result.overflows, `scrollWidth=${result.scrollWidth} > clientWidth=${result.clientWidth}`).toBe(false);
  });

  test('Create trip screen with destination has no horizontal overflow', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 10000 });

    const createBtn = page.getByTestId('create-first-trip-button');
    const count = await createBtn.count();
    if (count > 0) {
      await createBtn.click();
    } else {
      await page.waitForFunction(() => (window as any).__navigationRef?.isReady(), { timeout: 5000 });
      await page.evaluate(() => (window as any).__navigationRef?.navigate('CreateTrip'));
    }
    await expect(page.getByText('Create New Trip')).toBeVisible({ timeout: 10000 });

    // Add a destination to show the button row (Import / Scan / + Add)
    await page.getByTestId('add-destination-button').click();

    const result = await checkHorizontalOverflow(page);
    expect(result.overflows, `scrollWidth=${result.scrollWidth} > clientWidth=${result.clientWidth}`).toBe(false);
  });

  test('Trip detail screen has no horizontal overflow', async ({ page }) => {
    await injectStateWithTrip(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 10000 });

    // Click on the trip card
    const tripCard = page.getByText('Asia Summer 2026');
    await tripCard.click();
    await expect(page.getByText('Itinerary', { exact: true })).toBeVisible({ timeout: 10000 });

    const result = await checkHorizontalOverflow(page);
    expect(result.overflows, `scrollWidth=${result.scrollWidth} > clientWidth=${result.clientWidth}`).toBe(false);
  });

  test('Profile screen has no horizontal overflow', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 10000 });

    // Navigate to profile tab
    const profileTab = page.getByRole('tab', { name: 'Profile tab' });
    await profileTab.waitFor({ timeout: 5000 });
    await profileTab.click();

    // Wait for profile content
    await page.getByText('SMITH').first().waitFor({ timeout: 5000 }).catch(() => {});

    const result = await checkHorizontalOverflow(page);
    expect(result.overflows, `scrollWidth=${result.scrollWidth} > clientWidth=${result.clientWidth}`).toBe(false);
  });

  test('Settings screen has no horizontal overflow', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 10000 });

    // Navigate to settings tab
    const settingsTab = page.getByRole('tab', { name: 'Settings tab' });
    await settingsTab.waitFor({ timeout: 5000 });
    await settingsTab.click();
    await page.getByText('Settings').first().waitFor({ timeout: 3000 }).catch(() => {});

    const result = await checkHorizontalOverflow(page);
    expect(result.overflows, `scrollWidth=${result.scrollWidth} > clientWidth=${result.clientWidth}`).toBe(false);
  });

  test('Feedback screen has no horizontal overflow', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 10000 });

    // Navigate to settings → feedback
    const settingsTab = page.getByRole('tab', { name: 'Settings tab' });
    await settingsTab.waitFor({ timeout: 5000 });
    await settingsTab.click();
    await page.getByText('Settings').first().waitFor({ timeout: 3000 }).catch(() => {});

    // Click feedback button
    const feedbackBtn = page.getByText('Send Feedback');
    const fbCount = await feedbackBtn.count();
    if (fbCount > 0) {
      await feedbackBtn.first().click();
      await page.getByText('Rate Your Experience').waitFor({ timeout: 5000 }).catch(() => {});
    } else {
      // Imperative fallback
      await page.evaluate(() => (window as any).__navigationRef?.navigate('Feedback'));
      await page.getByText('Rate Your Experience').waitFor({ timeout: 5000 }).catch(() => {});
    }

    const result = await checkHorizontalOverflow(page);
    expect(result.overflows, `scrollWidth=${result.scrollWidth} > clientWidth=${result.clientWidth}`).toBe(false);
  });
});
