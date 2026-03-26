/**
 * Tests for usePassportValidity hook.
 *
 * The hook checks if the traveler's passport meets a destination country's
 * validity requirements. Returns null when valid, warning data when not.
 */

import { renderHook } from '@testing-library/react-native';
import { usePassportValidity } from '../../src/hooks/usePassportValidity';
import { useProfileStore } from '../../src/stores/useProfileStore';
import { schemaRegistry } from '../../src/services/schemas/schemaRegistry';
import { checkPassportValidity } from '../../src/services/documents';

// Mock stores and services directly (not barrels) to prevent OOM
jest.mock('../../src/stores/useProfileStore');
jest.mock('../../src/services/schemas/schemaRegistry', () => ({
  schemaRegistry: { getSchema: jest.fn() },
}));
jest.mock('../../src/services/documents', () => ({
  checkPassportValidity: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Stable mock data (module-level to prevent infinite re-render loops)
// ---------------------------------------------------------------------------

const VALID_PROFILE = {
  id: 'p1',
  passportNumber: 'AB1234567',
  surname: 'DOE',
  givenNames: 'JOHN',
  nationality: 'USA',
  dateOfBirth: '1990-01-15',
  gender: 'M' as const,
  passportExpiry: '2030-06-15',
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
};

const SCHEMA_WITH_VALIDITY = {
  countryCode: 'JPN',
  countryName: 'Japan',
  passportValidityMonths: 6,
  schemaVersion: '1.0.0',
  lastUpdated: '2025-01-01',
  portalUrl: 'https://vjw.digital.go.jp',
  portalName: 'Visit Japan Web',
  submissionDeadlineHours: 72,
  recommendedLeadTimeHours: 24,
  submissionWindowNote: '',
  sections: [],
  submissionGuide: [],
};

const SCHEMA_NO_VALIDITY = {
  ...SCHEMA_WITH_VALIDITY,
  passportValidityMonths: undefined,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('usePassportValidity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: profile loaded, schema found, passport valid
    jest.mocked(useProfileStore).mockImplementation(
      ((selector: (state: unknown) => unknown) =>
        selector({ profile: VALID_PROFILE })) as never,
    );
    jest.mocked(schemaRegistry.getSchema).mockReturnValue(SCHEMA_WITH_VALIDITY as never);
    jest.mocked(checkPassportValidity).mockReturnValue({
      isValid: true,
      daysUntilExpiry: 1800,
      requiredValidityDays: 180,
      shortfallDays: 0,
    });
  });

  it('returns null when passport is valid', () => {
    const { result } = renderHook(() =>
      usePassportValidity({ countryCode: 'JPN', departureDate: '2025-06-01' }),
    );
    expect(result.current).toBeNull();
  });

  it('returns warning data when passport does not meet validity requirements', () => {
    jest.mocked(checkPassportValidity).mockReturnValue({
      isValid: false,
      daysUntilExpiry: 90,
      requiredValidityDays: 180,
      shortfallDays: 90,
    });

    const { result } = renderHook(() =>
      usePassportValidity({ countryCode: 'JPN', departureDate: '2025-06-01' }),
    );

    expect(result.current).not.toBeNull();
    expect(result.current!.status.isValid).toBe(false);
    expect(result.current!.countryName).toBe('Japan');
    expect(result.current!.requiredMonths).toBe(6);
    expect(result.current!.passportExpiry).toBe('2030-06-15');
  });

  it('returns null when no profile is loaded', () => {
    jest.mocked(useProfileStore).mockImplementation(
      ((selector: (state: unknown) => unknown) =>
        selector({ profile: null })) as never,
    );

    const { result } = renderHook(() =>
      usePassportValidity({ countryCode: 'JPN', departureDate: '2025-06-01' }),
    );
    expect(result.current).toBeNull();
  });

  it('returns null when countryCode is empty', () => {
    const { result } = renderHook(() =>
      usePassportValidity({ countryCode: '', departureDate: '2025-06-01' }),
    );
    expect(result.current).toBeNull();
  });

  it('returns null when departureDate is not provided', () => {
    const { result } = renderHook(() =>
      usePassportValidity({ countryCode: 'JPN', departureDate: undefined }),
    );
    expect(result.current).toBeNull();
  });

  it('returns null when no schema is found for the country', () => {
    jest.mocked(schemaRegistry.getSchema).mockReturnValue(undefined as never);

    const { result } = renderHook(() =>
      usePassportValidity({ countryCode: 'XXX', departureDate: '2025-06-01' }),
    );
    expect(result.current).toBeNull();
  });

  it('returns null when country has no passportValidityMonths requirement', () => {
    jest.mocked(schemaRegistry.getSchema).mockReturnValue(SCHEMA_NO_VALIDITY as never);

    const { result } = renderHook(() =>
      usePassportValidity({ countryCode: 'JPN', departureDate: '2025-06-01' }),
    );
    expect(result.current).toBeNull();
  });

  it('returns null when passportValidityMonths is explicitly 0', () => {
    jest.mocked(schemaRegistry.getSchema).mockReturnValue({
      ...SCHEMA_WITH_VALIDITY,
      passportValidityMonths: 0,
    } as never);

    const { result } = renderHook(() =>
      usePassportValidity({ countryCode: 'JPN', departureDate: '2025-06-01' }),
    );
    expect(result.current).toBeNull();
  });

  it('passes profile, departureDate, and schema to checkPassportValidity', () => {
    renderHook(() =>
      usePassportValidity({ countryCode: 'JPN', departureDate: '2025-06-01' }),
    );

    expect(checkPassportValidity).toHaveBeenCalledWith(
      VALID_PROFILE,
      '2025-06-01',
      SCHEMA_WITH_VALIDITY,
    );
  });
});
