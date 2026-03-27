import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { navigateToAddCompanions } from '../helpers/actions';
import MYS from '../../src/schemas/MYS.json';
import SGP from '../../src/schemas/SGP.json';
import VNM from '../../src/schemas/VNM.json';
import CAN from '../../src/schemas/CAN.json';

/**
 * Screenshot capture test for visual auditing.
 *
 * Run manually with:
 *   E2E_PROJECT=screenshot-capture npx playwright test captureScreenshots --project=screenshot-capture --workers=1
 *
 * Captures screenshots of every screen to colocated __screenshots__/ folders
 * (e.g., src/screens/trips/TripListScreen/__screenshots__/default.png)
 * for use with the /visual-audit and /capture-screens skills.
 *
 * Each test is independent — loads the page fresh with injected state.
 * Must run with --workers=1 (parallel runs cause webpack-dev-server race conditions).
 */

const SRC_SCREENS_DIR = path.resolve(__dirname, '../../src/screens');

// Screen name → domain mapping, built by scanning the folder structure
const SCREEN_DOMAINS: Record<string, string> = {};
for (const domain of fs.readdirSync(SRC_SCREENS_DIR, { withFileTypes: true })) {
  if (!domain.isDirectory()) continue;
  const domainPath = path.join(SRC_SCREENS_DIR, domain.name);
  for (const screen of fs.readdirSync(domainPath, { withFileTypes: true })) {
    if (!screen.isDirectory() || screen.name === '__screenshots__') continue;
    SCREEN_DOMAINS[screen.name] = domain.name;
  }
}

// Per-screen manifest tracking — keyed by screenshotsDir path
const screenManifests: Map<string, {
  screen: string;
  domain: string;
  variants: Array<{ file: string; description: string; state: string }>;
}> = new Map();

async function screenshot(page: Page, variant: string, meta: {
  screen: string;
  domain: string;
  description: string;
  state: string;
}) {
  const screenFolder = meta.screen;
  const domain = SCREEN_DOMAINS[screenFolder] ?? meta.domain;
  const screenshotsDir = path.join(SRC_SCREENS_DIR, domain, screenFolder, '__screenshots__');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const file = `${variant}.png`;
  const screenshotPath = path.join(screenshotsDir, file);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // Accumulate variant into this screen's manifest
  let entry = screenManifests.get(screenshotsDir);
  if (!entry) {
    entry = { screen: screenFolder, domain, variants: [] };
    screenManifests.set(screenshotsDir, entry);
  }
  entry.variants.push({ file, description: meta.description, state: meta.state });
}

// ── State injection helpers ──

function injectOnboardedState(page: Page) {
  return page.addInitScript(() => {
    (window as any).__BORDERLY_STATE__ = {
      preferences: { onboardingComplete: true },
      mmkv: {
        'current_profile_id': 'screenshot-profile-1',
        'family_profiles': JSON.stringify({
          profiles: {
            'screenshot-profile-1': {
              id: 'screenshot-profile-1',
              relationship: 'self',
              displayName: 'John Smith',
              createdAt: '2026-01-01T00:00:00Z',
            },
          },
          primaryProfileId: 'screenshot-profile-1',
        }),
      },
      profiles: {
        'screenshot-profile-1': {
          id: 'screenshot-profile-1',
          surname: 'SMITH',
          givenNames: 'JOHN',
          passportNumber: 'AB1234567',
          nationality: 'USA',
          dateOfBirth: '1990-01-15',
          gender: 'M',
          passportExpiry: '2030-12-31',
          issuingCountry: 'USA',
          email: 'john.smith@example.com',
          phoneNumber: '+1-555-0123',
          occupation: 'Software Engineer',
          homeAddress: {
            line1: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            postalCode: '94102',
            country: 'USA',
          },
        },
      },
    };
  });
}

function injectStateWithTrip(page: Page) {
  return page.addInitScript(() => {
    (window as any).__BORDERLY_STATE__ = {
      preferences: { onboardingComplete: true },
      mmkv: {
        'current_profile_id': 'screenshot-profile-1',
        'family_profiles': JSON.stringify({
          profiles: {
            'screenshot-profile-1': {
              id: 'screenshot-profile-1',
              relationship: 'self',
              displayName: 'John Smith',
              createdAt: '2026-01-01T00:00:00Z',
            },
            'screenshot-profile-2': {
              id: 'screenshot-profile-2',
              relationship: 'spouse',
              displayName: 'Jane Smith',
              createdAt: '2026-01-01T00:00:00Z',
            },
          },
          primaryProfileId: 'screenshot-profile-1',
        }),
      },
      profiles: {
        'screenshot-profile-1': {
          id: 'screenshot-profile-1',
          surname: 'SMITH',
          givenNames: 'JOHN',
          passportNumber: 'AB1234567',
          nationality: 'USA',
          dateOfBirth: '1990-01-15',
          gender: 'M',
          passportExpiry: '2030-12-31',
          issuingCountry: 'USA',
          email: 'john.smith@example.com',
          phoneNumber: '+1-555-0123',
          occupation: 'Software Engineer',
        },
        'screenshot-profile-2': {
          id: 'screenshot-profile-2',
          surname: 'SMITH',
          givenNames: 'JANE',
          passportNumber: 'CD9876543',
          nationality: 'USA',
          dateOfBirth: '1992-05-20',
          gender: 'F',
          passportExpiry: '2031-06-15',
          issuingCountry: 'USA',
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
  });
}


function injectStateWithMultiCountryTrip(page: Page) {
  return page.addInitScript(() => {
    (window as any).__BORDERLY_STATE__ = {
      preferences: { onboardingComplete: true },
      mmkv: {
        'current_profile_id': 'screenshot-profile-1',
        'family_profiles': JSON.stringify({
          profiles: {
            'screenshot-profile-1': {
              id: 'screenshot-profile-1',
              relationship: 'self',
              displayName: 'John Smith',
              createdAt: '2026-01-01T00:00:00Z',
            },
            'screenshot-profile-2': {
              id: 'screenshot-profile-2',
              relationship: 'spouse',
              displayName: 'Jane Smith',
              createdAt: '2026-01-01T00:00:00Z',
            },
          },
          primaryProfileId: 'screenshot-profile-1',
        }),
      },
      profiles: {
        'screenshot-profile-1': {
          id: 'screenshot-profile-1',
          surname: 'SMITH',
          givenNames: 'JOHN',
          passportNumber: 'AB1234567',
          nationality: 'USA',
          dateOfBirth: '1990-01-15',
          gender: 'M',
          passportExpiry: '2030-12-31',
          issuingCountry: 'USA',
          email: 'john.smith@example.com',
          phoneNumber: '+1-555-0123',
          occupation: 'Software Engineer',
        },
        'screenshot-profile-2': {
          id: 'screenshot-profile-2',
          surname: 'SMITH',
          givenNames: 'JANE',
          passportNumber: 'CD9876543',
          nationality: 'USA',
          dateOfBirth: '1992-05-20',
          gender: 'F',
          passportExpiry: '2031-06-15',
          issuingCountry: 'USA',
        },
      },
      trips: [
        {
          id: 'trip-multi',
          name: 'Southeast Asia + Canada 2026',
          status: 'upcoming',
        },
      ],
      tripLegs: {
        'trip-multi': [
          {
            id: 'leg-mys',
            destinationCountry: 'MYS',
            arrivalDateISO: '2026-08-01',
            departureDateISO: '2026-08-05',
            flightNumber: 'MH88',
            airlineCode: 'MH',
            arrivalAirport: 'KUL',
            formStatus: 'not_started',
            order: 0,
            accommodation: {
              name: 'Mandarin Oriental KL',
              address: {
                street: 'Kuala Lumpur City Centre',
                city: 'Kuala Lumpur',
                country: 'MYS',
                postalCode: '50088',
              },
            },
          },
          {
            id: 'leg-sgp',
            destinationCountry: 'SGP',
            arrivalDateISO: '2026-08-05',
            departureDateISO: '2026-08-09',
            flightNumber: 'SQ119',
            airlineCode: 'SQ',
            arrivalAirport: 'SIN',
            formStatus: 'not_started',
            order: 1,
            accommodation: {
              name: 'Marina Bay Sands',
              address: {
                street: '10 Bayfront Avenue',
                city: 'Singapore',
                country: 'SGP',
                postalCode: '018956',
              },
            },
          },
          {
            id: 'leg-vnm',
            destinationCountry: 'VNM',
            arrivalDateISO: '2026-08-09',
            departureDateISO: '2026-08-14',
            flightNumber: 'VN300',
            airlineCode: 'VN',
            arrivalAirport: 'SGN',
            formStatus: 'not_started',
            order: 2,
            accommodation: {
              name: 'Park Hyatt Saigon',
              address: {
                street: '2 Lam Son Square',
                city: 'Ho Chi Minh City',
                country: 'VNM',
                postalCode: '700000',
              },
            },
          },
          {
            id: 'leg-can',
            destinationCountry: 'CAN',
            arrivalDateISO: '2026-09-01',
            departureDateISO: '2026-09-07',
            flightNumber: 'AC34',
            airlineCode: 'AC',
            arrivalAirport: 'YVR',
            formStatus: 'not_started',
            order: 3,
            accommodation: {
              name: 'Fairmont Pacific Rim',
              address: {
                street: '1038 Canada Place',
                city: 'Vancouver',
                country: 'CAN',
                postalCode: 'V6C 0B9',
              },
            },
          },
        ],
      },
    };
  });
}

test.describe('Screenshot Capture for Visual Audit', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
  });

  // ═══════════════════════════════════════════
  // ONBOARDING SCREENS
  // ═══════════════════════════════════════════

  test('01 - Welcome Screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 15000 });
    await screenshot(page, 'default', {
      screen: 'WelcomeScreen',
      domain: 'onboarding',
      description: 'First screen shown to new users. App intro with Get Started button.',
      state: 'Fresh install, no profile',
    });
  });

  test('02 - Tutorial Screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /get started|take.*tutorial/i }).click();
    await page.waitForTimeout(1500);
    await screenshot(page, 'default', {
      screen: 'TutorialScreen',
      domain: 'onboarding',
      description: 'Streamlined 3-slide tutorial: core value prop, privacy/security, passport scan CTA.',
      state: 'After clicking Get Started from Welcome',
    });
  });

  test('03 - Passport Scan Method Selection', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await expect(page.getByText(/Quick Passport Scan/)).toBeVisible({ timeout: 10000 });
    await screenshot(page, 'method-selection', {
      screen: 'PassportScanScreen',
      domain: 'onboarding',
      description: 'Choose between camera scan or manual passport entry. Shows MRZ explanation.',
      state: 'After skipping tutorial, mode=method',
    });
  });

  test('04 - Passport Manual Entry Form (empty)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await expect(page.getByText(/Quick Passport Scan/)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Or enter manually' }).click();
    await expect(page.getByText('Passport Details')).toBeVisible({ timeout: 5000 });
    await screenshot(page, 'manual-entry-empty', {
      screen: 'PassportScanScreen',
      domain: 'onboarding',
      description: 'Manual passport entry form with all fields empty.',
      state: 'After clicking Or enter manually, mode=manual, form empty',
    });
  });

  test('05 - Passport Manual Entry Form (filled)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await expect(page.getByText(/Quick Passport Scan/)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Or enter manually' }).click();
    await expect(page.getByText('Passport Details')).toBeVisible({ timeout: 5000 });

    await page.getByTestId('passport-number-field').fill('AB1234567');
    await page.getByTestId('surname-field').fill('SMITH');
    await page.getByTestId('given-names-field').fill('JOHN');
    await page.getByTestId('nationality-field-trigger').click();
    await page.getByTestId('nationality-field-search').fill('United States');
    await page.getByTestId('nationality-field-option-USA').click();
    await page.getByTestId('dob-field').fill('1990-01-15');
    await page.getByTestId('gender-Male-button').click();
    await page.getByTestId('passport-expiry-field').fill('2030-12-31');
    await page.getByTestId('issuing-country-field-trigger').click();
    await page.getByTestId('issuing-country-field-search').fill('United States');
    await page.getByTestId('issuing-country-field-option-USA').click();
    await screenshot(page, 'manual-entry-filled', {
      screen: 'PassportScanScreen',
      domain: 'onboarding',
      description: 'Manual passport entry form with all fields filled in.',
      state: 'After filling all passport fields, mode=manual, form complete',
    });
  });

  test('06 - Confirm Profile Screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await expect(page.getByText(/Quick Passport Scan/)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Or enter manually' }).click();

    await page.getByTestId('passport-number-field').fill('AB1234567');
    await page.getByTestId('surname-field').fill('SMITH');
    await page.getByTestId('given-names-field').fill('JOHN');
    await page.getByTestId('nationality-field-trigger').click();
    await page.getByTestId('nationality-field-search').fill('United States');
    await page.getByTestId('nationality-field-option-USA').click();
    await page.getByTestId('dob-field').fill('1990-01-15');
    await page.getByTestId('gender-Male-button').click();
    await page.getByTestId('passport-expiry-field').fill('2030-12-31');
    await page.getByTestId('issuing-country-field-trigger').click();
    await page.getByTestId('issuing-country-field-search').fill('United States');
    await page.getByTestId('issuing-country-field-option-USA').click();

    await page.getByTestId('passport-continue-button').click();
    await expect(page.getByText('Confirm Your Profile')).toBeVisible({ timeout: 10000 });
    await screenshot(page, 'default', {
      screen: 'ConfirmProfileScreen',
      domain: 'onboarding',
      description: 'Profile confirmation screen showing all parsed passport data for review.',
      state: 'After completing passport form, reviewing data before saving',
    });
  });

  test('07 - Add Companions Screen (empty)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await expect(page.getByText(/Quick Passport Scan/)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Or enter manually' }).click();

    await page.getByTestId('passport-number-field').fill('AB1234567');
    await page.getByTestId('surname-field').fill('SMITH');
    await page.getByTestId('given-names-field').fill('JOHN');
    await page.getByTestId('nationality-field-trigger').click();
    await page.getByTestId('nationality-field-search').fill('United States');
    await page.getByTestId('nationality-field-option-USA').click();
    await page.getByTestId('dob-field').fill('1990-01-15');
    await page.getByTestId('gender-Male-button').click();
    await page.getByTestId('passport-expiry-field').fill('2030-12-31');
    await page.getByTestId('issuing-country-field-trigger').click();
    await page.getByTestId('issuing-country-field-search').fill('United States');
    await page.getByTestId('issuing-country-field-option-USA').click();

    await page.getByTestId('passport-continue-button').click();
    await expect(page.getByText('Confirm Your Profile')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('continue-to-security-button').click();
    await expect(page.getByTestId('add-companions-title')).toBeVisible({ timeout: 10000 });
    await screenshot(page, 'default', {
      screen: 'AddCompanionsScreen',
      domain: 'onboarding',
      description: 'Add travel companions screen — empty state with CTA to scan family passports.',
      state: 'After confirming profile, no companions added yet',
    });
  });

  test('08 - Biometric Setup Screen', async ({ page }) => {
    await navigateToAddCompanions(page);
    await page.getByTestId('companions-continue-button').click();
    await expect(page.getByText('Secure Your Profile')).toBeVisible({ timeout: 5000 });
    await screenshot(page, 'default', {
      screen: 'BiometricSetupScreen',
      domain: 'onboarding',
      description: 'Biometric authentication setup — enable Face ID/Touch ID or skip.',
      state: 'After skipping companions, before completing onboarding',
    });
  });

  // ═══════════════════════════════════════════
  // TRIPS TAB
  // ═══════════════════════════════════════════

  test('09 - Trip List (empty)', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await screenshot(page, 'empty', {
      screen: 'TripListScreen',
      domain: 'trips',
      description: 'Empty trip list with "Create Your First Trip" CTA.',
      state: 'Onboarded, no trips created',
    });
  });

  test('10 - Create Trip Screen', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.getByTestId('create-first-trip-button').click();
    await expect(page.getByText('Create New Trip')).toBeVisible({ timeout: 10000 });
    await screenshot(page, 'default', {
      screen: 'CreateTripScreen',
      domain: 'trips',
      description: 'Trip creation form — name, destinations, dates, flight info, accommodation.',
      state: 'Onboarded, creating first trip, form empty',
    });
  });

  test('11 - Trip List (with trip)', async ({ page }) => {
    await injectStateWithTrip(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    await screenshot(page, 'with-trip', {
      screen: 'TripListScreen',
      domain: 'trips',
      description: 'Trip list showing a trip card with destination flags and status.',
      state: 'Onboarded, one trip to Japan exists',
    });
  });

  test('12 - Trip Detail Screen', async ({ page }) => {
    await injectStateWithTrip(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);
    // Click on the trip card
    const tripCard = page.getByText('Asia Summer 2026');
    if (await tripCard.isVisible()) {
      await tripCard.click();
      await page.waitForTimeout(2000);
    }
    await screenshot(page, 'default', {
      screen: 'TripDetailScreen',
      domain: 'trips',
      description: 'Trip detail with itinerary legs, form status, and submission actions.',
      state: 'Viewing Japan trip with one leg',
    });
  });

  test('13 - Leg Form Screen', async ({ page }) => {
    await injectStateWithTrip(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);
    // Navigate: Trip List → Trip Detail → Leg Form
    const tripCard = page.getByText('Asia Summer 2026');
    if (await tripCard.isVisible()) {
      await tripCard.click();
      await page.waitForTimeout(1500);
      const legCard = page.getByTestId('leg-card-JPN');
      if (await legCard.isVisible()) {
        await legCard.click();
        await page.waitForTimeout(2000);
      }
    }
    await screenshot(page, 'default', {
      screen: 'LegFormScreen',
      domain: 'trips',
      description: 'Country-specific form (Japan) with auto-filled fields and remaining questions.',
      state: 'Viewing Japan leg form with profile auto-fill applied',
    });
  });

  test('14 - Submission Guide Screen', async ({ page }) => {
    await injectStateWithTrip(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);
    // Use imperative navigation — the Guide button only appears when form
    // isValid, which requires complex form state. Direct navigation bypasses this.
    await page.evaluate(() => {
      const navRef = (window as any).__navigationRef;
      if (navRef?.isReady()) {
        navRef.navigate('Trips', {
          screen: 'SubmissionGuide',
          params: {
            tripId: 'trip-japan',
            legId: 'leg-jpn',
            countryCode: 'JPN',
          },
        });
      }
    });
    await page.waitForTimeout(3000);
    await screenshot(page, 'default', {
      screen: 'SubmissionGuideScreen',
      domain: 'trips',
      description: 'Step-by-step portal walkthrough with pre-filled values ready to copy/paste.',
      state: 'Viewing Japan submission guide via imperative navigation',
    });
  });

  test('15 - Portal Submission Screen', async ({ page }) => {
    await injectStateWithTrip(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);
    // Use imperative navigation since we need route params
    await page.evaluate(() => {
      const navRef = (window as any).__navigationRef;
      if (navRef?.isReady()) {
        navRef.navigate('Trips', {
          screen: 'PortalSubmission',
          params: {
            url: 'https://www.vjw.digital.go.jp/',
            countryCode: 'JPN',
            tripId: 'trip-japan',
            legId: 'leg-jpn',
          },
        });
      }
    });
    // Wait for screen to render (iframe will fail but chrome will show)
    await page.waitForTimeout(3000);
    await screenshot(page, 'default', {
      screen: 'PortalSubmissionScreen',
      domain: 'trips',
      description: 'Portal submission screen with WebView, toolbar, progress bar, and copy-paste fields panel.',
      state: 'Viewing Visit Japan Web portal (iframe blocked, showing Borderly UI chrome)',
    });
  });

  // ═══════════════════════════════════════════
  // WALLET TAB
  // ═══════════════════════════════════════════

  test('16 - Wallet Screen (empty)', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('tab', { name: 'QR Wallet tab' }).click();
    // Wait for actual screen content (not just navigator header)
    await expect(page.getByText('No QR codes saved')).toBeVisible({ timeout: 10000 });
    await screenshot(page, 'default', {
      screen: 'QRWalletScreen',
      domain: 'wallet',
      description: 'Empty QR wallet with "Add QR Code" button. For storing submission QR codes.',
      state: 'Onboarded, no QR codes saved',
    });
  });

  test('17 - Add QR Screen', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('tab', { name: 'QR Wallet tab' }).click();
    // Wait for actual screen content
    await expect(page.getByText('No QR codes saved')).toBeVisible({ timeout: 10000 });
    // Click the Add QR Code button (use last — the CTA button, not the FAB)
    await page.getByRole('button', { name: 'Add QR Code' }).last().click();
    await page.waitForTimeout(1500);
    await screenshot(page, 'default', {
      screen: 'AddQRScreen',
      domain: 'wallet',
      description: 'Add QR code screen — scan or import QR from camera/gallery.',
      state: 'Adding a new QR code to wallet',
    });
  });

  test('18 - QR Detail Screen', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('tab', { name: 'QR Wallet tab' }).click();
    await expect(page.getByText('No QR codes saved')).toBeVisible({ timeout: 10000 });
    // Navigate to QR Detail with a fake ID — will show the not-found state
    await page.evaluate(() => {
      const navRef = (window as any).__navigationRef;
      if (navRef?.isReady()) {
        navRef.navigate('Wallet', {
          screen: 'QRDetail',
          params: { qrCodeId: 'screenshot-qr-1' },
        });
      }
    });
    await page.waitForTimeout(2000);
    await screenshot(page, 'default', {
      screen: 'QRDetailScreen',
      domain: 'wallet',
      description: 'QR code detail view — shows not-found state (no QR codes in E2E database).',
      state: 'Navigated to QR detail with non-existent ID',
    });
  });

  // ═══════════════════════════════════════════
  // PROFILE TAB
  // ═══════════════════════════════════════════

  test('19 - Profile Screen', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('tab', { name: 'Profile tab' }).click();
    await expect(page.getByText('Travel Profile')).toBeVisible({ timeout: 10000 });
    await screenshot(page, 'default', {
      screen: 'ProfileScreen',
      domain: 'profile',
      description: 'Profile overview — passport info (masked), completeness, contact details, family.',
      state: 'Onboarded with full profile data',
    });
  });

  test('20 - Edit Profile Screen', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('tab', { name: 'Profile tab' }).click();
    await expect(page.getByText('Travel Profile')).toBeVisible({ timeout: 10000 });
    // Click Edit Contact button
    const editBtn = page.getByTestId('edit-contact-button');
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(1500);
    }
    await screenshot(page, 'default', {
      screen: 'EditProfileScreen',
      domain: 'profile',
      description: 'Edit profile form — contact info, home address, default declarations.',
      state: 'Editing existing profile',
    });
  });

  test('21 - Family Management Screen', async ({ page }) => {
    await injectStateWithTrip(page); // Has 2 family members
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('tab', { name: 'Profile tab' }).click();
    await expect(page.getByText('Travel Profile')).toBeVisible({ timeout: 10000 });
    const familyBtn = page.getByTestId('family-summary-row');
    if (await familyBtn.isVisible()) {
      await familyBtn.click();
      await page.waitForTimeout(1500);
    }
    await screenshot(page, 'default', {
      screen: 'FamilyManagementScreen',
      domain: 'profile',
      description: 'Family member list with primary profile and spouse. Add/remove members.',
      state: '2 family members (self + spouse)',
    });
  });

  test('22 - Add Family Member Screen', async ({ page }) => {
    await injectStateWithTrip(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('tab', { name: 'Profile tab' }).click();
    await expect(page.getByText('Travel Profile')).toBeVisible({ timeout: 10000 });
    const familyBtn = page.getByTestId('family-summary-row');
    if (await familyBtn.isVisible()) {
      await familyBtn.click();
      await page.waitForTimeout(1500);
    }
    const addBtn = page.getByTestId('add-member-button');
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(1500);
    }
    await screenshot(page, 'default', {
      screen: 'AddFamilyMemberScreen',
      domain: 'profile',
      description: 'Add family member — select relationship, scan or enter passport manually.',
      state: 'Adding a new family member from Family Management',
    });
  });

  // ═══════════════════════════════════════════
  // SETTINGS TAB
  // ═══════════════════════════════════════════

  test('23 - Settings Screen', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('tab', { name: 'Settings tab' }).click();
    // Wait for actual screen content (not just navigator header)
    await expect(page.getByText('Security & Privacy')).toBeVisible({ timeout: 10000 });
    await screenshot(page, 'default', {
      screen: 'SettingsScreen',
      domain: 'settings',
      description: 'App settings — security, privacy, portal accounts, data management, help links.',
      state: 'Onboarded, default settings',
    });
  });

  test('24 - Help Screen', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('tab', { name: 'Settings tab' }).click();
    await expect(page.getByText('Security & Privacy')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Help & FAQ' }).click();
    await page.waitForTimeout(1500);
    await screenshot(page, 'default', {
      screen: 'HelpScreen',
      domain: 'settings',
      description: 'Help & support hub — FAQ categories, troubleshooting, contact options.',
      state: 'Navigated from Settings',
    });
  });

  test('25 - FAQ Screen', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('tab', { name: 'Settings tab' }).click();
    await expect(page.getByText('Security & Privacy')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Help & FAQ' }).click();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Frequently Asked Questions' }).click();
    await page.waitForTimeout(1500);
    await screenshot(page, 'default', {
      screen: 'FAQScreen',
      domain: 'settings',
      description: 'FAQ screen with searchable questions organized by category.',
      state: 'Navigated from Help screen',
    });
  });

  test('26 - Troubleshooting Screen', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('tab', { name: 'Settings tab' }).click();
    await expect(page.getByText('Security & Privacy')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Help & FAQ' }).click();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Troubleshooting Guide' }).click();
    await page.waitForTimeout(1500);
    await screenshot(page, 'default', {
      screen: 'TroubleshootingScreen',
      domain: 'settings',
      description: 'Troubleshooting guide with common issues, symptoms, and solutions.',
      state: 'Navigated from Help screen',
    });
  });

  test('27 - Feedback Screen', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('tab', { name: 'Settings tab' }).click();
    await expect(page.getByText('Security & Privacy')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Send Feedback' }).click();
    await page.waitForTimeout(1500);
    await screenshot(page, 'default', {
      screen: 'FeedbackScreen',
      domain: 'settings',
      description: 'Feedback form — rating, category, message text for user feedback.',
      state: 'Navigated from Settings',
    });
  });

  test('28 - Bug Report Screen', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('tab', { name: 'Settings tab' }).click();
    await expect(page.getByText('Security & Privacy')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Report Bug' }).click();
    await page.waitForTimeout(1500);
    await screenshot(page, 'default', {
      screen: 'BugReportScreen',
      domain: 'settings',
      description: 'Bug report form with auto-collected diagnostics (device, OS, app version).',
      state: 'Navigated from Settings',
    });
  });

  test('29 - Privacy Policy Screen', async ({ page }) => {
    await injectOnboardedState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('tab', { name: 'Settings tab' }).click();
    await expect(page.getByText('Security & Privacy')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Privacy Policy' }).click();
    await page.waitForTimeout(1500);
    await screenshot(page, 'default', {
      screen: 'PrivacyPolicyScreen',
      domain: 'settings',
      description: 'Privacy policy — data handling, local-first architecture, security details.',
      state: 'Navigated from Settings',
    });
  });

  // ═══════════════════════════════════════════
  // PORTAL SCREENS — NO-ACCOUNT COUNTRIES
  // ═══════════════════════════════════════════

  // Load portal URLs from schema files (single source of truth)
  const portalUrlMap: Record<string, string> = {
    MYS: MYS.portalUrl,
    SGP: SGP.portalUrl,
    VNM: VNM.portalUrl,
    CAN: CAN.portalUrl,
  };

  const portalCountries = [
    { code: 'MYS', legId: 'leg-mys', name: 'Malaysia MDAC' },
    { code: 'SGP', legId: 'leg-sgp', name: 'Singapore SG Arrival Card' },
    { code: 'VNM', legId: 'leg-vnm', name: 'Vietnam e-Visa' },
    { code: 'CAN', legId: 'leg-can', name: 'Canada eTA' },
  ];

  for (const country of portalCountries) {
    test(`Submission Guide (${country.code})`, async ({ page }) => {
      await injectStateWithMultiCountryTrip(page);
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(1000);
      await page.evaluate(({ code, legId }) => {
        const navRef = (window as any).__navigationRef;
        if (navRef?.isReady()) {
          navRef.navigate('Trips', {
            screen: 'SubmissionGuide',
            params: { tripId: 'trip-multi', legId, countryCode: code },
          });
        }
      }, { code: country.code, legId: country.legId });
      await page.waitForTimeout(3000);
      await screenshot(page, country.code.toLowerCase(), {
        screen: 'SubmissionGuideScreen',
        domain: 'trips',
        description: `${country.name} submission guide with step-by-step portal walkthrough.`,
        state: `Viewing ${country.code} submission guide via imperative navigation`,
      });
    });

    test(`Portal Submission (${country.code})`, async ({ page }) => {
      await injectStateWithMultiCountryTrip(page);
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(1000);
      await page.evaluate(({ code, legId, urlMap }) => {
        const navRef = (window as any).__navigationRef;
        if (navRef?.isReady()) {
          navRef.navigate('Trips', {
            screen: 'PortalSubmission',
            params: {
              url: urlMap[code],
              countryCode: code,
              tripId: 'trip-multi',
              legId,
            },
          });
        }
      }, { code: country.code, legId: country.legId, urlMap: portalUrlMap });
      await page.waitForTimeout(3000);
      await screenshot(page, country.code.toLowerCase(), {
        screen: 'PortalSubmissionScreen',
        domain: 'trips',
        description: `${country.name} portal submission screen with WebView and Borderly toolbar.`,
        state: `Viewing ${country.code} portal (iframe blocked, showing Borderly UI chrome)`,
      });
    });
  }

  // ═══════════════════════════════════════════
  // WRITE PER-SCREEN MANIFESTS
  // ═══════════════════════════════════════════

  test('99 - Write per-screen manifests', async () => {
    const capturedAt = new Date().toISOString();
    for (const [dir, entry] of screenManifests) {
      const content = {
        screen: entry.screen,
        domain: entry.domain,
        capturedAt,
        variants: entry.variants,
      };
      fs.writeFileSync(
        path.join(dir, 'manifest.json'),
        JSON.stringify(content, null, 2) + '\n',
      );
    }
  });
});
