/**
 * Tests for DocumentValidityService
 *
 * Acceptance criteria covered:
 *  1. Returns isValid=true when passport is valid beyond required buffer
 *  2. Returns isValid=false with correct shortfallDays when passport expires too soon
 *  3. Handles already-expired passports (daysUntilExpiry < 0)
 *  4. Handles departure date in the past
 *  5. Handles leap year month arithmetic (Feb 29 → Feb 28 in non-leap year)
 *  6. requiredValidityDays reflects the country's passportValidityMonths
 *  7. Schema without passportValidityMonths → 0 required buffer, any expiry after departure is valid
 */

import { checkPassportValidity } from '../../src/services/documents/documentValidityService';
import { TravelerProfile } from '../../src/types/profile';
import { CountryFormSchema } from '../../src/types/schema';

// ---------------------------------------------------------------------------
// Test helpers / fixtures
// ---------------------------------------------------------------------------

/**
 * Builds a minimal TravelerProfile with the given passportExpiry date string
 * (ISO 8601 date: YYYY-MM-DD or full ISO).
 */
function makePassport(passportExpiry: string): TravelerProfile {
  return {
    id: 'profile-001',
    passportNumber: 'A1234567',
    surname: 'TRAVELER',
    givenNames: 'TEST',
    nationality: 'AUS',
    dateOfBirth: '1990-01-01',
    gender: 'M',
    passportExpiry,
    issuingCountry: 'AUS',
    defaultDeclarations: {
      hasItemsToDeclar: false,
      carryingCurrency: false,
      carryingProhibitedItems: false,
      visitedFarm: false,
      hasCriminalRecord: false,
      carryingCommercialGoods: false,
    },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };
}

/**
 * Builds a minimal CountryFormSchema with the specified passportValidityMonths.
 */
function makeSchema(
  passportValidityMonths?: number,
  overrides: Partial<CountryFormSchema> = {},
): CountryFormSchema {
  return {
    countryCode: 'JPN',
    countryName: 'Japan',
    schemaVersion: '1.0.0',
    lastUpdated: '2025-01-01T00:00:00Z',
    portalUrl: 'https://example.com',
    portalName: 'Test Portal',
    submissionDeadlineHours: 24,
    recommendedLeadTimeHours: 72,
    submissionWindowNote: 'Submit before arrival',
    passportValidityMonths,
    metadata: {
      priority: 1,
      complexity: 'low',
      popularity: 90,
      lastVerified: '2025-01-01T00:00:00Z',
      supportedLanguages: ['en'],
      implementationStatus: 'complete',
      maintenanceFrequency: 'monthly',
    },
    changeDetection: {
      monitoredSelectors: [],
      changeThreshold: 10,
      fallbackActions: [],
    },
    submission: {
      earliestBeforeArrival: '14d',
      latestBeforeArrival: '0h',
      recommended: '72h',
    },
    portalFlow: {
      requiresAccount: false,
      multiStep: false,
      canSaveProgress: false,
    },
    sections: [],
    submissionGuide: [],
    ...overrides,
  } as CountryFormSchema;
}

// ---------------------------------------------------------------------------
// checkPassportValidity — happy path (isValid = true)
// ---------------------------------------------------------------------------

describe('checkPassportValidity — valid passport', () => {
  it('returns isValid=true when passport expires well beyond required 6-month buffer', () => {
    // Departure: 2025-06-01, expiry: 2026-06-01 (12 months remaining)
    // Required buffer: 6 months → min expiry 2025-12-01
    const passport = makePassport('2026-06-01');
    const schema = makeSchema(6);

    const result = checkPassportValidity(passport, '2025-06-01', schema);

    expect(result.isValid).toBe(true);
    expect(result.shortfallDays).toBe(0);
    expect(result.requiredValidityDays).toBe(183); // 6 months from Jun 1 to Dec 1 = 183 days
  });

  it('returns isValid=true when passport expires exactly on the required buffer date', () => {
    // Departure: 2025-06-01, expiry: 2025-12-01 (exactly 6 months)
    // Min expiry: 2025-12-01 → expiry meets requirement exactly
    const passport = makePassport('2025-12-01');
    const schema = makeSchema(6);

    const result = checkPassportValidity(passport, '2025-06-01', schema);

    expect(result.isValid).toBe(true);
    expect(result.shortfallDays).toBe(0);
  });

  it('returns isValid=true when schema has no passportValidityMonths (undefined)', () => {
    // When no buffer is required, any passport valid through departure is OK
    const passport = makePassport('2025-07-01');
    const schema = makeSchema(undefined);

    const result = checkPassportValidity(passport, '2025-06-01', schema);

    expect(result.isValid).toBe(true);
    expect(result.requiredValidityDays).toBe(0);
    expect(result.shortfallDays).toBe(0);
  });

  it('returns isValid=true when passportValidityMonths is 0', () => {
    // 0-month buffer → passport only needs to be valid on departure day
    const passport = makePassport('2025-06-01');
    const schema = makeSchema(0);

    const result = checkPassportValidity(passport, '2025-06-01', schema);

    expect(result.isValid).toBe(true);
    expect(result.requiredValidityDays).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// checkPassportValidity — invalid passport (isValid = false)
// ---------------------------------------------------------------------------

describe('checkPassportValidity — invalid passport', () => {
  it('returns isValid=false with positive shortfallDays when passport expires before buffer', () => {
    // Departure: 2025-06-01, expiry: 2025-09-01 (3 months)
    // Required: 6 months → min expiry 2025-12-01
    // Shortfall: Dec 1 - Sep 1 = 91 days
    const passport = makePassport('2025-09-01');
    const schema = makeSchema(6);

    const result = checkPassportValidity(passport, '2025-06-01', schema);

    expect(result.isValid).toBe(false);
    expect(result.shortfallDays).toBeGreaterThan(0);
    // Sep 1 → Dec 1 = 91 days
    expect(result.shortfallDays).toBe(91);
  });

  it('returns isValid=false when passport expires one day before the required buffer date', () => {
    // Departure: 2025-06-01, expiry: 2025-11-30 (one day before 6-month mark)
    // Required: 6 months → min expiry 2025-12-01
    const passport = makePassport('2025-11-30');
    const schema = makeSchema(6);

    const result = checkPassportValidity(passport, '2025-06-01', schema);

    expect(result.isValid).toBe(false);
    expect(result.shortfallDays).toBe(1);
  });

  it('returns isValid=false when passport expires on the departure date itself (buffer > 0)', () => {
    // Passport expires exactly on departure → 0 months remaining → fails 6-month check
    const passport = makePassport('2025-06-01');
    const schema = makeSchema(6);

    const result = checkPassportValidity(passport, '2025-06-01', schema);

    expect(result.isValid).toBe(false);
    expect(result.shortfallDays).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Edge case: already-expired passports
// ---------------------------------------------------------------------------

describe('checkPassportValidity — already-expired passports', () => {
  it('returns daysUntilExpiry < 0 for an already-expired passport', () => {
    // Passport expired in the past (2020-01-01)
    const passport = makePassport('2020-01-01');
    const schema = makeSchema(6);

    const result = checkPassportValidity(passport, '2025-06-01', schema);

    expect(result.daysUntilExpiry).toBeLessThan(0);
    expect(result.isValid).toBe(false);
  });

  it('returns correct shortfallDays for a long-expired passport', () => {
    // Passport expired 2020-01-01, departure 2025-06-01, required buffer 6 months
    // Min expiry: 2025-12-01
    // Shortfall: days from 2020-01-01 to 2025-12-01 = very large positive number
    const passport = makePassport('2020-01-01');
    const schema = makeSchema(6);

    const result = checkPassportValidity(passport, '2025-06-01', schema);

    expect(result.shortfallDays).toBeGreaterThan(365); // Much more than a year
    expect(result.isValid).toBe(false);
  });

  it('returns isValid=false even with no buffer requirement if passport already expired', () => {
    const passport = makePassport('2020-01-01');
    const schema = makeSchema(0);

    const result = checkPassportValidity(passport, '2025-06-01', schema);

    expect(result.isValid).toBe(false);
    expect(result.shortfallDays).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Edge case: departure date in the past
// ---------------------------------------------------------------------------

describe('checkPassportValidity — departure date in the past', () => {
  it('handles departure date in the past without throwing', () => {
    // Departure was 6 months ago, passport expires 12 months from now
    const futureExpiry = new Date();
    futureExpiry.setFullYear(futureExpiry.getFullYear() + 1);
    const pastDeparture = new Date();
    pastDeparture.setMonth(pastDeparture.getMonth() - 6);

    const passport = makePassport(futureExpiry.toISOString().split('T')[0]);
    const schema = makeSchema(6);

    expect(() =>
      checkPassportValidity(passport, pastDeparture.toISOString().split('T')[0], schema),
    ).not.toThrow();
  });

  it('still computes daysUntilExpiry correctly when departure is in the past', () => {
    // Passport expires 2030-01-01 (well in the future)
    const passport = makePassport('2030-01-01');
    const schema = makeSchema(6);

    const result = checkPassportValidity(passport, '2020-06-01', schema);

    // Passport is not yet expired, so daysUntilExpiry should be positive
    expect(result.daysUntilExpiry).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Edge case: leap year month arithmetic
// ---------------------------------------------------------------------------

describe('checkPassportValidity — leap year handling', () => {
  it('correctly adds 6 months from Aug 31 (no Sep 31 → Sep 30)', () => {
    // Departure: 2025-08-31, required 6 months
    // Aug 31 + 6 months = Feb 28, 2026 (no Feb 31 or Feb 30)
    // Passport expires 2026-02-28 → exactly on the buffer date → isValid = true
    const passport = makePassport('2026-02-28');
    const schema = makeSchema(6);

    const result = checkPassportValidity(passport, '2025-08-31', schema);

    expect(result.isValid).toBe(true);
    expect(result.shortfallDays).toBe(0);
  });

  it('correctly adds 6 months from Feb 29 in a leap year (2024-02-29 + 6 = 2024-08-29)', () => {
    // Departure: 2024-02-29 (leap day), required 6 months
    // 2024-02-29 + 6 months = 2024-08-29
    const passport = makePassport('2024-08-29');
    const schema = makeSchema(6);

    const result = checkPassportValidity(passport, '2024-02-29', schema);

    expect(result.isValid).toBe(true);
    expect(result.shortfallDays).toBe(0);
  });

  it('correctly handles month-end overflow: Jan 31 + 1 month clamps to Feb 28 in non-leap year', () => {
    // Departure: 2025-01-31, required 1 month
    // Jan 31 + 1 month = Feb 28, 2025 (not a leap year)
    // Passport expires 2025-02-28 → isValid = true
    const passport = makePassport('2025-02-28');
    const schema = makeSchema(1);

    const result = checkPassportValidity(passport, '2025-01-31', schema);

    expect(result.isValid).toBe(true);
    expect(result.shortfallDays).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// requiredValidityDays reflects passportValidityMonths
// ---------------------------------------------------------------------------

describe('checkPassportValidity — requiredValidityDays', () => {
  it('requiredValidityDays is 0 when passportValidityMonths is undefined', () => {
    const passport = makePassport('2030-01-01');
    const schema = makeSchema(undefined);

    const result = checkPassportValidity(passport, '2025-06-01', schema);

    expect(result.requiredValidityDays).toBe(0);
  });

  it('requiredValidityDays matches 6 calendar months from departure', () => {
    // Jun 1 → Dec 1 = 183 days
    const passport = makePassport('2030-01-01');
    const schema = makeSchema(6);

    const result = checkPassportValidity(passport, '2025-06-01', schema);

    expect(result.requiredValidityDays).toBe(183);
  });

  it('requiredValidityDays matches 3 calendar months from departure', () => {
    // Jun 1 → Sep 1 = 92 days
    const passport = makePassport('2030-01-01');
    const schema = makeSchema(3);

    const result = checkPassportValidity(passport, '2025-06-01', schema);

    expect(result.requiredValidityDays).toBe(92);
  });
});

// ---------------------------------------------------------------------------
// daysUntilExpiry accuracy
// ---------------------------------------------------------------------------

describe('checkPassportValidity — daysUntilExpiry', () => {
  it('daysUntilExpiry is approximately correct for a passport expiring in ~1 year', () => {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    const expiryStr = oneYearFromNow.toISOString().split('T')[0];

    const passport = makePassport(expiryStr);
    const schema = makeSchema(6);

    const result = checkPassportValidity(passport, '2025-06-01', schema);

    // Allow ±2 days tolerance for test timing
    expect(result.daysUntilExpiry).toBeGreaterThanOrEqual(363);
    expect(result.daysUntilExpiry).toBeLessThanOrEqual(367);
  });

  it('daysUntilExpiry is 0 when passport expires today', () => {
    const today = new Date();
    const expiryStr = today.toISOString().split('T')[0];

    const passport = makePassport(expiryStr);
    const schema = makeSchema(0);

    const result = checkPassportValidity(passport, expiryStr, schema);

    expect(result.daysUntilExpiry).toBe(0);
  });
});
