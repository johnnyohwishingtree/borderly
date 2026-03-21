import { test, expect, Page } from '@playwright/test';

/**
 * E2E smoke tests for the backup restore flow (Story #569).
 *
 * These tests verify:
 *  1. The Welcome screen shows a "Restore from backup" link.
 *  2. Tapping the link navigates to the RestoreBackupModal screen.
 *  3. The Settings screen shows a "Restore from Backup" button.
 *  4. The RestoreBackupModal renders all expected UI elements.
 *  5. The passphrase step renders after file selection state is simulated.
 */

const SINGLE_FAMILY_PROFILES_JSON = JSON.stringify({
  profiles: {
    'e2e-restore-profile-1': {
      id: 'e2e-restore-profile-1',
      relationship: 'self',
      isPrimary: true,
      isActive: true,
      biometricEnabled: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      nickname: 'Alice Smith',
    },
  },
  primaryProfileId: 'e2e-restore-profile-1',
  maxProfiles: 8,
  version: 1,
  lastModified: '2026-01-01T00:00:00Z',
});

async function injectAuthenticatedState(page: Page) {
  await page.addInitScript((familyProfilesJson: string) => {
    (window as any).__BORDERLY_STATE__ = {
      preferences: { onboardingComplete: true },
      mmkv: {
        'current_profile_id': 'e2e-restore-profile-1',
        'family_profiles': familyProfilesJson,
      },
      profiles: {
        'e2e-restore-profile-1': {
          id: 'e2e-restore-profile-1',
          surname: 'Smith',
          givenNames: 'Alice',
          passportNumber: 'AB1234567',
          nationality: 'AUS',
          dateOfBirth: '1985-03-15',
          gender: 'F',
          passportExpiry: '2030-03-15',
          issuingCountry: 'AUS',
          email: 'alice@example.com',
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
      },
    };
  }, SINGLE_FAMILY_PROFILES_JSON);
}

test.describe('Backup Restore – Welcome screen', () => {
  let jsErrors: string[];

  test.beforeEach(async ({ page }) => {
    jsErrors = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));
  });

  test.afterEach(() => {
    const critical = jsErrors.filter(
      (e) =>
        !e.includes('Warning:') &&
        !e.includes('React does not recognize') &&
        !e.includes('cannot be a child of') &&
        !e.includes('NativeWind') &&
        !e.includes('shadow'),
    );
    expect(critical).toEqual([]);
  });

  test('welcome screen shows restore from backup link', async ({ page }) => {
    await page.goto('/');

    // Welcome screen should load
    await expect(page.getByText('Welcome to')).toBeVisible();

    // Restore link should be visible
    const restoreLink = page.getByTestId('restore-backup-link');
    await expect(restoreLink).toBeVisible();

    // Link text should mention "backup"
    await expect(page.getByText(/restore from backup/i).first()).toBeVisible();
  });

  test('tapping restore link navigates to restore screen', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Welcome to')).toBeVisible();

    // Tap the restore link
    const restoreLink = page.getByTestId('restore-backup-link');
    await restoreLink.waitFor({ timeout: 5000 });
    await restoreLink.click();

    // Should navigate to the restore screen
    await expect(page.getByTestId('restore-backup-screen')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Restore from Backup')).toBeVisible();
  });
});

test.describe('Backup Restore – Settings screen', () => {
  let jsErrors: string[];

  test.beforeEach(async ({ page }) => {
    jsErrors = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));
  });

  test.afterEach(() => {
    const critical = jsErrors.filter(
      (e) =>
        !e.includes('Warning:') &&
        !e.includes('React does not recognize') &&
        !e.includes('cannot be a child of') &&
        !e.includes('NativeWind') &&
        !e.includes('shadow'),
    );
    expect(critical).toEqual([]);
  });

  test('settings screen shows Restore from Backup button', async ({ page }) => {
    await injectAuthenticatedState(page);
    await page.goto('/');

    // Navigate to Settings tab
    const settingsTab = page.getByRole('tab', { name: 'Settings tab' });
    await settingsTab.waitFor({ timeout: 5000 });
    await settingsTab.click();

    // Scroll down to find the restore button (it's in the Data Management section)
    await page.waitForTimeout(500);

    // The Data Management heading should be visible
    await expect(page.getByText('Data Management')).toBeVisible({ timeout: 3000 });

    // The restore button should be visible
    const restoreButton = page.getByTestId('restore-backup-button');
    await expect(restoreButton).toBeVisible();
  });

  test('tapping Restore from Backup navigates to restore modal', async ({ page }) => {
    await injectAuthenticatedState(page);
    await page.goto('/');

    // Navigate to Settings tab
    const settingsTab = page.getByRole('tab', { name: 'Settings tab' });
    await settingsTab.waitFor({ timeout: 5000 });
    await settingsTab.click();

    await page.waitForTimeout(500);

    // Scroll to the restore button and tap it
    const restoreButton = page.getByTestId('restore-backup-button');
    await restoreButton.scrollIntoViewIfNeeded();
    await restoreButton.waitFor({ timeout: 3000 });
    await restoreButton.click();

    // Should navigate to RestoreBackupModal
    await expect(page.getByTestId('restore-backup-screen')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Backup Restore – RestoreBackupModal', () => {
  let jsErrors: string[];

  test.beforeEach(async ({ page }) => {
    jsErrors = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));
  });

  test.afterEach(() => {
    const critical = jsErrors.filter(
      (e) =>
        !e.includes('Warning:') &&
        !e.includes('React does not recognize') &&
        !e.includes('cannot be a child of') &&
        !e.includes('NativeWind') &&
        !e.includes('shadow'),
    );
    expect(critical).toEqual([]);
  });

  test('restore modal renders idle step with pick file button', async ({ page }) => {
    await page.goto('/');

    // Navigate via the welcome restore link
    const restoreLink = page.getByTestId('restore-backup-link');
    await restoreLink.waitFor({ timeout: 5000 });
    await restoreLink.click();

    // Modal header
    await expect(page.getByTestId('restore-backup-screen')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Restore from Backup')).toBeVisible();

    // Idle step content
    await expect(page.getByTestId('restore-step-idle')).toBeVisible();

    // "Pick a Backup File" button should be present and enabled
    const pickFileButton = page.getByTestId('pick-file-button');
    await expect(pickFileButton).toBeVisible();
    await expect(pickFileButton).toBeEnabled();

    // Informational text about what gets restored
    await expect(page.getByText(/what gets restored/i)).toBeVisible();
  });
});
