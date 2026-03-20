import { test, expect } from '@playwright/test';
import { baseState, injectState, createErrorTracker, navigateImperatively } from '../helpers';

/**
 * E2E smoke tests for the ProfileScreen.
 *
 * Verifies the consolidated family entry point:
 * - A single summary row (count + chevron) is the only way to reach FamilyManagement
 * - No duplicate "Manage" or "Add Family Member" buttons exist
 * - Tapping the summary row navigates to FamilyManagement
 */

const SINGLE_PROFILE_STATE = baseState();

const MULTI_PROFILE_STATE = baseState({
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
    'e2e-profile-2': {
      id: 'e2e-profile-2',
      surname: 'Smith',
      givenNames: 'Bob',
      passportNumber: 'AB7654321',
      nationality: 'USA',
      dateOfBirth: '1983-07-20',
      gender: 'M',
      passportExpiry: '2031-06-10',
      issuingCountry: 'USA',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    'e2e-profile-3': {
      id: 'e2e-profile-3',
      surname: 'Smith',
      givenNames: 'Clara',
      passportNumber: 'AB1122334',
      nationality: 'USA',
      dateOfBirth: '2015-04-12',
      gender: 'F',
      passportExpiry: '2028-08-01',
      issuingCountry: 'USA',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  },
  mmkv: {
    current_profile_id: 'e2e-profile-1',
    family_profiles: JSON.stringify({
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
        'e2e-profile-2': {
          id: 'e2e-profile-2',
          relationship: 'spouse',
          isPrimary: false,
          isActive: true,
          biometricEnabled: false,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
          nickname: 'Bob Smith',
        },
        'e2e-profile-3': {
          id: 'e2e-profile-3',
          relationship: 'child',
          isPrimary: false,
          isActive: true,
          biometricEnabled: false,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
          nickname: 'Clara Smith',
        },
      },
      primaryProfileId: 'e2e-profile-1',
      maxProfiles: 8,
      version: 1,
      lastModified: '2026-01-01T00:00:00Z',
    }),
  },
});

async function navigateToProfile(page: import('@playwright/test').Page) {
  await page.locator('[data-testid="tab-profile"]').waitFor({ timeout: 5000 }).catch(() => {});
  await navigateImperatively(page, 'Main', { screen: 'Profile', params: { screen: 'Profile' } });
  await page.getByText('Family Members').first().waitFor({ timeout: 5000 }).catch(() => {});
}

const tracker = createErrorTracker();

test.describe('ProfileScreen — consolidated family entry point', () => {
  test.beforeEach(async ({ page }) => {
    tracker.setup(page);
  });

  test.afterEach(() => {
    tracker.assertNoCriticalErrors();
  });

  test('profile screen renders Family Members section', async ({ page }) => {
    await injectState(page, SINGLE_PROFILE_STATE);
    await page.goto('/');
    await navigateToProfile(page);

    await expect(page.getByText('Family Members').first()).toBeVisible({ timeout: 5000 });
  });

  test('family summary row is the only family navigation entry point', async ({ page }) => {
    await injectState(page, SINGLE_PROFILE_STATE);
    await page.goto('/');
    await navigateToProfile(page);

    // Single summary row is present
    const summaryRow = page.locator('[data-testid="family-summary-row"]');
    await expect(summaryRow).toBeVisible({ timeout: 5000 });

    // Duplicate buttons must not exist
    const manageBtn = page.locator('[data-testid="manage-family-button"]');
    const addBtn = page.locator('[data-testid="add-family-member-button"]');
    expect(await manageBtn.count()).toBe(0);
    expect(await addBtn.count()).toBe(0);
  });

  test('tapping summary row navigates to FamilyManagement', async ({ page }) => {
    await injectState(page, SINGLE_PROFILE_STATE);
    await page.goto('/');
    await navigateToProfile(page);

    const summaryRow = page.locator('[data-testid="family-summary-row"]');
    await expect(summaryRow).toBeVisible({ timeout: 5000 });
    await summaryRow.click();
    // FamilyManagement screen should render — check for text unique to that screen
    await expect(page.getByText('Manage your family travel profiles')).toBeVisible({ timeout: 10000 });
  });

  test('summary row shows correct member count for single profile', async ({ page }) => {
    await injectState(page, SINGLE_PROFILE_STATE);
    await page.goto('/');
    await navigateToProfile(page);

    const summaryRow = page.locator('[data-testid="family-summary-row"]');
    await expect(summaryRow).toBeVisible({ timeout: 5000 });
    const text = await summaryRow.innerText();
    expect(text).toMatch(/1 family member/);
  });

  test('summary row shows correct member count for multiple profiles', async ({ page }) => {
    await injectState(page, MULTI_PROFILE_STATE);
    await page.goto('/');
    await navigateToProfile(page);

    const summaryRow = page.locator('[data-testid="family-summary-row"]');
    await expect(summaryRow).toBeVisible({ timeout: 5000 });
    const text = await summaryRow.innerText();
    expect(text).toMatch(/3 family members/);
  });
});
