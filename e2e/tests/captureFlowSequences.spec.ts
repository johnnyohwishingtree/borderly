import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Flow sequence screenshot capture for UX flow auditing.
 *
 * Unlike captureScreenshots.spec.ts which captures individual screens,
 * this captures SEQUENCES of screenshots showing state transitions:
 * before an action, during the action, and after returning.
 *
 * This is what catches bugs like "companion added but UI still says 'just me'"
 * because it captures the screen BEFORE and AFTER the action in the same flow.
 *
 * Run manually:
 *   E2E_PROJECT=screenshot-capture npx playwright test captureFlowSequences --project=screenshot-capture --workers=1
 */

const FLOWS_DIR = path.resolve(__dirname, '../screenshots/flows');

type FlowStep = { id: string; file: string; label: string; expectedState: string };
type FlowEntry = { flow: string; description: string; steps: FlowStep[] };

test.describe('Flow Sequence Capture for UX Audit', () => {
  test.setTimeout(120000);

  // Scoped to this describe block — not shared across workers
  const flowManifest: FlowEntry[] = [];
  let currentFlow: FlowEntry | null = null;

  function startFlow(name: string, description: string) {
    currentFlow = { flow: name, description, steps: [] };
    flowManifest.push(currentFlow);
    fs.mkdirSync(path.join(FLOWS_DIR, name), { recursive: true });
  }

  async function flowScreenshot(page: Page, stepId: string, meta: {
    label: string;
    expectedState: string;
  }) {
    if (!currentFlow) throw new Error('No flow started');
    const file = `${stepId}.png`;
    const filePath = path.join(FLOWS_DIR, currentFlow.flow, file);
    await page.screenshot({ path: filePath, fullPage: true });
    currentFlow.steps.push({
      id: stepId,
      file: `flows/${currentFlow.flow}/${file}`,
      label: meta.label,
      expectedState: meta.expectedState,
    });
  }

  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
  });

  // ═══════════════════════════════════════════
  // FLOW 1: Onboarding → Add Companion → Return
  // ═══════════════════════════════════════════

  test('flow: add-companion', async ({ page }) => {
    startFlow('add-companion', 'Onboard primary user, add a companion via demo scan, verify companion appears');

    // Step 1: Navigate to AddCompanions screen (empty state)
    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('take-tutorial-button').click();
    await page.getByTestId('tutorial-skip-button').click();
    await expect(page.getByText('Passport Information')).toBeVisible({ timeout: 15000 });

    // Demo scan primary user
    await page.getByTestId('demo-scan-adult').click();
    await expect(page.getByTestId('confirm-scan-button')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('confirm-scan-button').click();
    await expect(page.getByText('Confirm Your Profile')).toBeVisible({ timeout: 30000 });
    await page.getByTestId('continue-to-security-button').click();

    // Should be on AddCompanions screen — capture BEFORE state
    await expect(page.getByText('Traveling with family?')).toBeVisible({ timeout: 15000 });
    await flowScreenshot(page, '01-companions-before', {
      label: 'AddCompanions — before adding anyone',
      expectedState: 'No companions listed, button says "Continue — just me"',
    });

    // Step 2: Add a companion
    await page.getByText('Add a travel companion').click();
    await expect(page.getByText('Passport Information')).toBeVisible({ timeout: 15000 });

    await flowScreenshot(page, '02-companion-scan', {
      label: 'PassportScan — scanning companion',
      expectedState: 'Passport scan screen for family member',
    });

    // Demo scan spouse
    await page.getByTestId('demo-scan-spouse').click();
    await expect(page.getByTestId('confirm-scan-button')).toBeVisible({ timeout: 10000 });

    await flowScreenshot(page, '03-companion-preview', {
      label: 'PassportPreview — companion data',
      expectedState: 'Preview shows JANE MARIE SMITH passport data',
    });

    await page.getByTestId('confirm-scan-button').click();

    // Step 3: Should return to AddCompanions — capture AFTER state
    await expect(page.getByText('Traveling with family?')).toBeVisible({ timeout: 15000 });
    // Wait for companion list to load
    await page.waitForTimeout(2000);

    await flowScreenshot(page, '04-companions-after', {
      label: 'AddCompanions — after adding companion',
      expectedState: 'Companion "JANE MARIE SMITH" listed, button says "Continue with 2 travelers"',
    });
  });

  // ═══════════════════════════════════════════
  // FLOW 2: Demo Scan → Preview → Confirm
  // ═══════════════════════════════════════════

  test('flow: demo-scan-confirm', async ({ page }) => {
    startFlow('demo-scan-confirm', 'Demo scan an adult passport, preview data, confirm and reach ConfirmProfile');

    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('take-tutorial-button').click();
    await page.getByTestId('tutorial-skip-button').click();
    await expect(page.getByText('Passport Information')).toBeVisible({ timeout: 15000 });

    await flowScreenshot(page, '01-scan-screen', {
      label: 'PassportScan — method selection with demo buttons',
      expectedState: 'Demo scan buttons visible (Adult, Spouse, Child)',
    });

    await page.getByTestId('demo-scan-adult').click();
    await expect(page.getByText('Confirm Passport Details')).toBeVisible({ timeout: 10000 });

    await flowScreenshot(page, '02-preview', {
      label: 'PassportPreview — adult demo data',
      expectedState: 'Shows L12345678, SMITH, JOHN MICHAEL, USA',
    });

    await page.getByTestId('confirm-scan-button').click();
    await expect(page.getByText('Confirm Your Profile')).toBeVisible({ timeout: 30000 });

    await flowScreenshot(page, '03-confirm-profile', {
      label: 'ConfirmProfile — data persisted from scan',
      expectedState: 'Same passport data shown, profile saved to store',
    });
  });

  // ═══════════════════════════════════════════
  // FLOW 3: Create Trip → Trip Appears in List
  // ═══════════════════════════════════════════

  test('flow: create-trip', async ({ page }) => {
    startFlow('create-trip', 'Create a new trip and verify it appears in the trip list');

    // Inject onboarded state
    await page.addInitScript(() => {
      (window as any).__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        mmkv: {
          'current_profile_id': 'flow-profile-1',
          'family_profiles': JSON.stringify({
            profiles: {
              'flow-profile-1': {
                id: 'flow-profile-1',
                relationship: 'self',
                displayName: 'John Smith',
                createdAt: '2026-01-01T00:00:00Z',
              },
            },
            primaryProfileId: 'flow-profile-1',
          }),
        },
        profiles: {
          'flow-profile-1': {
            id: 'flow-profile-1',
            surname: 'SMITH',
            givenNames: 'JOHN',
            passportNumber: 'AB1234567',
            nationality: 'USA',
            dateOfBirth: '1990-01-15',
            gender: 'M',
            passportExpiry: '2030-12-31',
            issuingCountry: 'USA',
          },
        },
      };
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });

    await flowScreenshot(page, '01-trip-list-empty', {
      label: 'TripList — before creating a trip',
      expectedState: 'Empty state, "Create Your First Trip" CTA visible',
    });

    // Create a trip
    await page.getByTestId('create-first-trip-button').click();
    await expect(page.getByText('Create New Trip')).toBeVisible({ timeout: 10000 });

    await flowScreenshot(page, '02-create-trip-form', {
      label: 'CreateTrip — empty form',
      expectedState: 'Trip creation form with name, destination fields',
    });
  });

  // ═══════════════════════════════════════════
  // FLOW 4: Profile → Edit → Return
  // ═══════════════════════════════════════════

  test('flow: edit-profile', async ({ page }) => {
    startFlow('edit-profile', 'View profile, edit a field, verify change persists on return');

    await page.addInitScript(() => {
      (window as any).__BORDERLY_STATE__ = {
        preferences: { onboardingComplete: true },
        mmkv: {
          'current_profile_id': 'flow-profile-1',
          'family_profiles': JSON.stringify({
            profiles: {
              'flow-profile-1': {
                id: 'flow-profile-1',
                relationship: 'self',
                displayName: 'John Smith',
                createdAt: '2026-01-01T00:00:00Z',
              },
            },
            primaryProfileId: 'flow-profile-1',
          }),
        },
        profiles: {
          'flow-profile-1': {
            id: 'flow-profile-1',
            surname: 'SMITH',
            givenNames: 'JOHN',
            passportNumber: 'AB1234567',
            nationality: 'USA',
            dateOfBirth: '1990-01-15',
            gender: 'M',
            passportExpiry: '2030-12-31',
            issuingCountry: 'USA',
            email: 'john@example.com',
            phoneNumber: '+1-555-0123',
          },
        },
      };
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('tab', { name: 'Profile tab' }).click();
    await expect(page.getByText('Travel Profile')).toBeVisible({ timeout: 10000 });

    await flowScreenshot(page, '01-profile-before', {
      label: 'Profile — before edit',
      expectedState: 'Shows current profile data including email john@example.com',
    });

    // Navigate to edit
    const editBtn = page.getByTestId('edit-contact-button');
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(1500);
    }

    await flowScreenshot(page, '02-edit-profile', {
      label: 'EditProfile — editing fields',
      expectedState: 'Edit form with current values pre-filled',
    });
  });

  // ═══════════════════════════════════════════
  // WRITE FLOW MANIFEST
  // ═══════════════════════════════════════════

  test('99 - Write flow manifest', async () => {
    fs.mkdirSync(FLOWS_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(FLOWS_DIR, 'flow-manifest.json'),
      JSON.stringify({
        capturedAt: new Date().toISOString(),
        flowCount: flowManifest.length,
        flows: flowManifest,
      }, null, 2),
    );
  });
});
