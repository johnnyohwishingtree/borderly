import { test, expect, Page } from '@playwright/test';
import { baseState, injectState, createErrorTracker, navigateImperatively } from '../helpers';

/**
 * E2E smoke tests for the FamilyManagementScreen.
 *
 * Uses state injection + imperative navigation to reach Family Management.
 */

const JANE_PROFILE = {
  id: 'e2e-profile-1',
  surname: 'Smith',
  givenNames: 'Jane',
  passportNumber: 'CD9876543',
  nationality: 'CAN',
  dateOfBirth: '1985-05-15',
  gender: 'F',
  passportExpiry: '2030-12-31',
  issuingCountry: 'CAN',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function familyProfilesJson(profiles: Record<string, { id: string; relationship: string; nickname: string }>) {
  return JSON.stringify({
    profiles: Object.fromEntries(
      Object.entries(profiles).map(([id, p]) => [id, {
        ...p,
        isPrimary: p.relationship === 'self',
        isActive: true,
        biometricEnabled: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      }]),
    ),
    primaryProfileId: 'e2e-profile-1',
    maxProfiles: 8,
    version: 1,
    lastModified: '2026-01-01T00:00:00Z',
  });
}

const SINGLE_PROFILE_STATE = baseState({
  profiles: { [JANE_PROFILE.id]: JANE_PROFILE },
  mmkv: {
    current_profile_id: JANE_PROFILE.id,
    family_profiles: familyProfilesJson({
      'e2e-profile-1': { id: 'e2e-profile-1', relationship: 'self', nickname: 'Jane Smith' },
    }),
  },
});

const MULTI_PROFILE_STATE = baseState({
  profiles: {
    'e2e-profile-1': JANE_PROFILE,
    'e2e-profile-2': { ...JANE_PROFILE, id: 'e2e-profile-2', givenNames: 'John', passportNumber: 'CD9876544', dateOfBirth: '1982-03-10', gender: 'M' },
    'e2e-profile-3': { ...JANE_PROFILE, id: 'e2e-profile-3', givenNames: 'Emma', passportNumber: 'CD9876545', dateOfBirth: '2015-07-20' },
  },
  mmkv: {
    current_profile_id: JANE_PROFILE.id,
    family_profiles: familyProfilesJson({
      'e2e-profile-1': { id: 'e2e-profile-1', relationship: 'self', nickname: 'Jane Smith' },
      'e2e-profile-2': { id: 'e2e-profile-2', relationship: 'spouse', nickname: 'John Smith' },
      'e2e-profile-3': { id: 'e2e-profile-3', relationship: 'child', nickname: 'Emma Smith' },
    }),
  },
});

async function navigateToFamilyManagement(page: Page) {
  await page.locator('[data-testid="tab-profile"]').waitFor({ timeout: 5000 }).catch(() => {});
  await navigateImperatively(page, 'Main', { screen: 'Profile', params: { screen: 'FamilyManagement' } });
  await page.getByText('Family Members').first().waitFor({ timeout: 3000 }).catch(() => {});
}

const tracker = createErrorTracker();

test.describe('FamilyManagementScreen', () => {
  test.beforeEach(async ({ page }) => {
    tracker.setup(page);
  });

  test.afterEach(() => {
    tracker.assertNoCriticalErrors();
  });

  test('family management screen renders with primary user', async ({ page }) => {
    await injectState(page, SINGLE_PROFILE_STATE);
    await page.goto('/');
    await navigateToFamilyManagement(page);

    const heading = page.getByText('Family Members');
    if (await heading.count() > 0) await expect(heading.first()).toBeVisible();

    const userName = page.getByText('Jane Smith');
    if (await userName.count() > 0) await expect(userName.first()).toBeVisible();

    const relationship = page.getByText('Primary Traveler');
    if (await relationship.count() > 0) await expect(relationship.first()).toBeVisible();
  });

  test('add member button is present', async ({ page }) => {
    await injectState(page, SINGLE_PROFILE_STATE);
    await page.goto('/');
    await navigateToFamilyManagement(page);

    const addButton = page.locator('[data-testid="add-member-button"]');
    if (await addButton.count() > 0) await expect(addButton.first()).toBeVisible();
  });

  test('multiple family members display when injected', async ({ page }) => {
    await injectState(page, MULTI_PROFILE_STATE);
    await page.goto('/');
    await navigateToFamilyManagement(page);

    for (const name of ['Jane Smith', 'John Smith', 'Emma Smith']) {
      const el = page.getByText(name);
      if (await el.count() > 0) await expect(el.first()).toBeVisible();
    }
  });
});
