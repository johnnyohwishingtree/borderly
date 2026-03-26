/**
 * Tests for tripStoreQRSlice: createQRSlice
 */

import type { TripStore } from '../../src/stores/useTripStoreTypes';
import type { Trip, TripLeg, SavedQRCode } from '../../src/types/trip';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockSaveQRCode = jest.fn();
const mockDeleteQRCode = jest.fn();
const mockGetQRCodes = jest.fn();

jest.mock('@/services/storage', () => ({
  databaseService: {
    saveQRCode: (...args: unknown[]) => mockSaveQRCode(...args),
    deleteQRCode: (...args: unknown[]) => mockDeleteQRCode(...args),
    getQRCodes: (...args: unknown[]) => mockGetQRCodes(...args),
  },
}));

import { createQRSlice } from '../../src/stores/tripStoreQRSlice';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function createQRCode(overrides: Partial<SavedQRCode> = {}): SavedQRCode {
  return {
    id: 'qr-1',
    legId: 'leg-1',
    type: 'customs',
    imageBase64: 'data:image/png;base64,abc123',
    savedAt: '2025-07-01T00:00:00Z',
    label: 'Visit Japan Web - Customs QR',
    ...overrides,
  };
}

function createLeg(overrides: Partial<TripLeg> = {}): TripLeg {
  return {
    id: 'leg-1',
    tripId: 'trip-1',
    destinationCountry: 'JPN',
    arrivalDate: '2025-07-01',
    accommodation: {
      name: 'Hotel',
      address: { line1: '1-1', city: 'Tokyo', postalCode: '100', country: 'JPN' },
    },
    formStatus: 'not_started',
    submissionStatus: 'not_started',
    order: 0,
    assignedTravelers: [],
    travelerFormsData: [],
    qrCodes: [],
    ...overrides,
  };
}

function createTrip(legs: TripLeg[] = [createLeg()]): Trip {
  return {
    id: 'trip-1',
    name: 'Test Trip',
    status: 'upcoming',
    legs,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createQRSlice', () => {
  let set: jest.Mock;
  let get: jest.Mock;
  let storeState: Partial<TripStore>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSaveQRCode.mockResolvedValue(undefined);
    mockDeleteQRCode.mockResolvedValue(undefined);
    mockGetQRCodes.mockResolvedValue([]);

    storeState = {
      trips: [createTrip()],
      isLoading: false,
      error: null,
    };

    set = jest.fn((partial) => {
      if (typeof partial === 'function') {
        const updates = partial(storeState as TripStore);
        Object.assign(storeState, updates);
      } else {
        Object.assign(storeState, partial);
      }
    });

    get = jest.fn(() => storeState as TripStore);
  });

  // -----------------------------------------------------------------------
  // addQRCode
  // -----------------------------------------------------------------------

  describe('addQRCode', () => {
    const qrData = {
      type: 'customs' as const,
      imageBase64: 'data:image/png;base64,newqr123',
      label: 'New QR Code',
    };

    it('saves QR code to database and refreshes from DB', async () => {
      mockGetQRCodes.mockResolvedValue([
        {
          id: 'qr-new',
          legId: 'leg-1',
          type: 'customs',
          imageBase64: 'data:image/png;base64,newqr123',
          savedAtISO: '2025-07-01T00:00:00Z',
          label: 'New QR Code',
        },
      ]);

      const slice = createQRSlice(set, get);
      await slice.addQRCode('leg-1', qrData);

      expect(mockSaveQRCode).toHaveBeenCalledWith({
        ...qrData,
        legId: 'leg-1',
      });
      expect(mockGetQRCodes).toHaveBeenCalledWith('leg-1');
    });

    it('updates the leg qrCodes in local state', async () => {
      mockGetQRCodes.mockResolvedValue([
        {
          id: 'qr-new',
          legId: 'leg-1',
          type: 'customs',
          imageBase64: 'data:image/png;base64,newqr123',
          savedAtISO: '2025-07-01T00:00:00Z',
          label: 'New QR Code',
        },
      ]);

      const slice = createQRSlice(set, get);
      await slice.addQRCode('leg-1', qrData);

      expect(set).toHaveBeenCalledWith(expect.any(Function));
      const functionalCall = set.mock.calls[0][0];
      const result = functionalCall({ trips: [createTrip()] });
      expect(result.trips[0].legs[0].qrCodes).toHaveLength(1);
      expect(result.trips[0].legs[0].qrCodes[0].id).toBe('qr-new');
    });

    it('sets error on failure', async () => {
      mockSaveQRCode.mockRejectedValue(new Error('save QR failed'));

      const slice = createQRSlice(set, get);
      await slice.addQRCode('leg-1', qrData);

      expect(set).toHaveBeenCalledWith({
        error: 'save QR failed',
      });
    });

    it('handles non-Error thrown values', async () => {
      mockSaveQRCode.mockRejectedValue('string error');

      const slice = createQRSlice(set, get);
      await slice.addQRCode('leg-1', qrData);

      expect(set).toHaveBeenCalledWith({
        error: 'Failed to add QR code',
      });
    });
  });

  // -----------------------------------------------------------------------
  // removeQRCode
  // -----------------------------------------------------------------------

  describe('removeQRCode', () => {
    it('deletes QR code from database', async () => {
      const slice = createQRSlice(set, get);
      await slice.removeQRCode('qr-1');

      expect(mockDeleteQRCode).toHaveBeenCalledWith('qr-1');
    });

    it('filters out removed QR code from local state', async () => {
      storeState.trips = [createTrip([createLeg({ qrCodes: [createQRCode()] })])];

      const slice = createQRSlice(set, get);
      await slice.removeQRCode('qr-1');

      const functionalCall = set.mock.calls[0][0];
      const result = functionalCall({
        trips: [createTrip([createLeg({ qrCodes: [createQRCode()] })])],
      });
      expect(result.trips[0].legs[0].qrCodes).toHaveLength(0);
    });

    it('preserves other QR codes when removing one', async () => {
      const qr1 = createQRCode({ id: 'qr-1' });
      const qr2 = createQRCode({ id: 'qr-2' });
      storeState.trips = [createTrip([createLeg({ qrCodes: [qr1, qr2] })])];

      const slice = createQRSlice(set, get);
      await slice.removeQRCode('qr-1');

      const functionalCall = set.mock.calls[0][0];
      const result = functionalCall({
        trips: [createTrip([createLeg({ qrCodes: [qr1, qr2] })])],
      });
      expect(result.trips[0].legs[0].qrCodes).toHaveLength(1);
      expect(result.trips[0].legs[0].qrCodes[0].id).toBe('qr-2');
    });

    it('sets error on failure', async () => {
      mockDeleteQRCode.mockRejectedValue(new Error('delete QR failed'));

      const slice = createQRSlice(set, get);
      await slice.removeQRCode('qr-1');

      expect(set).toHaveBeenCalledWith({
        error: 'delete QR failed',
      });
    });
  });

  // -----------------------------------------------------------------------
  // getQRCodesForLeg
  // -----------------------------------------------------------------------

  describe('getQRCodesForLeg', () => {
    it('returns QR codes for matching leg', () => {
      const qr = createQRCode();
      storeState.trips = [createTrip([createLeg({ qrCodes: [qr] })])];
      get.mockReturnValue(storeState);

      const slice = createQRSlice(set, get);
      expect(slice.getQRCodesForLeg('leg-1')).toEqual([qr]);
    });

    it('returns empty array for leg with no QR codes', () => {
      storeState.trips = [createTrip([createLeg()])];
      get.mockReturnValue(storeState);

      const slice = createQRSlice(set, get);
      expect(slice.getQRCodesForLeg('leg-1')).toEqual([]);
    });

    it('returns empty array for nonexistent leg', () => {
      const slice = createQRSlice(set, get);
      expect(slice.getQRCodesForLeg('nonexistent')).toEqual([]);
    });

    it('searches across multiple trips', () => {
      const qr = createQRCode({ legId: 'leg-2' });
      const trip2 = createTrip([createLeg({ id: 'leg-2', qrCodes: [qr] })]);
      trip2.id = 'trip-2';
      storeState.trips = [createTrip(), trip2];
      get.mockReturnValue(storeState);

      const slice = createQRSlice(set, get);
      expect(slice.getQRCodesForLeg('leg-2')).toEqual([qr]);
    });
  });
});
