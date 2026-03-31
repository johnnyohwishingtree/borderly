import { renderHook, waitFor } from '@testing-library/react-native';
import { usePortalLinks } from '../../src/hooks/usePortalLinks';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockGetTripById = jest.fn();

jest.mock('../../src/stores/useTripStore', () => {
  const store = () => ({});
  store.getState = () => ({ getTripById: mockGetTripById });
  return { useTripStore: store };
});

const mockGetSchema = jest.fn();
const mockInitializeSchemaRegistry = jest.fn().mockResolvedValue(undefined);

jest.mock('../../src/services/schemas', () => ({
  schemaRegistry: { getSchema: (...args: unknown[]) => mockGetSchema(...args) },
  initializeSchemaRegistry: (...args: unknown[]) => mockInitializeSchemaRegistry(...args),
}));

const mockTrip = {
  id: 'trip_1',
  legs: [
    { id: 'leg_1', destinationCountry: 'MYS', submissionStatus: 'not_started' },
  ],
};

const mockSchema = {
  countryCode: 'MYS',
  portalName: 'Malaysia Digital Arrival Card',
  portalUrl: 'https://imigresen-online.imi.gov.my/mdac/',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetTripById.mockReturnValue(mockTrip);
  mockGetSchema.mockReturnValue(mockSchema);
});

describe('usePortalLinks', () => {
  it('reads trip from getState() not stale render snapshot', async () => {
    const { result } = renderHook(() =>
      usePortalLinks({ tripId: 'trip_1', countryCodes: ['MYS'] }),
    );

    await waitFor(() => expect(result.current.portalCards).toHaveLength(1));

    // Must use getState() pattern, not the hook's render snapshot
    expect(mockGetTripById).toHaveBeenCalledWith('trip_1');
    expect(result.current.portalCards[0].countryCode).toBe('MYS');
    expect(result.current.portalCards[0].portalUrl).toBe(mockSchema.portalUrl);
  });

  it('initializes schema registry before reading schemas', async () => {
    const { result } = renderHook(() =>
      usePortalLinks({ tripId: 'trip_1', countryCodes: ['MYS'] }),
    );

    await waitFor(() => expect(result.current.portalCards).toHaveLength(1));

    const initOrder = mockInitializeSchemaRegistry.mock.invocationCallOrder[0];
    const schemaOrder = mockGetSchema.mock.invocationCallOrder[0];
    expect(initOrder).toBeLessThan(schemaOrder);
  });

  it('navigates to PortalSubmission with correct params', async () => {
    const { result } = renderHook(() =>
      usePortalLinks({ tripId: 'trip_1', countryCodes: ['MYS'] }),
    );

    await waitFor(() => expect(result.current.portalCards).toHaveLength(1));

    result.current.launchPortal('MYS');

    expect(mockNavigate).toHaveBeenCalledWith('PortalSubmission', {
      url: mockSchema.portalUrl,
      countryCode: 'MYS',
      tripId: 'trip_1',
      legId: 'leg_1',
    });
  });

  it('returns empty cards when tripId is empty', async () => {
    const { result } = renderHook(() =>
      usePortalLinks({ tripId: '', countryCodes: ['MYS'] }),
    );

    // Should not even call getTripById
    await waitFor(() => expect(result.current.portalCards).toHaveLength(0));
    expect(mockGetTripById).not.toHaveBeenCalled();
  });

  it('skips countries without schemas', async () => {
    mockGetSchema.mockReturnValue(null);

    const { result } = renderHook(() =>
      usePortalLinks({ tripId: 'trip_1', countryCodes: ['MYS'] }),
    );

    await waitFor(() => expect(mockInitializeSchemaRegistry).toHaveBeenCalled());
    expect(result.current.portalCards).toHaveLength(0);
  });
});
