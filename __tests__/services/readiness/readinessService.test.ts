/**
 * Tests for ReadinessService
 *
 * Acceptance criteria covered:
 *  1. computeTripReadiness returns one ReadinessItem per signal per leg
 *     (passport, form, QR, deadline)
 *  2. overallStatus is the worst severity across all items
 *  3. getOverallStatus handles all severity levels and edge cases
 *  4. Passport signal: critical when expires before departure, warning when
 *     within validity window, ok otherwise
 *  5. Form signal: ok for submitted/ready, warning for in_progress, critical
 *     for not_started
 *  6. QR signal: missing for QR-required country with no QR; ok when QR saved;
 *     no item emitted for non-QR countries with no codes saved
 *  7. Deadline signal: critical for overdue/critical urgency, warning for
 *     normal urgency in-progress/not-started, ok for ready/no-deadline
 *  8. Service has no direct store imports — all data passed as arguments
 *  9. Trip with no legs → empty items, overallStatus 'ok'
 * 10. Multi-profile legs: worst passport status surfaces
 */

import { computeTripReadiness, getOverallStatus } from '../../../src/services/readiness/readinessService';
import { ReadinessItem, ReadinessItemStatus } from '../../../src/services/readiness/readinessTypes';
import { Trip, TripLeg, SavedQRCode } from '../../../src/types/trip';
import { TravelerProfile } from '../../../src/types/profile';
import { CountryFormSchema } from '../../../src/types/schema';

// ---------------------------------------------------------------------------
// Fixtures / helpers
// ---------------------------------------------------------------------------

function makeSchema(overrides: Partial<CountryFormSchema> = {}): CountryFormSchema {
  return {
    countryCode: 'JPN',
    countryName: 'Japan',
    schemaVersion: '1.0.0',
    lastUpdated: '2025-01-01T00:00:00Z',
    portalUrl: 'https://vjw-lp.digital.go.jp/en/',
    portalName: 'Visit Japan Web',
    submissionDeadlineHours: 72,
    recommendedLeadTimeHours: 24,
    submissionWindowNote: 'Submit 3 days before arrival',
    passportValidityMonths: 6,
    metadata: {
      priority: 1,
      complexity: 'medium',
      popularity: 90,
      lastVerified: '2025-01-01T00:00:00Z',
      supportedLanguages: ['en', 'ja'],
      implementationStatus: 'complete',
      maintenanceFrequency: 'monthly',
    },
    changeDetection: {
      monitoredSelectors: [],
      changeThreshold: 20,
      fallbackActions: [],
    },
    submission: {
      earliestBeforeArrival: '14d',
      latestBeforeArrival: '3d',
      recommended: '7d',
    },
    portalFlow: {
      requiresAccount: true,
      multiStep: true,
      canSaveProgress: true,
    },
    sections: [],
    submissionGuide: [],
    ...overrides,
  } as CountryFormSchema;
}

function makeSGPSchema(overrides: Partial<CountryFormSchema> = {}): CountryFormSchema {
  return makeSchema({
    countryCode: 'SGP',
    countryName: 'Singapore',
    submissionDeadlineHours: 3,
    recommendedLeadTimeHours: 24,
    submissionWindowNote: 'Submit within 3 days before arrival',
    passportValidityMonths: 6,
    ...overrides,
  });
}

function makeLeg(overrides: Partial<TripLeg> = {}): TripLeg {
  return {
    id: 'leg-001',
    tripId: 'trip-001',
    destinationCountry: 'JPN',
    arrivalDate: '2099-12-01T10:00:00Z',
    departureDate: '2099-12-10T10:00:00Z',
    accommodation: {
      name: 'Hotel Tokyo',
      address: {
        line1: '1-1 Marunouchi',
        city: 'Tokyo',
        postalCode: '100-0005',
        country: 'JPN',
      },
    },
    formStatus: 'not_started',
    submissionStatus: 'not_started',
    order: 0,
    ...overrides,
  };
}

/** Creates a leg with departureDate N days from now. */
function makeLegWithDeparture(daysFromNow: number, overrides: Partial<TripLeg> = {}): TripLeg {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  return makeLeg({ departureDate: date.toISOString(), arrivalDate: date.toISOString(), ...overrides });
}

/** Creates a leg with no departureDate property (explicitly absent). */
function makeLegNoDeparture(overrides: Partial<Omit<TripLeg, 'departureDate'>> = {}): TripLeg {
  const base = makeLeg(overrides as Partial<TripLeg>);
  const { departureDate: _removed, ...rest } = base;
  void _removed;
  return rest as TripLeg;
}

function makeTrip(legs: TripLeg[]): Trip {
  return {
    id: 'trip-001',
    name: 'Asia Trip',
    status: 'upcoming',
    legs,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };
}

function makeProfile(overrides: Partial<TravelerProfile> = {}): TravelerProfile {
  return {
    id: 'profile-001',
    passportNumber: 'AB123456',
    surname: 'Smith',
    givenNames: 'Alice',
    nationality: 'GBR',
    dateOfBirth: '1990-01-15',
    gender: 'F',
    // Expires well in the future — 2050
    passportExpiry: '2050-06-30',
    issuingCountry: 'GBR',
    defaultDeclarations: {
      hasItemsToDeclare: false,
      carryingCurrency: false,
      carryingProhibitedItems: false,
      visitedFarm: false,
      hasCriminalRecord: false,
      carryingCommercialGoods: false,
    },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeQRCode(overrides: Partial<SavedQRCode> = {}): SavedQRCode {
  return {
    id: 'qr-001',
    legId: 'leg-001',
    type: 'immigration',
    imageBase64: 'base64data',
    savedAt: '2025-01-01T00:00:00Z',
    label: 'Visit Japan Web QR',
    ...overrides,
  };
}

const defaultSchemas: Record<string, CountryFormSchema> = {
  JPN: makeSchema(),
};

// ---------------------------------------------------------------------------
// getOverallStatus
// ---------------------------------------------------------------------------

describe('getOverallStatus', () => {
  it('returns "ok" for an empty list', () => {
    expect(getOverallStatus([])).toBe<ReadinessItemStatus>('ok');
  });

  it('returns "ok" when all items are ok', () => {
    const items: ReadinessItem[] = [
      { id: '1', category: 'form', label: 'Form', status: 'ok' },
      { id: '2', category: 'passport', label: 'Passport', status: 'ok' },
    ];
    expect(getOverallStatus(items)).toBe<ReadinessItemStatus>('ok');
  });

  it('returns "warning" when worst item is warning', () => {
    const items: ReadinessItem[] = [
      { id: '1', category: 'form', label: 'Form', status: 'ok' },
      { id: '2', category: 'deadline', label: 'Deadline', status: 'warning' },
    ];
    expect(getOverallStatus(items)).toBe<ReadinessItemStatus>('warning');
  });

  it('returns "critical" when worst item is critical', () => {
    const items: ReadinessItem[] = [
      { id: '1', category: 'form', label: 'Form', status: 'ok' },
      { id: '2', category: 'deadline', label: 'Deadline', status: 'warning' },
      { id: '3', category: 'passport', label: 'Passport', status: 'critical' },
    ];
    expect(getOverallStatus(items)).toBe<ReadinessItemStatus>('critical');
  });

  it('returns "missing" when any item is missing', () => {
    const items: ReadinessItem[] = [
      { id: '1', category: 'form', label: 'Form', status: 'critical' },
      { id: '2', category: 'qr', label: 'QR', status: 'missing' },
    ];
    expect(getOverallStatus(items)).toBe<ReadinessItemStatus>('missing');
  });

  it('returns "missing" when all items are missing', () => {
    const items: ReadinessItem[] = [
      { id: '1', category: 'qr', label: 'QR', status: 'missing' },
    ];
    expect(getOverallStatus(items)).toBe<ReadinessItemStatus>('missing');
  });
});

// ---------------------------------------------------------------------------
// computeTripReadiness — structural tests
// ---------------------------------------------------------------------------

describe('computeTripReadiness — structure', () => {
  it('returns empty items and "ok" overall status for a trip with no legs', async () => {
    const trip = makeTrip([]);
    const result = await computeTripReadiness(trip, [], {}, []);
    expect(result.tripId).toBe('trip-001');
    expect(result.items).toHaveLength(0);
    expect(result.overallStatus).toBe<ReadinessItemStatus>('ok');
    expect(result.readyCount).toBe(0);
    expect(result.totalCount).toBe(0);
  });

  it('emits passport + form + qr + deadline items for a JPN leg with all data', async () => {
    const leg = makeLeg({ formStatus: 'not_started' });
    const trip = makeTrip([leg]);
    const profile = makeProfile();

    const result = await computeTripReadiness(trip, [profile], defaultSchemas, []);

    const categories = result.items.map((i) => i.category);
    expect(categories).toContain('passport');
    expect(categories).toContain('form');
    expect(categories).toContain('qr');
    expect(categories).toContain('deadline');
  });

  it('sets correct item IDs using leg id', async () => {
    const leg = makeLeg({ id: 'leg-abc', formStatus: 'submitted' });
    const trip = makeTrip([leg]);
    const profile = makeProfile();

    const result = await computeTripReadiness(trip, [profile], defaultSchemas, []);

    const ids = result.items.map((i) => i.id);
    expect(ids).toContain('passport-leg-abc');
    expect(ids).toContain('form-leg-abc');
    expect(ids).toContain('qr-leg-abc');
    expect(ids).toContain('deadline-leg-abc');
  });

  it('sets departureDate to the earliest leg departure date', async () => {
    const leg1 = makeLeg({ id: 'leg-1', departureDate: '2099-12-10T00:00:00Z' });
    const leg2 = makeLeg({ id: 'leg-2', departureDate: '2099-11-05T00:00:00Z' });
    const trip = makeTrip([leg1, leg2]);

    const result = await computeTripReadiness(trip, [], {}, []);

    expect(result.departureDate.toISOString()).toBe('2099-11-05T00:00:00.000Z');
  });

  it('falls back to arrivalDate when no departureDate is set', async () => {
    const leg = makeLegNoDeparture();
    const trip = makeTrip([leg]);

    const result = await computeTripReadiness(trip, [], {}, []);

    expect(result.departureDate.toISOString()).toBe(new Date(leg.arrivalDate).toISOString());
  });

  it('readyCount equals items with status ok', async () => {
    const leg = makeLeg({ formStatus: 'submitted' });
    const trip = makeTrip([leg]);
    const profile = makeProfile();
    const qr = makeQRCode();

    const result = await computeTripReadiness(trip, [profile], defaultSchemas, [qr]);

    const okCount = result.items.filter((i) => i.status === 'ok').length;
    expect(result.readyCount).toBe(okCount);
    expect(result.totalCount).toBe(result.items.length);
  });
});

// ---------------------------------------------------------------------------
// computeTripReadiness — passport signal
// ---------------------------------------------------------------------------

describe('computeTripReadiness — passport signal', () => {
  it('status is "ok" when passport expires well after the validity requirement', async () => {
    const leg = makeLeg({ departureDate: '2030-06-01T00:00:00Z' });
    const trip = makeTrip([leg]);
    // passportExpiry 2050 is well after departure + 6 months
    const profile = makeProfile({ passportExpiry: '2050-01-01' });

    const result = await computeTripReadiness(trip, [profile], defaultSchemas, []);

    const passportItem = result.items.find((i) => i.category === 'passport');
    expect(passportItem).toBeDefined();
    expect(passportItem!.status).toBe<ReadinessItemStatus>('ok');
  });

  it('status is "critical" when passport expires before departure', async () => {
    const leg = makeLeg({ departureDate: '2030-06-01T00:00:00Z' });
    const trip = makeTrip([leg]);
    // Passport expired in 2020 — well before departure
    const profile = makeProfile({ passportExpiry: '2020-01-01' });

    const result = await computeTripReadiness(trip, [profile], defaultSchemas, []);

    const passportItem = result.items.find((i) => i.category === 'passport');
    expect(passportItem).toBeDefined();
    expect(passportItem!.status).toBe<ReadinessItemStatus>('critical');
  });

  it('status is "warning" when passport expires after departure but within validity window', async () => {
    // departure = 2030-06-01, schema requires 6 months validity
    // passport expiry = 2030-09-01 — after departure but < 6 months after
    const leg = makeLeg({ departureDate: '2030-06-01T00:00:00Z' });
    const trip = makeTrip([leg]);
    const profile = makeProfile({ passportExpiry: '2030-09-01' });

    const result = await computeTripReadiness(trip, [profile], defaultSchemas, []);

    const passportItem = result.items.find((i) => i.category === 'passport');
    expect(passportItem).toBeDefined();
    expect(passportItem!.status).toBe<ReadinessItemStatus>('warning');
  });

  it('surfaces the worst passport status when multiple profiles are assigned', async () => {
    const leg = makeLeg({
      departureDate: '2030-06-01T00:00:00Z',
      assignedTravelers: ['profile-001', 'profile-002'],
    });
    const trip = makeTrip([leg]);

    const goodProfile = makeProfile({ id: 'profile-001', passportExpiry: '2050-01-01' });
    // This profile's passport expires before departure → critical
    const badProfile = makeProfile({ id: 'profile-002', passportExpiry: '2020-01-01', surname: 'Jones' });

    const result = await computeTripReadiness(trip, [goodProfile, badProfile], defaultSchemas, []);

    const passportItem = result.items.find((i) => i.category === 'passport');
    expect(passportItem!.status).toBe<ReadinessItemStatus>('critical');
    expect(passportItem!.detail).toContain('Jones');
  });

  it('skips passport item when no schema exists for the country', async () => {
    const leg = makeLeg({ destinationCountry: 'XYZ' });
    const trip = makeTrip([leg]);
    const profile = makeProfile();

    const result = await computeTripReadiness(trip, [profile], {}, []);

    const passportItem = result.items.find((i) => i.category === 'passport');
    expect(passportItem).toBeUndefined();
  });

  it('skips passport item when no profiles are provided', async () => {
    const leg = makeLeg();
    const trip = makeTrip([leg]);

    const result = await computeTripReadiness(trip, [], defaultSchemas, []);

    const passportItem = result.items.find((i) => i.category === 'passport');
    expect(passportItem).toBeUndefined();
  });

  it('only checks profiles assigned to the leg when assignedTravelers is set', async () => {
    const leg = makeLeg({
      departureDate: '2030-06-01T00:00:00Z',
      // Only profile-001 is assigned
      assignedTravelers: ['profile-001'],
    });
    const trip = makeTrip([leg]);

    const goodProfile = makeProfile({ id: 'profile-001', passportExpiry: '2050-01-01' });
    // profile-002 is NOT assigned — should not affect result
    const badProfile = makeProfile({ id: 'profile-002', passportExpiry: '2020-01-01', surname: 'Jones' });

    const result = await computeTripReadiness(trip, [goodProfile, badProfile], defaultSchemas, []);

    const passportItem = result.items.find((i) => i.category === 'passport');
    expect(passportItem!.status).toBe<ReadinessItemStatus>('ok');
  });
});

// ---------------------------------------------------------------------------
// computeTripReadiness — form signal
// ---------------------------------------------------------------------------

describe('computeTripReadiness — form signal', () => {
  it('status is "ok" for submitted form', async () => {
    const leg = makeLeg({ formStatus: 'submitted' });
    const result = await computeTripReadiness(makeTrip([leg]), [], {}, []);

    const formItem = result.items.find((i) => i.category === 'form');
    expect(formItem!.status).toBe<ReadinessItemStatus>('ok');
  });

  it('status is "ok" for ready form', async () => {
    const leg = makeLeg({ formStatus: 'ready' });
    const result = await computeTripReadiness(makeTrip([leg]), [], {}, []);

    const formItem = result.items.find((i) => i.category === 'form');
    expect(formItem!.status).toBe<ReadinessItemStatus>('ok');
  });

  it('status is "warning" for in_progress form', async () => {
    const leg = makeLeg({ formStatus: 'in_progress' });
    const result = await computeTripReadiness(makeTrip([leg]), [], {}, []);

    const formItem = result.items.find((i) => i.category === 'form');
    expect(formItem!.status).toBe<ReadinessItemStatus>('warning');
  });

  it('status is "critical" for not_started form', async () => {
    const leg = makeLeg({ formStatus: 'not_started' });
    const result = await computeTripReadiness(makeTrip([leg]), [], {}, []);

    const formItem = result.items.find((i) => i.category === 'form');
    expect(formItem!.status).toBe<ReadinessItemStatus>('critical');
  });

  it('form item always present regardless of schema availability', async () => {
    const leg = makeLeg({ destinationCountry: 'XYZ', formStatus: 'not_started' });
    const result = await computeTripReadiness(makeTrip([leg]), [], {}, []);

    const formItem = result.items.find((i) => i.category === 'form');
    expect(formItem).toBeDefined();
  });

  it('form item has actionScreen "LegForm"', async () => {
    const leg = makeLeg({ formStatus: 'in_progress' });
    const result = await computeTripReadiness(makeTrip([leg]), [], {}, []);

    const formItem = result.items.find((i) => i.category === 'form');
    expect(formItem!.actionScreen).toBe('LegForm');
  });
});

// ---------------------------------------------------------------------------
// computeTripReadiness — QR signal
// ---------------------------------------------------------------------------

describe('computeTripReadiness — QR signal', () => {
  it('status is "missing" for Japan leg with no QR code saved', async () => {
    const leg = makeLeg({ destinationCountry: 'JPN' });
    const result = await computeTripReadiness(makeTrip([leg]), [], defaultSchemas, []);

    const qrItem = result.items.find((i) => i.category === 'qr');
    expect(qrItem).toBeDefined();
    expect(qrItem!.status).toBe<ReadinessItemStatus>('missing');
  });

  it('status is "ok" for Japan leg with QR code saved', async () => {
    const leg = makeLeg({ destinationCountry: 'JPN', id: 'leg-001' });
    const qr = makeQRCode({ legId: 'leg-001' });
    const result = await computeTripReadiness(makeTrip([leg]), [], defaultSchemas, [qr]);

    const qrItem = result.items.find((i) => i.category === 'qr');
    expect(qrItem).toBeDefined();
    expect(qrItem!.status).toBe<ReadinessItemStatus>('ok');
  });

  it('no QR item emitted for non-QR country with no codes', async () => {
    const sgpSchema: Record<string, CountryFormSchema> = { SGP: makeSGPSchema() };
    const leg = makeLeg({ destinationCountry: 'SGP' });
    const result = await computeTripReadiness(makeTrip([leg]), [], sgpSchema, []);

    const qrItem = result.items.find((i) => i.category === 'qr');
    expect(qrItem).toBeUndefined();
  });

  it('emits "ok" QR item for non-QR country when a code happens to be saved', async () => {
    const sgpSchema: Record<string, CountryFormSchema> = { SGP: makeSGPSchema() };
    const leg = makeLeg({ destinationCountry: 'SGP', id: 'leg-sgp' });
    const qr = makeQRCode({ legId: 'leg-sgp' });
    const result = await computeTripReadiness(makeTrip([leg]), [], sgpSchema, [qr]);

    const qrItem = result.items.find((i) => i.category === 'qr');
    expect(qrItem).toBeDefined();
    expect(qrItem!.status).toBe<ReadinessItemStatus>('ok');
  });

  it('only counts QR codes for the correct leg', async () => {
    const leg1 = makeLeg({ id: 'leg-001', destinationCountry: 'JPN' });
    const leg2 = makeLeg({ id: 'leg-002', destinationCountry: 'JPN' });
    // QR is for leg-002, not leg-001
    const qr = makeQRCode({ legId: 'leg-002' });

    const result = await computeTripReadiness(makeTrip([leg1, leg2]), [], defaultSchemas, [qr]);

    const qrItemLeg1 = result.items.find((i) => i.id === 'qr-leg-001');
    const qrItemLeg2 = result.items.find((i) => i.id === 'qr-leg-002');
    expect(qrItemLeg1!.status).toBe<ReadinessItemStatus>('missing');
    expect(qrItemLeg2!.status).toBe<ReadinessItemStatus>('ok');
  });
});

// ---------------------------------------------------------------------------
// computeTripReadiness — deadline signal
// ---------------------------------------------------------------------------

describe('computeTripReadiness — deadline signal', () => {
  it('status is "ok" when form is ready (deadline is ready)', async () => {
    const leg = makeLegWithDeparture(30, { formStatus: 'ready' });
    const result = await computeTripReadiness(makeTrip([leg]), [], defaultSchemas, []);

    const deadlineItem = result.items.find((i) => i.category === 'deadline');
    expect(deadlineItem!.status).toBe<ReadinessItemStatus>('ok');
  });

  it('status is "ok" when schema has no deadline (no-deadline)', async () => {
    const schemas: Record<string, CountryFormSchema> = {
      JPN: makeSchema({ submissionDeadlineHours: 0 }),
    };
    // No departureDate → triggers no-deadline path in DeadlineService
    const leg = makeLegNoDeparture();
    const result = await computeTripReadiness(makeTrip([leg]), [], schemas, []);

    const deadlineItem = result.items.find((i) => i.category === 'deadline');
    expect(deadlineItem!.status).toBe<ReadinessItemStatus>('ok');
  });

  it('status is "critical" when deadline is overdue (departure is in the past)', async () => {
    // daysFromNow = -5 → departure was 5 days ago → deadline = 5+3 = 8 days ago
    const leg = makeLegWithDeparture(-5, { formStatus: 'not_started' });
    const result = await computeTripReadiness(makeTrip([leg]), [], defaultSchemas, []);

    const deadlineItem = result.items.find((i) => i.category === 'deadline');
    expect(deadlineItem!.status).toBe<ReadinessItemStatus>('critical');
  });

  it('status is "critical" when in critical urgency window (< 24 h remaining)', async () => {
    // departure in 0.5 days, submissionDeadlineHours = 72
    // deadline was 71.5 h ago → overdue path; use smaller hours to trigger critical
    // Make deadline = now + 12h → departure = now + (12h + 72h) = now + 84h ≈ 3.5 days
    const hoursUntilDeadline = 12;
    const msUntilDeadline = hoursUntilDeadline * 60 * 60 * 1000;
    const submissionDeadlineHours = 72;
    const departureMs = Date.now() + msUntilDeadline + submissionDeadlineHours * 60 * 60 * 1000;
    const departure = new Date(departureMs);

    const leg = makeLeg({
      departureDate: departure.toISOString(),
      arrivalDate: departure.toISOString(),
      formStatus: 'not_started',
      submissionStatus: 'not_started',
    });
    const result = await computeTripReadiness(makeTrip([leg]), [], defaultSchemas, []);

    const deadlineItem = result.items.find((i) => i.category === 'deadline');
    expect(deadlineItem!.status).toBe<ReadinessItemStatus>('critical');
  });

  it('status is "warning" when in warning urgency window (24–48 h remaining)', async () => {
    // Make deadline = now + 36h → departure = now + 36h + 72h = now + 108h
    const hoursUntilDeadline = 36;
    const submissionDeadlineHours = 72;
    const departureMs =
      Date.now() +
      hoursUntilDeadline * 60 * 60 * 1000 +
      submissionDeadlineHours * 60 * 60 * 1000;
    const departure = new Date(departureMs);

    const leg = makeLeg({
      departureDate: departure.toISOString(),
      arrivalDate: departure.toISOString(),
      formStatus: 'not_started',
      submissionStatus: 'not_started',
    });
    const result = await computeTripReadiness(makeTrip([leg]), [], defaultSchemas, []);

    const deadlineItem = result.items.find((i) => i.category === 'deadline');
    expect(deadlineItem!.status).toBe<ReadinessItemStatus>('warning');
  });

  it('status is "warning" for not_started with plenty of time remaining', async () => {
    const leg = makeLegWithDeparture(30, { formStatus: 'not_started' });
    const result = await computeTripReadiness(makeTrip([leg]), [], defaultSchemas, []);

    const deadlineItem = result.items.find((i) => i.category === 'deadline');
    expect(deadlineItem!.status).toBe<ReadinessItemStatus>('warning');
  });

  it('skips deadline item when no schema exists for the country', async () => {
    const leg = makeLeg({ destinationCountry: 'XYZ' });
    const result = await computeTripReadiness(makeTrip([leg]), [], {}, []);

    const deadlineItem = result.items.find((i) => i.category === 'deadline');
    expect(deadlineItem).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// computeTripReadiness — overallStatus aggregation
// ---------------------------------------------------------------------------

describe('computeTripReadiness — overallStatus', () => {
  it('overallStatus reflects worst item status (missing > critical)', async () => {
    // Form = critical (not_started), QR = missing (Japan, no QR)
    const leg = makeLeg({ formStatus: 'not_started', destinationCountry: 'JPN' });
    const result = await computeTripReadiness(makeTrip([leg]), [], defaultSchemas, []);

    expect(result.overallStatus).toBe<ReadinessItemStatus>('missing');
  });

  it('overallStatus is "ok" when all signals are ok', async () => {
    // Use a near-future departure (30 days) so passport expiry 2050 is well after
    const leg = makeLegWithDeparture(30, { id: 'leg-001', formStatus: 'submitted' });
    const profile = makeProfile({ passportExpiry: '2050-01-01' });
    const qr = makeQRCode({ legId: 'leg-001' });
    const result = await computeTripReadiness(makeTrip([leg]), [profile], defaultSchemas, [qr]);

    expect(result.overallStatus).toBe<ReadinessItemStatus>('ok');
  });
});

// ---------------------------------------------------------------------------
// computeTripReadiness — multiple legs
// ---------------------------------------------------------------------------

describe('computeTripReadiness — multiple legs', () => {
  it('emits items for every leg', async () => {
    const leg1 = makeLeg({ id: 'leg-001', destinationCountry: 'JPN' });
    const leg2 = makeLeg({
      id: 'leg-002',
      destinationCountry: 'SGP',
      formStatus: 'in_progress',
      submissionStatus: 'not_started',
    });
    const schemas: Record<string, CountryFormSchema> = {
      JPN: makeSchema(),
      SGP: makeSGPSchema(),
    };

    const result = await computeTripReadiness(makeTrip([leg1, leg2]), [], schemas, []);

    const ids = result.items.map((i) => i.id);
    expect(ids.some((id) => id.startsWith('form-leg-001'))).toBe(true);
    expect(ids.some((id) => id.startsWith('form-leg-002'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeTripReadiness — AUS, NZL, KOR leg support
// ---------------------------------------------------------------------------

function makeAUSSchema(overrides: Partial<CountryFormSchema> = {}): CountryFormSchema {
  return makeSchema({
    countryCode: 'AUS',
    countryName: 'Australia',
    portalName: 'ABF Digital Incoming Passenger Card (DIPC)',
    submissionDeadlineHours: 0,
    recommendedLeadTimeHours: 48,
    submissionWindowNote: 'Submit within 72 hours before arrival',
    passportValidityMonths: 6,
    ...overrides,
  });
}

function makeNZLSchema(overrides: Partial<CountryFormSchema> = {}): CountryFormSchema {
  return makeSchema({
    countryCode: 'NZL',
    countryName: 'New Zealand',
    portalName: 'NZeTA / New Zealand Traveller Declaration',
    submissionDeadlineHours: 24,
    recommendedLeadTimeHours: 72,
    submissionWindowNote: 'Submit at least 24 hours before arrival',
    passportValidityMonths: 3,
    ...overrides,
  });
}

function makeKORSchema(overrides: Partial<CountryFormSchema> = {}): CountryFormSchema {
  return makeSchema({
    countryCode: 'KOR',
    countryName: 'South Korea',
    portalName: 'Korea K-ETA',
    submissionDeadlineHours: 72,
    recommendedLeadTimeHours: 168,
    submissionWindowNote: 'Submit at least 72 hours before arrival',
    passportValidityMonths: 6,
    ...overrides,
  });
}

describe('computeTripReadiness — AUS leg', () => {
  const ausSchemas: Record<string, CountryFormSchema> = { AUS: makeAUSSchema() };

  it('emits form item for AUS leg', async () => {
    const leg = makeLeg({ id: 'leg-aus', destinationCountry: 'AUS', formStatus: 'not_started' });
    const result = await computeTripReadiness(makeTrip([leg]), [], ausSchemas, []);

    const formItem = result.items.find((i) => i.id === 'form-leg-aus');
    expect(formItem).toBeDefined();
    expect(formItem!.status).toBe<ReadinessItemStatus>('critical');
  });

  it('emits passport item for AUS leg when profile and schema are present', async () => {
    const leg = makeLeg({
      id: 'leg-aus',
      destinationCountry: 'AUS',
      departureDate: '2030-06-01T00:00:00Z',
    });
    const profile = makeProfile({ passportExpiry: '2050-01-01' });
    const result = await computeTripReadiness(makeTrip([leg]), [profile], ausSchemas, []);

    const passportItem = result.items.find((i) => i.id === 'passport-leg-aus');
    expect(passportItem).toBeDefined();
    expect(passportItem!.status).toBe<ReadinessItemStatus>('ok');
  });

  it('does NOT emit a QR item for AUS leg (AUS does not require a QR code)', async () => {
    const leg = makeLeg({ id: 'leg-aus', destinationCountry: 'AUS' });
    const result = await computeTripReadiness(makeTrip([leg]), [], ausSchemas, []);

    const qrItem = result.items.find((i) => i.id === 'qr-leg-aus');
    expect(qrItem).toBeUndefined();
  });

  it('emits deadline item for AUS leg when schema is present', async () => {
    const leg = makeLeg({ id: 'leg-aus', destinationCountry: 'AUS' });
    const result = await computeTripReadiness(makeTrip([leg]), [], ausSchemas, []);

    const deadlineItem = result.items.find((i) => i.id === 'deadline-leg-aus');
    expect(deadlineItem).toBeDefined();
    expect(deadlineItem!.detail).toBe('Submit within 72 hours before arrival');
  });

  it('overallStatus is "ok" for AUS leg with submitted form, valid passport, and confirmation code', async () => {
    const leg = makeLegWithDeparture(30, {
      id: 'leg-aus',
      destinationCountry: 'AUS',
      formStatus: 'submitted',
      submissionStatus: 'not_started',
    });
    const profile = makeProfile({ passportExpiry: '2050-01-01' });
    const qr = makeQRCode({ legId: 'leg-aus' });
    const result = await computeTripReadiness(makeTrip([leg]), [profile], ausSchemas, [qr]);

    expect(result.overallStatus).toBe<ReadinessItemStatus>('ok');
  });
});

describe('computeTripReadiness — NZL leg', () => {
  const nzlSchemas: Record<string, CountryFormSchema> = { NZL: makeNZLSchema() };

  it('emits form item for NZL leg', async () => {
    const leg = makeLeg({ id: 'leg-nzl', destinationCountry: 'NZL', formStatus: 'ready' });
    const result = await computeTripReadiness(makeTrip([leg]), [], nzlSchemas, []);

    const formItem = result.items.find((i) => i.id === 'form-leg-nzl');
    expect(formItem).toBeDefined();
    expect(formItem!.status).toBe<ReadinessItemStatus>('ok');
  });

  it('emits passport warning for NZL when passport expires within 3 months of departure', async () => {
    // departure 2030-06-01, expiry 2030-07-01 — within the 3-month NZL requirement
    const leg = makeLeg({
      id: 'leg-nzl',
      destinationCountry: 'NZL',
      departureDate: '2030-06-01T00:00:00Z',
    });
    const profile = makeProfile({ passportExpiry: '2030-07-01' });
    const result = await computeTripReadiness(makeTrip([leg]), [profile], nzlSchemas, []);

    const passportItem = result.items.find((i) => i.id === 'passport-leg-nzl');
    expect(passportItem).toBeDefined();
    expect(passportItem!.status).toBe<ReadinessItemStatus>('warning');
  });

  it('does NOT emit a QR item for NZL leg (NZL does not require a QR code)', async () => {
    const leg = makeLeg({ id: 'leg-nzl', destinationCountry: 'NZL' });
    const result = await computeTripReadiness(makeTrip([leg]), [], nzlSchemas, []);

    const qrItem = result.items.find((i) => i.id === 'qr-leg-nzl');
    expect(qrItem).toBeUndefined();
  });

  it('emits deadline item for NZL leg', async () => {
    const leg = makeLeg({ id: 'leg-nzl', destinationCountry: 'NZL' });
    const result = await computeTripReadiness(makeTrip([leg]), [], nzlSchemas, []);

    const deadlineItem = result.items.find((i) => i.id === 'deadline-leg-nzl');
    expect(deadlineItem).toBeDefined();
    expect(deadlineItem!.detail).toBe('Submit at least 24 hours before arrival');
  });

  it('overallStatus is "ok" for NZL leg with submitted form, valid passport, and confirmation code', async () => {
    const leg = makeLegWithDeparture(30, {
      id: 'leg-nzl',
      destinationCountry: 'NZL',
      formStatus: 'submitted',
      submissionStatus: 'not_started',
    });
    const profile = makeProfile({ passportExpiry: '2050-01-01' });
    const qr = makeQRCode({ legId: 'leg-nzl' });
    const result = await computeTripReadiness(makeTrip([leg]), [profile], nzlSchemas, [qr]);

    expect(result.overallStatus).toBe<ReadinessItemStatus>('ok');
  });
});

describe('computeTripReadiness — KOR leg', () => {
  const korSchemas: Record<string, CountryFormSchema> = { KOR: makeKORSchema() };

  it('emits form item for KOR leg', async () => {
    const leg = makeLeg({ id: 'leg-kor', destinationCountry: 'KOR', formStatus: 'in_progress' });
    const result = await computeTripReadiness(makeTrip([leg]), [], korSchemas, []);

    const formItem = result.items.find((i) => i.id === 'form-leg-kor');
    expect(formItem).toBeDefined();
    expect(formItem!.status).toBe<ReadinessItemStatus>('warning');
  });

  it('emits passport item for KOR leg', async () => {
    const leg = makeLeg({
      id: 'leg-kor',
      destinationCountry: 'KOR',
      departureDate: '2030-06-01T00:00:00Z',
    });
    const profile = makeProfile({ passportExpiry: '2050-01-01' });
    const result = await computeTripReadiness(makeTrip([leg]), [profile], korSchemas, []);

    const passportItem = result.items.find((i) => i.id === 'passport-leg-kor');
    expect(passportItem).toBeDefined();
    expect(passportItem!.status).toBe<ReadinessItemStatus>('ok');
  });

  it('does NOT emit a QR item for KOR leg (KOR does not require a QR code)', async () => {
    const leg = makeLeg({ id: 'leg-kor', destinationCountry: 'KOR' });
    const result = await computeTripReadiness(makeTrip([leg]), [], korSchemas, []);

    const qrItem = result.items.find((i) => i.id === 'qr-leg-kor');
    expect(qrItem).toBeUndefined();
  });

  it('emits deadline item for KOR leg with 72h deadline', async () => {
    const leg = makeLeg({ id: 'leg-kor', destinationCountry: 'KOR' });
    const result = await computeTripReadiness(makeTrip([leg]), [], korSchemas, []);

    const deadlineItem = result.items.find((i) => i.id === 'deadline-leg-kor');
    expect(deadlineItem).toBeDefined();
  });

  it('overallStatus is "ok" for KOR leg with submitted form, valid passport, and confirmation code', async () => {
    const leg = makeLegWithDeparture(30, {
      id: 'leg-kor',
      destinationCountry: 'KOR',
      formStatus: 'submitted',
      submissionStatus: 'not_started',
    });
    const profile = makeProfile({ passportExpiry: '2050-01-01' });
    const qr = makeQRCode({ legId: 'leg-kor' });
    const result = await computeTripReadiness(makeTrip([leg]), [profile], korSchemas, [qr]);

    expect(result.overallStatus).toBe<ReadinessItemStatus>('ok');
  });
});

describe('computeTripReadiness — multi-country trip with AUS, NZL, KOR', () => {
  it('correctly handles a trip spanning all three new countries', async () => {
    const ausLeg = makeLeg({ id: 'leg-aus', destinationCountry: 'AUS', formStatus: 'submitted' });
    const nzlLeg = makeLeg({ id: 'leg-nzl', destinationCountry: 'NZL', formStatus: 'ready' });
    const korLeg = makeLeg({ id: 'leg-kor', destinationCountry: 'KOR', formStatus: 'in_progress' });

    const schemas: Record<string, CountryFormSchema> = {
      AUS: makeAUSSchema(),
      NZL: makeNZLSchema(),
      KOR: makeKORSchema(),
    };

    const result = await computeTripReadiness(makeTrip([ausLeg, nzlLeg, korLeg]), [], schemas, []);

    const formItems = result.items.filter((i) => i.category === 'form');
    expect(formItems).toHaveLength(3);

    const ausForm = formItems.find((i) => i.id === 'form-leg-aus');
    const nzlForm = formItems.find((i) => i.id === 'form-leg-nzl');
    const korForm = formItems.find((i) => i.id === 'form-leg-kor');

    expect(ausForm!.status).toBe<ReadinessItemStatus>('ok');
    expect(nzlForm!.status).toBe<ReadinessItemStatus>('ok');
    expect(korForm!.status).toBe<ReadinessItemStatus>('warning');
  });

  it('does not affect existing JPN/SGP leg handling when AUS/NZL/KOR are added', async () => {
    const jpnLeg = makeLeg({ id: 'leg-jpn', destinationCountry: 'JPN', formStatus: 'not_started' });
    const ausLeg = makeLeg({ id: 'leg-aus', destinationCountry: 'AUS', formStatus: 'submitted' });

    const schemas: Record<string, CountryFormSchema> = {
      JPN: makeSchema(),
      AUS: makeAUSSchema(),
    };

    const result = await computeTripReadiness(makeTrip([jpnLeg, ausLeg]), [], schemas, []);

    // JPN should still emit a QR missing item
    const jpnQR = result.items.find((i) => i.id === 'qr-leg-jpn');
    expect(jpnQR).toBeDefined();
    expect(jpnQR!.status).toBe<ReadinessItemStatus>('missing');

    // AUS should NOT emit a QR item (but AUS emits a confirmation item)
    const ausQR = result.items.find((i) => i.id === 'qr-leg-aus');
    expect(ausQR).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// computeTripReadiness — PHL/IDN QR code expansion
// ---------------------------------------------------------------------------

function makePHLSchema(overrides: Partial<CountryFormSchema> = {}): CountryFormSchema {
  return makeSchema({
    countryCode: 'PHL',
    countryName: 'Philippines',
    portalName: 'eTravel',
    submissionDeadlineHours: 0,
    recommendedLeadTimeHours: 72,
    submissionWindowNote: 'Submit within 72 hours before arrival',
    passportValidityMonths: 6,
    ...overrides,
  });
}

function makeIDNSchema(overrides: Partial<CountryFormSchema> = {}): CountryFormSchema {
  return makeSchema({
    countryCode: 'IDN',
    countryName: 'Indonesia',
    portalName: 'Indonesia e-CD',
    submissionDeadlineHours: 0,
    recommendedLeadTimeHours: 48,
    submissionWindowNote: 'Submit before arrival',
    passportValidityMonths: 6,
    ...overrides,
  });
}

describe('computeTripReadiness — PHL QR requirement', () => {
  const phlSchemas: Record<string, CountryFormSchema> = { PHL: makePHLSchema() };

  it('status is "missing" for PHL leg with no QR code saved', async () => {
    const leg = makeLeg({ id: 'leg-phl', destinationCountry: 'PHL' });
    const result = await computeTripReadiness(makeTrip([leg]), [], phlSchemas, []);

    const qrItem = result.items.find((i) => i.id === 'qr-leg-phl');
    expect(qrItem).toBeDefined();
    expect(qrItem!.status).toBe<ReadinessItemStatus>('missing');
    expect(qrItem!.category).toBe('qr');
  });

  it('status is "ok" for PHL leg with QR code saved', async () => {
    const leg = makeLeg({ id: 'leg-phl', destinationCountry: 'PHL' });
    const qr = makeQRCode({ legId: 'leg-phl' });
    const result = await computeTripReadiness(makeTrip([leg]), [], phlSchemas, [qr]);

    const qrItem = result.items.find((i) => i.id === 'qr-leg-phl');
    expect(qrItem).toBeDefined();
    expect(qrItem!.status).toBe<ReadinessItemStatus>('ok');
  });
});

describe('computeTripReadiness — IDN QR requirement', () => {
  const idnSchemas: Record<string, CountryFormSchema> = { IDN: makeIDNSchema() };

  it('status is "missing" for IDN leg with no QR code saved', async () => {
    const leg = makeLeg({ id: 'leg-idn', destinationCountry: 'IDN' });
    const result = await computeTripReadiness(makeTrip([leg]), [], idnSchemas, []);

    const qrItem = result.items.find((i) => i.id === 'qr-leg-idn');
    expect(qrItem).toBeDefined();
    expect(qrItem!.status).toBe<ReadinessItemStatus>('missing');
    expect(qrItem!.category).toBe('qr');
  });

  it('status is "ok" for IDN leg with QR code saved', async () => {
    const leg = makeLeg({ id: 'leg-idn', destinationCountry: 'IDN' });
    const qr = makeQRCode({ legId: 'leg-idn' });
    const result = await computeTripReadiness(makeTrip([leg]), [], idnSchemas, [qr]);

    const qrItem = result.items.find((i) => i.id === 'qr-leg-idn');
    expect(qrItem).toBeDefined();
    expect(qrItem!.status).toBe<ReadinessItemStatus>('ok');
  });
});

// ---------------------------------------------------------------------------
// computeTripReadiness — confirmation code tracking
// ---------------------------------------------------------------------------

describe('computeTripReadiness — confirmation code signal', () => {
  it('emits "missing" confirmation item for SGP leg with no codes saved', async () => {
    const sgpSchema: Record<string, CountryFormSchema> = { SGP: makeSGPSchema() };
    const leg = makeLeg({ id: 'leg-sgp', destinationCountry: 'SGP' });
    const result = await computeTripReadiness(makeTrip([leg]), [], sgpSchema, []);

    const confirmItem = result.items.find((i) => i.id === 'confirmation-leg-sgp');
    expect(confirmItem).toBeDefined();
    expect(confirmItem!.category).toBe('confirmation');
    expect(confirmItem!.status).toBe<ReadinessItemStatus>('missing');
    expect(confirmItem!.detail).toContain('No confirmation code saved');
    expect(confirmItem!.actionScreen).toBe('QRWallet');
  });

  it('emits "ok" confirmation item for SGP leg with code saved', async () => {
    const sgpSchema: Record<string, CountryFormSchema> = { SGP: makeSGPSchema() };
    const leg = makeLeg({ id: 'leg-sgp', destinationCountry: 'SGP' });
    const qr = makeQRCode({ legId: 'leg-sgp' });
    const result = await computeTripReadiness(makeTrip([leg]), [], sgpSchema, [qr]);

    const confirmItem = result.items.find((i) => i.id === 'confirmation-leg-sgp');
    expect(confirmItem).toBeDefined();
    expect(confirmItem!.status).toBe<ReadinessItemStatus>('ok');
    expect(confirmItem!.detail).toContain('confirmation code(s) saved');
  });

  it('emits "missing" confirmation item for KOR leg with no codes saved', async () => {
    const korSchemas: Record<string, CountryFormSchema> = { KOR: makeKORSchema() };
    const leg = makeLeg({ id: 'leg-kor', destinationCountry: 'KOR' });
    const result = await computeTripReadiness(makeTrip([leg]), [], korSchemas, []);

    const confirmItem = result.items.find((i) => i.id === 'confirmation-leg-kor');
    expect(confirmItem).toBeDefined();
    expect(confirmItem!.status).toBe<ReadinessItemStatus>('missing');
  });

  it('emits "ok" confirmation item for AUS leg with code saved', async () => {
    const ausSchemas: Record<string, CountryFormSchema> = { AUS: makeAUSSchema() };
    const leg = makeLeg({ id: 'leg-aus', destinationCountry: 'AUS' });
    const qr = makeQRCode({ legId: 'leg-aus' });
    const result = await computeTripReadiness(makeTrip([leg]), [], ausSchemas, [qr]);

    const confirmItem = result.items.find((i) => i.id === 'confirmation-leg-aus');
    expect(confirmItem).toBeDefined();
    expect(confirmItem!.status).toBe<ReadinessItemStatus>('ok');
  });

  it('emits "missing" confirmation item for NZL leg with no codes', async () => {
    const nzlSchemas: Record<string, CountryFormSchema> = { NZL: makeNZLSchema() };
    const leg = makeLeg({ id: 'leg-nzl', destinationCountry: 'NZL' });
    const result = await computeTripReadiness(makeTrip([leg]), [], nzlSchemas, []);

    const confirmItem = result.items.find((i) => i.id === 'confirmation-leg-nzl');
    expect(confirmItem).toBeDefined();
    expect(confirmItem!.status).toBe<ReadinessItemStatus>('missing');
  });

  it('emits "missing" confirmation item for VNM leg with no codes', async () => {
    const vnmSchema: Record<string, CountryFormSchema> = {
      VNM: makeSchema({
        countryCode: 'VNM',
        countryName: 'Vietnam',
      }),
    };
    const leg = makeLeg({ id: 'leg-vnm', destinationCountry: 'VNM' });
    const result = await computeTripReadiness(makeTrip([leg]), [], vnmSchema, []);

    const confirmItem = result.items.find((i) => i.id === 'confirmation-leg-vnm');
    expect(confirmItem).toBeDefined();
    expect(confirmItem!.status).toBe<ReadinessItemStatus>('missing');
  });

  it('does NOT emit confirmation item for JPN (QR country, not confirmation)', async () => {
    const leg = makeLeg({ id: 'leg-jpn', destinationCountry: 'JPN' });
    const result = await computeTripReadiness(makeTrip([leg]), [], defaultSchemas, []);

    const confirmItem = result.items.find((i) => i.id === 'confirmation-leg-jpn');
    expect(confirmItem).toBeUndefined();
  });

  it('does NOT emit confirmation item for PHL (QR country, not confirmation)', async () => {
    const phlSchemas: Record<string, CountryFormSchema> = { PHL: makePHLSchema() };
    const leg = makeLeg({ id: 'leg-phl', destinationCountry: 'PHL' });
    const result = await computeTripReadiness(makeTrip([leg]), [], phlSchemas, []);

    const confirmItem = result.items.find((i) => i.id === 'confirmation-leg-phl');
    expect(confirmItem).toBeUndefined();
  });

  it('only counts codes for the correct leg', async () => {
    const sgpSchema: Record<string, CountryFormSchema> = { SGP: makeSGPSchema() };
    const leg1 = makeLeg({ id: 'leg-sgp-1', destinationCountry: 'SGP' });
    const leg2 = makeLeg({ id: 'leg-sgp-2', destinationCountry: 'SGP' });
    const qr = makeQRCode({ legId: 'leg-sgp-2' });

    const result = await computeTripReadiness(makeTrip([leg1, leg2]), [], sgpSchema, [qr]);

    const confirm1 = result.items.find((i) => i.id === 'confirmation-leg-sgp-1');
    const confirm2 = result.items.find((i) => i.id === 'confirmation-leg-sgp-2');
    expect(confirm1!.status).toBe<ReadinessItemStatus>('missing');
    expect(confirm2!.status).toBe<ReadinessItemStatus>('ok');
  });
});
