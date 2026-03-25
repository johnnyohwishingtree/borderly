/**
 * Unit tests for useQRWallet hook.
 *
 * Tests QR wallet state management, filtering, navigation, and modal controls
 * via renderHook. Database and store dependencies are fully mocked.
 */
import { renderHook, act } from '@testing-library/react-native';
import React, { useEffect } from 'react';
import { useQRWallet } from '../../src/hooks/useQRWallet';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  // useFocusEffect behaves like useEffect — run the callback once on mount
  useFocusEffect: (callback: () => void | (() => void)) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const cleanup = callback();
      return typeof cleanup === 'function' ? cleanup : undefined;
    }, [callback]);
  },
}));

const mockSetLoading = jest.fn();
const mockSetLoadingError = jest.fn();
const mockSetLoadingSuccess = jest.fn();
const mockReset = jest.fn();
const mockRetry = jest.fn();

jest.mock('../../src/components/ui/LoadingStates', () => ({
  useLoadingState: () => ({
    state: 'idle' as const,
    error: undefined,
    setLoading: mockSetLoading,
    setLoadingError: mockSetLoadingError,
    setLoadingSuccess: mockSetLoadingSuccess,
    reset: mockReset,
    retry: mockRetry,
  }),
}));

jest.mock('../../src/components/ui/HapticFeedback', () => ({
  HapticFeedback: {
    card: jest.fn(),
    button: jest.fn(),
    refresh: jest.fn(),
  },
}));

const mockGetAllProfiles = jest.fn().mockResolvedValue(new Map());

jest.mock('../../src/stores/useProfileStore', () => ({
  useProfileStore: () => ({
    getAllProfiles: mockGetAllProfiles,
  }),
}));

const mockFetch = jest.fn().mockResolvedValue([]);
const mockQuery = jest.fn(() => ({ fetch: mockFetch }));
const mockGet = jest.fn(() => ({ query: mockQuery }));
const mockGetDatabase = jest.fn().mockResolvedValue({
  collections: { get: mockGet },
});

jest.mock('../../src/services/storage', () => ({
  databaseService: {
    getDatabase: (...args: unknown[]) => mockGetDatabase(...args),
  },
}));

jest.mock('../../src/services/storage/models', () => ({}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

interface MockQR {
  id: string;
  label: string;
  travelerId?: string | null;
  savedAt: Date;
  destroyPermanently: jest.Mock;
}

const makeQR = (overrides: Partial<MockQR> = {}): MockQR => ({
  id: 'qr_1',
  label: 'Test QR',
  travelerId: 'traveler_1',
  savedAt: new Date('2026-01-15T00:00:00.000Z'),
  destroyPermanently: jest.fn(),
  ...overrides,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderQRWallet() {
  const filterTriggerRef = React.createRef<any>();
  return renderHook(() => useQRWallet({ filterTriggerRef }));
}

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue([]);
  mockGetAllProfiles.mockResolvedValue(new Map());
});

// ── Initial state ─────────────────────────────────────────────────────────────

describe('useQRWallet — initial state', () => {
  it('returns empty qrCodes array', async () => {
    const { result } = renderQRWallet();
    await act(async () => {});

    expect(result.current.qrCodes).toEqual([]);
  });

  it('returns isRefreshing as false', async () => {
    const { result } = renderQRWallet();
    await act(async () => {});

    expect(result.current.isRefreshing).toBe(false);
  });

  it('returns selectedQR as null', async () => {
    const { result } = renderQRWallet();
    await act(async () => {});

    expect(result.current.selectedQR).toBeNull();
  });

  it('returns fullScreenVisible as false', async () => {
    const { result } = renderQRWallet();
    await act(async () => {});

    expect(result.current.fullScreenVisible).toBe(false);
  });
});

// ── Filtering ─────────────────────────────────────────────────────────────────

describe('useQRWallet — filteredQRCodes', () => {
  it('returns all QR codes when no filter is set', async () => {
    const qrs = [
      makeQR({ id: 'qr_1', travelerId: 'traveler_1' }),
      makeQR({ id: 'qr_2', travelerId: 'traveler_2' }),
    ];
    mockFetch.mockResolvedValue(qrs);

    const { result } = renderQRWallet();
    await act(async () => {});

    expect(result.current.filteredQRCodes).toHaveLength(2);
    expect(result.current.filteredQRCodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'qr_1' }),
        expect.objectContaining({ id: 'qr_2' }),
      ]),
    );
  });

  it('filters by travelerId when a traveler filter is selected', async () => {
    const qrs = [
      makeQR({ id: 'qr_1', travelerId: 'traveler_1' }),
      makeQR({ id: 'qr_2', travelerId: 'traveler_2' }),
      makeQR({ id: 'qr_3', travelerId: 'traveler_1' }),
    ];
    mockFetch.mockResolvedValue(qrs);

    const { result } = renderQRWallet();
    await act(async () => {});

    act(() => {
      result.current.setSelectedTravelerFilter('traveler_1');
    });

    expect(result.current.filteredQRCodes).toHaveLength(2);
    expect(result.current.filteredQRCodes.every((qr) => qr.travelerId === 'traveler_1')).toBe(true);
  });

  it('filters unassigned QR codes when filter is "unassigned"', async () => {
    const qrs = [
      makeQR({ id: 'qr_1', travelerId: 'traveler_1' }),
      makeQR({ id: 'qr_2', travelerId: null }),
      makeQR({ id: 'qr_3', travelerId: null }),
    ];
    mockFetch.mockResolvedValue(qrs);

    const { result } = renderQRWallet();
    await act(async () => {});

    act(() => {
      result.current.setSelectedTravelerFilter('unassigned');
    });

    expect(result.current.filteredQRCodes).toHaveLength(2);
    expect(result.current.filteredQRCodes.every((qr) => qr.travelerId === null)).toBe(true);
  });
});

// ── QR press / full screen ────────────────────────────────────────────────────

describe('useQRWallet — handleQRPress', () => {
  it('sets selectedQR and fullScreenVisible to true', async () => {
    const qr = makeQR();
    mockFetch.mockResolvedValue([qr]);

    const { result } = renderQRWallet();
    await act(async () => {});

    act(() => {
      result.current.handleQRPress(qr as any);
    });

    expect(result.current.selectedQR).toBe(qr);
    expect(result.current.fullScreenVisible).toBe(true);
  });
});

describe('useQRWallet — handleCloseFullScreen', () => {
  it('clears selectedQR and sets fullScreenVisible to false', async () => {
    const qr = makeQR();
    mockFetch.mockResolvedValue([qr]);

    const { result } = renderQRWallet();
    await act(async () => {});

    // First open full screen
    act(() => {
      result.current.handleQRPress(qr as any);
    });

    expect(result.current.fullScreenVisible).toBe(true);

    // Then close it
    act(() => {
      result.current.handleCloseFullScreen();
    });

    expect(result.current.selectedQR).toBeNull();
    expect(result.current.fullScreenVisible).toBe(false);
  });
});

// ── Navigation ────────────────────────────────────────────────────────────────

describe('useQRWallet — handleAddQR', () => {
  it('navigates to AddQR screen', async () => {
    const { result } = renderQRWallet();
    await act(async () => {});

    act(() => {
      result.current.handleAddQR();
    });

    expect(mockNavigate).toHaveBeenCalledWith('AddQR');
  });
});

// ── Filter modal ──────────────────────────────────────────────────────────────

describe('useQRWallet — handleCloseFilterModal', () => {
  it('sets showFilterModal to false', async () => {
    const { result } = renderQRWallet();
    await act(async () => {});

    // Open the filter modal first
    act(() => {
      result.current.setShowFilterModal(true);
    });

    expect(result.current.showFilterModal).toBe(true);

    // Close it
    act(() => {
      result.current.handleCloseFilterModal();
    });

    expect(result.current.showFilterModal).toBe(false);
  });
});
