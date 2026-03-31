import { renderHook, waitFor } from '@testing-library/react-native';
import { useSmartForm } from '../../src/hooks/useSmartForm';

// ── Mock data ───────────────────────────────────────────────────────────────

const mockProfile = {
  id: 'profile_1',
  givenNames: 'John',
  surname: 'Smith',
  passportNumber: 'L12345678',
  nationality: 'USA',
  dateOfBirth: '1985-06-15',
  gender: 'M' as const,
  passportExpiry: '2032-03-20',
  issuingCountry: 'USA',
  defaultDeclarations: {
    hasItemsToDeclare: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockSchema = {
  countryCode: 'MYS',
  countryName: 'Malaysia',
  portalName: 'Malaysia Digital Arrival Card',
  portalUrl: 'https://imigresen-online.imi.gov.my/mdac/',
  schemaVersion: '1.0.0',
  sections: [
    {
      id: 'personal',
      title: 'Personal Information',
      fields: [
        { id: 'email', label: 'Email', type: 'text', required: true, countrySpecific: false, autoFillSource: 'profile.email' },
        { id: 'phone', label: 'Phone', type: 'text', required: true, countrySpecific: false, autoFillSource: 'profile.phoneNumber' },
      ],
    },
  ],
};

const mockFilledForm = {
  countryCode: 'MYS',
  countryName: 'Malaysia',
  portalName: 'Malaysia Digital Arrival Card',
  portalUrl: 'https://imigresen-online.imi.gov.my/mdac/',
  sections: [
    {
      id: 'personal',
      title: 'Personal Information',
      fields: [
        { id: 'email', label: 'Email', type: 'text', required: true, currentValue: '', source: 'empty', needsUserInput: true },
        { id: 'phone', label: 'Phone', type: 'text', required: true, currentValue: '', source: 'empty', needsUserInput: true },
      ],
    },
  ],
  stats: { totalFields: 2, autoFilled: 0, userFilled: 0, remaining: 2, completionPercentage: 0 },
};

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCreateTrip = jest.fn();
const mockAddTripLeg = jest.fn();
const mockGetTripById = jest.fn();
const mockAssignTravelersToLeg = jest.fn();
const mockGenerateForm = jest.fn();
const mockUpdateField = jest.fn();
const mockInitializeSchemaRegistry = jest.fn();
const mockGetSchema = jest.fn();

// Track what generateForm sets — simulates Zustand getState()
let mockCurrentForm: typeof mockFilledForm | null = null;

jest.mock('../../src/stores/useTripStore', () => {
  const store = () => ({
    createTrip: mockCreateTrip,
    addTripLeg: mockAddTripLeg,
    assignTravelersToLeg: mockAssignTravelersToLeg,
  });
  store.getState = () => ({ getTripById: mockGetTripById });
  return { useTripStore: store };
});

jest.mock('../../src/stores/useProfileStore', () => ({
  useProfileStore: () => ({
    currentProfile: mockProfile,
  }),
}));

jest.mock('../../src/stores/useFormStore', () => {
  const store = () => ({
    generateForm: mockGenerateForm,
    updateField: mockUpdateField,
    currentForm: null,
  });
  // Zustand's getState() — this is what the fix uses
  store.getState = () => ({ currentForm: mockCurrentForm });
  return { useFormStore: store };
});

jest.mock('../../src/services/schemas', () => ({
  schemaRegistry: { getSchema: (...args: unknown[]) => mockGetSchema(...args) },
  initializeSchemaRegistry: (...args: unknown[]) => mockInitializeSchemaRegistry(...args),
}));

// ── Setup ────────────────────────────────────────────────────────────────────

afterEach(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentForm = null;

  mockCreateTrip.mockResolvedValue({ id: 'trip_1', name: 'Test', status: 'upcoming', legs: [] });
  mockAddTripLeg.mockResolvedValue(undefined);
  mockGetTripById.mockReturnValue({
    id: 'trip_1',
    legs: [{ id: 'leg_1', tripId: 'trip_1', destinationCountry: 'MYS', arrivalDate: '2026-07-01', departureDate: '2026-07-07' }],
  });
  mockAssignTravelersToLeg.mockResolvedValue(undefined);
  mockInitializeSchemaRegistry.mockResolvedValue(undefined);
  mockGetSchema.mockReturnValue(mockSchema);

  // Simulate generateForm setting currentForm in the store
  mockGenerateForm.mockImplementation(() => {
    mockCurrentForm = mockFilledForm;
  });
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useSmartForm', () => {
  it('initializes schema registry before generating forms', async () => {
    const { result } = renderHook(() =>
      useSmartForm({ countryCodes: ['MYS'], travelerIds: ['profile_1'] }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Schema registry must be initialized BEFORE getSchema is called
    const initOrder = mockInitializeSchemaRegistry.mock.invocationCallOrder[0];
    const schemaOrder = mockGetSchema.mock.invocationCallOrder[0];
    expect(initOrder).toBeLessThan(schemaOrder);
  });

  it('reads form from getState() not stale render snapshot', async () => {
    const { result } = renderHook(() =>
      useSmartForm({ countryCodes: ['MYS'], travelerIds: ['profile_1'] }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // generateForm was called
    expect(mockGenerateForm).toHaveBeenCalledWith(mockProfile, expect.any(Object), mockSchema, {});
    // countrySections should have 1 entry with form data (not empty)
    expect(result.current.countrySections).toHaveLength(1);
    expect(result.current.countrySections[0].countryCode).toBe('MYS');
    expect(result.current.countrySections[0].totalFields).toBe(2);
    expect(result.current.countrySections[0].remainingFields).toBe(2);
  });

  it('produces empty sections when schema registry is not initialized', async () => {
    // Simulate schema registry throwing because it's not initialized
    mockGetSchema.mockImplementation(() => {
      throw new Error('Schema registry not initialized');
    });

    const { result } = renderHook(() =>
      useSmartForm({ countryCodes: ['MYS'], travelerIds: ['profile_1'] }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have error, no sections
    expect(result.current.error).toBeTruthy();
    expect(result.current.countrySections).toHaveLength(0);
  });

  it('returns no profile error when profile is missing', async () => {
    // Override the mock to return null profile — restore in afterEach via clearAllMocks
    const mod = require('../../src/stores/useProfileStore');
    jest.spyOn(mod, 'useProfileStore').mockReturnValue({
      currentProfile: null,
    });

    const { result } = renderHook(() =>
      useSmartForm({ countryCodes: ['MYS'], travelerIds: ['profile_1'] }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('No profile found');
  });

  it('creates trip and legs for each country code', async () => {
    mockGetTripById.mockReturnValue({
      id: 'trip_1',
      legs: [
        { id: 'leg_1', tripId: 'trip_1', destinationCountry: 'MYS' },
        { id: 'leg_2', tripId: 'trip_1', destinationCountry: 'JPN' },
      ],
    });

    const { result } = renderHook(() =>
      useSmartForm({ countryCodes: ['MYS', 'JPN'], travelerIds: ['profile_1'] }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(mockAddTripLeg).toHaveBeenCalledTimes(2);
    });

    expect(mockCreateTrip).toHaveBeenCalledTimes(1);
    expect(mockAddTripLeg).toHaveBeenCalledWith('trip_1', expect.objectContaining({ destinationCountry: 'MYS' }));
    expect(mockAddTripLeg).toHaveBeenCalledWith('trip_1', expect.objectContaining({ destinationCountry: 'JPN' }));
    expect(result.current.countrySections).toHaveLength(2);
  });

  it('calculates progress from filled vs total fields', async () => {
    // 2 total, 1 unfilled = 50% progress
    const halfFilledForm = {
      ...mockFilledForm,
      sections: [{
        ...mockFilledForm.sections[0],
        fields: [
          { id: 'email', label: 'Email', type: 'text', required: true, currentValue: 'a@b.com', source: 'auto', needsUserInput: false },
          { id: 'phone', label: 'Phone', type: 'text', required: true, currentValue: '', source: 'empty', needsUserInput: true },
        ],
      }],
    };
    mockGenerateForm.mockImplementation(() => { mockCurrentForm = halfFilledForm; });

    const { result } = renderHook(() =>
      useSmartForm({ countryCodes: ['MYS'], travelerIds: ['profile_1'] }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Debug: check if generateForm was called
    expect(mockGenerateForm).toHaveBeenCalled();
    expect(result.current.countrySections).toHaveLength(1);
    expect(result.current.overallProgress).toBe(0.5);
    expect(result.current.isAllComplete).toBe(false);
  });
});
