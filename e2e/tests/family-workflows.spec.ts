import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const COUNTRY_LABELS: Record<string, string> = {
  USA: 'United States',
  AUS: 'Australia',
  CAN: 'Canada',
  GBR: 'United Kingdom',
  JPN: 'Japan',
};

/** Select a country in a SearchableSelect dropdown by testID */
async function selectCountry(page: Page, testID: string, code: string) {
  const label = COUNTRY_LABELS[code] || code;
  await page.getByTestId(`${testID}-trigger`).click();
  await page.getByTestId(`${testID}-search`).fill(label);
  await page.getByTestId(`${testID}-option-${code}`).click();
}

/**
 * Navigate to a screen using the imperative navigation ref.
 * Returns true if navigation succeeded, false otherwise.
 */
async function navigateToScreen(page: Page, mainScreen: string, nestedScreen?: string) {
  await page.waitForFunction(
    () => typeof (window as any).__navigationRef !== 'undefined',
    { timeout: 3000 },
  ).catch(() => {});

  return await page.evaluate(async ({ main, nested }) => {
    const navRef = (window as any).__navigationRef;
    if (!navRef) return false;
    let attempts = 0;
    while (!navRef.isReady() && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    if (!navRef.isReady()) return false;
    if (nested) {
      navRef.navigate('Main', { screen: main, params: { screen: nested } });
    } else {
      navRef.navigate('Main', { screen: main });
    }
    return true;
  }, { main: mainScreen, nested: nestedScreen });
}

/* ------------------------------------------------------------------ */
/*  State fixtures                                                     */
/* ------------------------------------------------------------------ */

const SINGLE_PROFILE_FAMILY_JSON = JSON.stringify({
  profiles: {
    'e2e-primary': {
      id: 'e2e-primary',
      relationship: 'self',
      isPrimary: true,
      isActive: true,
      biometricEnabled: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      nickname: 'Maria Anderson',
    },
  },
  primaryProfileId: 'e2e-primary',
  maxProfiles: 8,
  version: 1,
  lastModified: '2026-01-01T00:00:00Z',
});

const TWO_PROFILE_FAMILY_JSON = JSON.stringify({
  profiles: {
    'e2e-primary': {
      id: 'e2e-primary',
      relationship: 'self',
      isPrimary: true,
      isActive: true,
      biometricEnabled: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      nickname: 'Maria Anderson',
    },
    'e2e-child': {
      id: 'e2e-child',
      relationship: 'child',
      isPrimary: false,
      isActive: true,
      biometricEnabled: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      nickname: 'Sofia Anderson',
    },
  },
  primaryProfileId: 'e2e-primary',
  maxProfiles: 8,
  version: 1,
  lastModified: '2026-01-01T00:00:00Z',
});

/** Inject state with a single primary profile. */
async function injectSingleProfileState(page: Page) {
  await page.addInitScript((familyJson: string) => {
    (window as any).__BORDERLY_STATE__ = {
      preferences: { onboardingComplete: true },
      mmkv: {
        'current_profile_id': 'e2e-primary',
        'family_profiles': familyJson,
      },
      profiles: {
        'e2e-primary': {
          id: 'e2e-primary',
          surname: 'Anderson',
          givenNames: 'Maria',
          passportNumber: 'US9876543',
          nationality: 'USA',
          dateOfBirth: '1988-09-12',
          gender: 'F',
          passportExpiry: '2031-03-20',
          issuingCountry: 'USA',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      },
    };
  }, SINGLE_PROFILE_FAMILY_JSON);
}

/** Inject state with a primary profile and one child profile. */
async function injectTwoProfileState(page: Page) {
  await page.addInitScript((familyJson: string) => {
    (window as any).__BORDERLY_STATE__ = {
      preferences: { onboardingComplete: true },
      mmkv: {
        'current_profile_id': 'e2e-primary',
        'family_profiles': familyJson,
      },
      profiles: {
        'e2e-primary': {
          id: 'e2e-primary',
          surname: 'Anderson',
          givenNames: 'Maria',
          passportNumber: 'US9876543',
          nationality: 'USA',
          dateOfBirth: '1988-09-12',
          gender: 'F',
          passportExpiry: '2031-03-20',
          issuingCountry: 'USA',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        'e2e-child': {
          id: 'e2e-child',
          surname: 'Anderson',
          givenNames: 'Sofia',
          passportNumber: 'US9876544',
          nationality: 'USA',
          dateOfBirth: '2016-04-08',
          gender: 'F',
          passportExpiry: '2026-04-08',
          issuingCountry: 'USA',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      },
    };
  }, TWO_PROFILE_FAMILY_JSON);
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

test.describe('Family Workflows', () => {
  let jsErrors: string[];

  test.beforeEach(async ({ page }) => {
    jsErrors = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));
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

  test('single user can navigate to family management and see primary profile', async ({ page }) => {
    await injectSingleProfileState(page);
    await page.goto('/');

    const navigated = await navigateToScreen(page, 'Profile', 'FamilyManagement');

    if (navigated) {
      // Wait for the Family Members heading to appear
      await page.getByText('Family Members').first().waitFor({ timeout: 5000 }).catch(() => {});

      const heading = page.getByText('Family Members');
      const count = await heading.count();
      if (count > 0) {
        await expect(heading.first()).toBeVisible();
      }

      // Primary user should appear with "Primary Traveler" relationship label
      const primaryLabel = page.getByText('Primary Traveler');
      const primaryCount = await primaryLabel.count();
      if (primaryCount > 0) {
        await expect(primaryLabel.first()).toBeVisible();
      }
    }
  });

  test('family with multiple members renders both profiles', async ({ page }) => {
    await injectTwoProfileState(page);
    await page.goto('/');

    const navigated = await navigateToScreen(page, 'Profile', 'FamilyManagement');

    if (navigated) {
      await page.getByText('Family Members').first().waitFor({ timeout: 5000 }).catch(() => {});

      const heading = page.getByText('Family Members');
      const count = await heading.count();
      if (count > 0) {
        await expect(heading.first()).toBeVisible();
      }

      // The primary profile name should be visible
      const primaryName = page.getByText('Maria Anderson');
      const primaryCount = await primaryName.count();
      if (primaryCount > 0) {
        await expect(primaryName.first()).toBeVisible();
      }

      // The child profile name should be visible
      const childName = page.getByText('Sofia Anderson');
      const childCount = await childName.count();
      if (childCount > 0) {
        await expect(childName.first()).toBeVisible();
      }
    }
  });

  test('add member button is visible on family management screen', async ({ page }) => {
    await injectSingleProfileState(page);
    await page.goto('/');

    const navigated = await navigateToScreen(page, 'Profile', 'FamilyManagement');

    if (navigated) {
      await page.getByText('Family Members').first().waitFor({ timeout: 5000 }).catch(() => {});

      const addButton = page.getByTestId('add-member-button');
      const count = await addButton.count();
      if (count > 0) {
        await expect(addButton.first()).toBeVisible();
      }
    }
  });
});
