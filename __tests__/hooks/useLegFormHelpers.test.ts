/**
 * Tests for useLegFormHelpers — pure helper functions extracted from the leg form screen.
 *
 * These are all pure functions (no React hooks), so they can be tested directly.
 */

import {
  deriveLegFormStatus,
  upsertTravelerFormData,
  loadSchemaOrError,
  persistFormData,
  resolveFormGenerationContext,
  buildTravelerTabs,
} from '../../src/hooks/useLegFormHelpers';
import type { TravelerFormData, TripLeg } from '../../src/types/trip';
import type { TravelerProfile } from '../../src/types/profile';
import { schemaRegistry } from '../../src/services/schemas/schemaRegistry';
import { stripPIIFromFormData } from '../../src/utils/piiSanitizer';

// Mock heavy dependencies at module level to prevent OOM
jest.mock('../../src/services/schemas/schemaRegistry', () => ({
  schemaRegistry: {
    getSchema: jest.fn(),
  },
}));

jest.mock('../../src/utils/piiSanitizer', () => ({
  stripPIIFromFormData: jest.fn((data: Record<string, unknown>) => data),
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeTravelerFormData(
  overrides: Partial<TravelerFormData> & { travelerId: string },
): TravelerFormData {
  return {
    formData: {},
    formStatus: 'not_started',
    completionPercentage: 0,
    ...overrides,
  };
}

function makeLeg(overrides: Partial<TripLeg> = {}): TripLeg {
  return {
    id: 'leg-1',
    tripId: 'trip-1',
    destinationCountry: 'JPN',
    arrivalDate: '2025-12-01T10:00:00Z',
    accommodation: {
      name: 'Hotel',
      address: { line1: '1-1', city: 'Tokyo', postalCode: '100', country: 'JPN' },
    },
    formStatus: 'not_started',
    submissionStatus: 'not_started',
    order: 0,
    ...overrides,
  };
}

function makeProfile(overrides: Partial<TravelerProfile> = {}): TravelerProfile {
  return {
    id: 'profile-1',
    passportNumber: 'AB1234567',
    surname: 'DOE',
    givenNames: 'JOHN',
    nationality: 'USA',
    dateOfBirth: '1990-01-15',
    gender: 'M',
    passportExpiry: '2030-01-15',
    issuingCountry: 'USA',
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

const MOCK_SCHEMA = {
  countryCode: 'JPN',
  countryName: 'Japan',
  schemaVersion: '1.0.0',
  lastUpdated: '2025-01-01',
  portalUrl: 'https://vjw.digital.go.jp',
  portalName: 'Visit Japan Web',
  submissionDeadlineHours: 72,
  recommendedLeadTimeHours: 24,
  submissionWindowNote: 'Submit 3 days before',
  sections: [],
  submissionGuide: [],
};

// ---------------------------------------------------------------------------
// deriveLegFormStatus
// ---------------------------------------------------------------------------

describe('deriveLegFormStatus', () => {
  it('returns "not_started" when no travelers are assigned', () => {
    expect(deriveLegFormStatus([], [])).toBe('not_started');
  });

  it('returns "not_started" when all travelers have not_started status', () => {
    const forms = [
      makeTravelerFormData({ travelerId: 't1', formStatus: 'not_started' }),
      makeTravelerFormData({ travelerId: 't2', formStatus: 'not_started' }),
    ];
    expect(deriveLegFormStatus(['t1', 't2'], forms)).toBe('not_started');
  });

  it('returns "in_progress" when at least one traveler has started', () => {
    const forms = [
      makeTravelerFormData({ travelerId: 't1', formStatus: 'in_progress' }),
      makeTravelerFormData({ travelerId: 't2', formStatus: 'not_started' }),
    ];
    expect(deriveLegFormStatus(['t1', 't2'], forms)).toBe('in_progress');
  });

  it('returns "in_progress" when some are ready but not all', () => {
    const forms = [
      makeTravelerFormData({ travelerId: 't1', formStatus: 'ready' }),
      makeTravelerFormData({ travelerId: 't2', formStatus: 'in_progress' }),
    ];
    expect(deriveLegFormStatus(['t1', 't2'], forms)).toBe('in_progress');
  });

  it('returns "ready" when all travelers are ready', () => {
    const forms = [
      makeTravelerFormData({ travelerId: 't1', formStatus: 'ready' }),
      makeTravelerFormData({ travelerId: 't2', formStatus: 'ready' }),
    ];
    expect(deriveLegFormStatus(['t1', 't2'], forms)).toBe('ready');
  });

  it('returns "ready" when all travelers are submitted', () => {
    const forms = [
      makeTravelerFormData({ travelerId: 't1', formStatus: 'submitted' }),
      makeTravelerFormData({ travelerId: 't2', formStatus: 'submitted' }),
    ];
    expect(deriveLegFormStatus(['t1', 't2'], forms)).toBe('ready');
  });

  it('returns "ready" when mix of ready and submitted', () => {
    const forms = [
      makeTravelerFormData({ travelerId: 't1', formStatus: 'ready' }),
      makeTravelerFormData({ travelerId: 't2', formStatus: 'submitted' }),
    ];
    expect(deriveLegFormStatus(['t1', 't2'], forms)).toBe('ready');
  });

  it('returns "not_started" when assigned traveler has no form entry', () => {
    expect(deriveLegFormStatus(['t1'], [])).toBe('not_started');
  });
});

// ---------------------------------------------------------------------------
// upsertTravelerFormData
// ---------------------------------------------------------------------------

describe('upsertTravelerFormData', () => {
  it('appends a new entry when traveler has no existing form data', () => {
    const result = upsertTravelerFormData([], 't1', { field: 'value' }, 'in_progress', 50);
    expect(result).toHaveLength(1);
    expect(result[0].travelerId).toBe('t1');
    expect(result[0].formData).toEqual({ field: 'value' });
    expect(result[0].formStatus).toBe('in_progress');
    expect(result[0].completionPercentage).toBe(50);
  });

  it('updates existing entry in-place when traveler already exists', () => {
    const existing = [makeTravelerFormData({ travelerId: 't1', formStatus: 'not_started' })];
    const result = upsertTravelerFormData(existing, 't1', { updated: true }, 'ready', 100);
    expect(result).toHaveLength(1);
    expect(result[0].formData).toEqual({ updated: true });
    expect(result[0].formStatus).toBe('ready');
    expect(result[0].completionPercentage).toBe(100);
  });

  it('does not modify other travelers entries', () => {
    const existing = [
      makeTravelerFormData({ travelerId: 't1', formStatus: 'ready', completionPercentage: 100 }),
      makeTravelerFormData({ travelerId: 't2', formStatus: 'not_started' }),
    ];
    const result = upsertTravelerFormData(existing, 't2', { x: 1 }, 'in_progress', 30);
    expect(result[0].travelerId).toBe('t1');
    expect(result[0].formStatus).toBe('ready');
    expect(result[1].travelerId).toBe('t2');
    expect(result[1].formStatus).toBe('in_progress');
  });
});

// ---------------------------------------------------------------------------
// loadSchemaOrError
// ---------------------------------------------------------------------------

describe('loadSchemaOrError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns schema when found in registry', () => {
    jest.mocked(schemaRegistry.getSchema).mockReturnValue(MOCK_SCHEMA as never);
    const result = loadSchemaOrError('JPN');
    expect('schema' in result).toBe(true);
  });

  it('returns error when schema is not found', () => {
    jest.mocked(schemaRegistry.getSchema).mockReturnValue(undefined as never);
    const result = loadSchemaOrError('XXX');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.userMessage).toContain('XXX');
    }
  });
});

// ---------------------------------------------------------------------------
// persistFormData
// ---------------------------------------------------------------------------

describe('persistFormData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls updateTripLeg with formData and status for single-traveler case', async () => {
    const updateTripLeg = jest.fn().mockResolvedValue(undefined);
    const leg = makeLeg();

    await persistFormData({
      leg,
      rawFormData: { name: 'John' },
      isValid: true,
      hasMultipleTravelers: false,
      activeTravelerId: null,
      assignedTravelers: [],
      getLegById: () => leg,
      legId: leg.id,
      updateTripLeg,
      completionPercentage: 100,
    });

    expect(updateTripLeg).toHaveBeenCalledWith(leg.id, {
      formData: { name: 'John' },
      formStatus: 'ready',
    });
  });

  it('sets formStatus to "in_progress" when form is not valid', async () => {
    const updateTripLeg = jest.fn().mockResolvedValue(undefined);
    const leg = makeLeg();

    await persistFormData({
      leg,
      rawFormData: { partial: true },
      isValid: false,
      hasMultipleTravelers: false,
      activeTravelerId: null,
      assignedTravelers: [],
      getLegById: () => leg,
      legId: leg.id,
      updateTripLeg,
      completionPercentage: 40,
    });

    expect(updateTripLeg).toHaveBeenCalledWith(leg.id, {
      formData: { partial: true },
      formStatus: 'in_progress',
    });
  });

  it('strips PII before persisting', async () => {
    const updateTripLeg = jest.fn().mockResolvedValue(undefined);
    const leg = makeLeg();

    await persistFormData({
      leg,
      rawFormData: { passport: 'AB123' },
      isValid: false,
      hasMultipleTravelers: false,
      activeTravelerId: null,
      assignedTravelers: [],
      getLegById: () => leg,
      legId: leg.id,
      updateTripLeg,
      completionPercentage: 50,
    });

    expect(stripPIIFromFormData).toHaveBeenCalledWith({ passport: 'AB123' });
  });

  it('upserts traveler form data in multi-traveler mode', async () => {
    const updateTripLeg = jest.fn().mockResolvedValue(undefined);
    const leg = makeLeg({ assignedTravelers: ['t1', 't2'], travelerFormsData: [] });

    await persistFormData({
      leg,
      rawFormData: { field: 'val' },
      isValid: true,
      hasMultipleTravelers: true,
      activeTravelerId: 't1',
      assignedTravelers: ['t1', 't2'],
      getLegById: () => leg,
      legId: leg.id,
      updateTripLeg,
      completionPercentage: 100,
    });

    expect(updateTripLeg).toHaveBeenCalledTimes(1);
    const call = updateTripLeg.mock.calls[0];
    expect(call[1].travelerFormsData).toBeDefined();
    expect(call[1].travelerFormsData[0].travelerId).toBe('t1');
  });

  it('uses statusOverride when provided', async () => {
    const updateTripLeg = jest.fn().mockResolvedValue(undefined);
    const leg = makeLeg();

    await persistFormData({
      leg,
      rawFormData: { x: 1 },
      isValid: false,
      hasMultipleTravelers: false,
      activeTravelerId: null,
      assignedTravelers: [],
      getLegById: () => leg,
      legId: leg.id,
      updateTripLeg,
      completionPercentage: 50,
      statusOverride: 'ready',
    });

    expect(updateTripLeg).toHaveBeenCalledWith(leg.id, {
      formData: { x: 1 },
      formStatus: 'ready',
    });
  });
});

// ---------------------------------------------------------------------------
// resolveFormGenerationContext
// ---------------------------------------------------------------------------

describe('resolveFormGenerationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns error when trip is null', () => {
    const result = resolveFormGenerationContext({
      trip: null,
      leg: makeLeg(),
      profile: makeProfile(),
      hasMultipleTravelers: false,
      activeTravelerId: null,
      travelerProfiles: new Map(),
      getTravelerFormData: () => undefined,
      legId: 'leg-1',
    });
    expect('error' in result).toBe(true);
  });

  it('returns error when leg is null', () => {
    const result = resolveFormGenerationContext({
      trip: {},
      leg: null,
      profile: makeProfile(),
      hasMultipleTravelers: false,
      activeTravelerId: null,
      travelerProfiles: new Map(),
      getTravelerFormData: () => undefined,
      legId: 'leg-1',
    });
    expect('error' in result).toBe(true);
  });

  it('returns profile, schema, and initialData for single-traveler mode', () => {
    jest.mocked(schemaRegistry.getSchema).mockReturnValue(MOCK_SCHEMA as never);
    const profile = makeProfile();
    const leg = makeLeg({ formData: { existing: 'data' } });

    const result = resolveFormGenerationContext({
      trip: {},
      leg,
      profile,
      hasMultipleTravelers: false,
      activeTravelerId: null,
      travelerProfiles: new Map(),
      getTravelerFormData: () => undefined,
      legId: 'leg-1',
    });

    expect('profile' in result).toBe(true);
    if ('profile' in result) {
      expect(result.profile.id).toBe('profile-1');
      expect(result.initialData).toEqual({ existing: 'data' });
    }
  });

  it('returns error when profile is null in single-traveler mode', () => {
    const result = resolveFormGenerationContext({
      trip: {},
      leg: makeLeg(),
      profile: null,
      hasMultipleTravelers: false,
      activeTravelerId: null,
      travelerProfiles: new Map(),
      getTravelerFormData: () => undefined,
      legId: 'leg-1',
    });
    expect('error' in result).toBe(true);
  });

  it('returns traveler profile in multi-traveler mode', () => {
    jest.mocked(schemaRegistry.getSchema).mockReturnValue(MOCK_SCHEMA as never);
    const traveler = makeProfile({ id: 't1', givenNames: 'JANE' });
    const profiles = new Map([['t1', traveler]]);

    const result = resolveFormGenerationContext({
      trip: {},
      leg: makeLeg(),
      profile: null,
      hasMultipleTravelers: true,
      activeTravelerId: 't1',
      travelerProfiles: profiles,
      getTravelerFormData: () => undefined,
      legId: 'leg-1',
    });

    expect('profile' in result).toBe(true);
    if ('profile' in result) {
      expect(result.profile.givenNames).toBe('JANE');
    }
  });

  it('returns error in multi-traveler mode when activeTravelerId is null', () => {
    const result = resolveFormGenerationContext({
      trip: {},
      leg: makeLeg(),
      profile: null,
      hasMultipleTravelers: true,
      activeTravelerId: null,
      travelerProfiles: new Map(),
      getTravelerFormData: () => undefined,
      legId: 'leg-1',
    });
    expect('error' in result).toBe(true);
  });

  it('returns error in multi-traveler mode when traveler profile not found', () => {
    const result = resolveFormGenerationContext({
      trip: {},
      leg: makeLeg(),
      profile: null,
      hasMultipleTravelers: true,
      activeTravelerId: 'missing',
      travelerProfiles: new Map([['other', makeProfile()]]),
      getTravelerFormData: () => undefined,
      legId: 'leg-1',
    });
    expect('error' in result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildTravelerTabs
// ---------------------------------------------------------------------------

describe('buildTravelerTabs', () => {
  it('returns a tab for each assigned traveler', () => {
    const profiles = new Map([
      ['t1', makeProfile({ id: 't1', givenNames: 'JOHN ADAM' })],
      ['t2', makeProfile({ id: 't2', givenNames: 'JANE' })],
    ]);

    const tabs = buildTravelerTabs({
      assignedTravelers: ['t1', 't2'],
      activeTravelerId: 't1',
      travelerProfiles: profiles,
      getTravelerFormData: () => undefined,
      legId: 'leg-1',
      currentFormStats: null,
      isValid: false,
    });

    expect(tabs).toHaveLength(2);
    expect(tabs[0].id).toBe('t1');
    expect(tabs[0].name).toBe('JOHN');
    expect(tabs[1].id).toBe('t2');
    expect(tabs[1].name).toBe('JANE');
  });

  it('uses currentFormStats for active traveler', () => {
    const profiles = new Map([['t1', makeProfile({ id: 't1' })]]);

    const tabs = buildTravelerTabs({
      assignedTravelers: ['t1'],
      activeTravelerId: 't1',
      travelerProfiles: profiles,
      getTravelerFormData: () => undefined,
      legId: 'leg-1',
      currentFormStats: { completionPercentage: 75 },
      isValid: false,
    });

    expect(tabs[0].completionPercentage).toBe(75);
    expect(tabs[0].formStatus).toBe('in_progress');
  });

  it('sets formStatus to "ready" when active traveler is 100% and valid', () => {
    const profiles = new Map([['t1', makeProfile({ id: 't1' })]]);

    const tabs = buildTravelerTabs({
      assignedTravelers: ['t1'],
      activeTravelerId: 't1',
      travelerProfiles: profiles,
      getTravelerFormData: () => undefined,
      legId: 'leg-1',
      currentFormStats: { completionPercentage: 100 },
      isValid: true,
    });

    expect(tabs[0].formStatus).toBe('ready');
  });

  it('uses stored form data for non-active travelers', () => {
    const profiles = new Map([
      ['t1', makeProfile({ id: 't1' })],
      ['t2', makeProfile({ id: 't2' })],
    ]);

    const tabs = buildTravelerTabs({
      assignedTravelers: ['t1', 't2'],
      activeTravelerId: 't1',
      travelerProfiles: profiles,
      getTravelerFormData: (_legId, tId) =>
        tId === 't2'
          ? makeTravelerFormData({ travelerId: 't2', formStatus: 'ready', completionPercentage: 100 })
          : undefined,
      legId: 'leg-1',
      currentFormStats: null,
      isValid: false,
    });

    expect(tabs[1].completionPercentage).toBe(100);
    expect(tabs[1].formStatus).toBe('ready');
  });

  it('defaults name to "Traveler" when profile is not found', () => {
    const tabs = buildTravelerTabs({
      assignedTravelers: ['unknown'],
      activeTravelerId: null,
      travelerProfiles: new Map(),
      getTravelerFormData: () => undefined,
      legId: 'leg-1',
      currentFormStats: null,
      isValid: false,
    });

    expect(tabs[0].name).toBe('Traveler');
  });
});
