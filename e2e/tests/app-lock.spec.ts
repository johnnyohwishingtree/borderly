/**
 * E2E smoke tests for the App Lock gate (Story #674).
 *
 * Verifies:
 * - LockScreen renders when isAppLocked is true and onboarding is complete
 * - LockScreen is NOT shown during onboarding (isOnboardingComplete false)
 * - LockScreen is NOT shown on first launch (fresh install, no injected state)
 * - After unlock (isAppLocked → false), the normal navigation tree reappears
 */

import { test, expect, type Page } from '@playwright/test';
import { baseState, injectState } from '../helpers/fixtures';

// ---------------------------------------------------------------------------
// Helper: wait for the app store to be exposed on window, then lock the app
// ---------------------------------------------------------------------------

async function lockApp(page: Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as any).__borderlyAppStore?.getState === 'function',
    { timeout: 10000 },
  );
  await page.evaluate(() => {
    (window as any).__borderlyAppStore.setState({ isAppLocked: true });
  });
}

async function unlockApp(page: Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as any).__borderlyAppStore?.getState === 'function',
    { timeout: 10000 },
  );
  await page.evaluate(() => {
    (window as any).__borderlyAppStore.setState({ isAppLocked: false });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('App Lock — LockScreen visibility', () => {
  test('LockScreen renders when app is locked after onboarding', async ({ page }) => {
    // Inject authenticated state (onboarding complete, profile present)
    await injectState(page, baseState());
    await page.goto('/');

    // Wait for the main app to load (Trips tab visible)
    await expect(page.getByText('My Trips')).toBeVisible({ timeout: 10000 });

    // Programmatically lock the app
    await lockApp(page);

    // LockScreen overlay should now be visible
    await expect(page.getByTestId('lock-screen')).toBeVisible({ timeout: 5000 });

    // The lock screen should show "Borderly Locked"
    await expect(page.getByText('Borderly Locked')).toBeVisible();

    // Unlock button should be present
    await expect(page.getByTestId('lock-screen-biometric-button')).toBeVisible();
  });

  test('LockScreen does NOT show during onboarding (fresh install)', async ({ page }) => {
    // No injected state — fresh install, onboarding not complete
    await page.goto('/');

    // Welcome screen should be visible (onboarding in progress)
    await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 10000 });

    // Programmatically set isAppLocked to true — should have no visual effect
    // because isOnboardingComplete is false
    await lockApp(page);

    // Lock screen should NOT appear — onboarding gate prevents it
    await expect(page.getByTestId('lock-screen')).not.toBeVisible();

    // Welcome screen should still be visible
    await expect(page.getByText('Welcome to')).toBeVisible();
  });

  test('Normal navigation reappears after unlock', async ({ page }) => {
    await injectState(page, baseState());
    await page.goto('/');

    // Wait for the main app
    await expect(page.getByText('My Trips')).toBeVisible({ timeout: 10000 });

    // Lock → verify LockScreen
    await lockApp(page);
    await expect(page.getByTestId('lock-screen')).toBeVisible({ timeout: 5000 });

    // Unlock → LockScreen should disappear and navigation reappear
    await unlockApp(page);
    await expect(page.getByTestId('lock-screen')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('My Trips')).toBeVisible();
  });
});
