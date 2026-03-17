/**
 * Shared test fixtures for E2E tests.
 *
 * All state injection, profile data, and trip factories live here.
 * Individual test files should import from this module instead of
 * duplicating state definitions.
 */
import type { Page } from '@playwright/test';

// ── Default profile used across most E2E tests ──

export const DEFAULT_PROFILE = {
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
} as const;

export const FAMILY_PROFILES_JSON = JSON.stringify({
  profiles: {
    [DEFAULT_PROFILE.id]: {
      id: DEFAULT_PROFILE.id,
      relationship: 'self',
      isPrimary: true,
      isActive: true,
      biometricEnabled: false,
      createdAt: DEFAULT_PROFILE.createdAt,
      updatedAt: DEFAULT_PROFILE.updatedAt,
      nickname: `${DEFAULT_PROFILE.givenNames.split(' ')[0]} ${DEFAULT_PROFILE.surname}`,
    },
  },
  primaryProfileId: DEFAULT_PROFILE.id,
  maxProfiles: 8,
  version: 1,
  lastModified: DEFAULT_PROFILE.updatedAt,
});

// ── Base state shape for __BORDERLY_STATE__ injection ──

export function baseState(overrides: {
  profiles?: Record<string, any>;
  trips?: any[];
  tripLegs?: Record<string, any[]>;
  mmkv?: Record<string, any>;
  preferences?: Record<string, any>;
} = {}) {
  return {
    preferences: { onboardingComplete: true, ...overrides.preferences },
    mmkv: {
      current_profile_id: DEFAULT_PROFILE.id,
      family_profiles: FAMILY_PROFILES_JSON,
      ...overrides.mmkv,
    },
    profiles: overrides.profiles ?? {
      [DEFAULT_PROFILE.id]: { ...DEFAULT_PROFILE },
    },
    trips: overrides.trips ?? [],
    tripLegs: overrides.tripLegs ?? {},
  };
}

// ── Trip + leg factory for country submission tests ──

export interface CountryTripConfig {
  countryCode: string;
  tripName: string;
  flightNumber: string;
  airlineCode: string;
  arrivalDate: string;
  departureDate: string;
  accommodation: {
    name: string;
    address: {
      street: string;
      city: string;
      country: string;
      postalCode: string;
    };
  };
  /** Override profile nationality (default: USA) */
  profileNationality?: string;
  /** Override profile issuing country (default: USA) */
  profileIssuingCountry?: string;
}

export function countryTripState(config: CountryTripConfig) {
  const tripId = `e2e-trip-${config.countryCode.toLowerCase()}`;
  const legId = `e2e-leg-${config.countryCode.toLowerCase()}`;

  const profile = {
    ...DEFAULT_PROFILE,
    ...(config.profileNationality ? { nationality: config.profileNationality } : {}),
    ...(config.profileIssuingCountry ? { issuingCountry: config.profileIssuingCountry } : {}),
  };

  return baseState({
    profiles: { [DEFAULT_PROFILE.id]: profile },
    trips: [
      {
        id: tripId,
        name: config.tripName,
        status: 'upcoming',
      },
    ],
    tripLegs: {
      [tripId]: [
        {
          id: legId,
          destinationCountry: config.countryCode,
          arrivalDateISO: config.arrivalDate,
          departureDateISO: config.departureDate,
          flightNumber: config.flightNumber,
          airlineCode: config.airlineCode,
          formStatus: 'not_started',
          order: 0,
          accommodation: config.accommodation,
        },
      ],
    },
  });
}

// ── State injection helper ──

export async function injectState(page: Page, state: ReturnType<typeof baseState>) {
  // Serialize the family profiles JSON separately since it's already stringified in mmkv
  const familyProfilesJson = state.mmkv.family_profiles;
  await page.addInitScript((args: { state: any; familyJson: string }) => {
    const s = args.state;
    s.mmkv.family_profiles = args.familyJson;
    (window as any).__BORDERLY_STATE__ = s;
  }, { state, familyJson: familyProfilesJson });
}

// ── Onboarding passport data (for manual onboarding flow tests) ──

export const TEST_PASSPORT = {
  number: 'L12345678',
  surname: 'SMITH',
  givenNames: 'JOHN MICHAEL',
  nationality: 'USA',
  dob: '1985-06-15',
  expiry: '2032-03-20',
  issuingCountry: 'USA',
} as const;
