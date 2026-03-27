/**
 * Tests for DatabaseService — verifies CRUD operations for trips, trip legs,
 * and QR codes, plus performance metrics and lifecycle methods.
 *
 * The global jest.setup.js already mocks @nozbe/watermelondb, react-native-keychain,
 * and other native modules. We work with those mocks rather than overriding them.
 */

// Unmock the modules we're testing (jest.setup.js mocks them globally)
jest.unmock('@/services/storage/database');
jest.unmock('../../../src/services/storage/database');

// The global mock for watermelondb Schema/migrations is missing addColumns
jest.mock('@nozbe/watermelondb/Schema/migrations', () => ({
  schemaMigrations: jest.fn(({ migrations }) => migrations),
  createTable: jest.fn(() => ({})),
  addColumns: jest.fn(() => ({})),
}));

// Mock the models to avoid WatermelonDB Model import issues
jest.mock('../../../src/services/storage/models', () => ({
  Trip: class {},
  TripLeg: class {},
  SavedQRCode: class {},
}));

import { databaseService } from '../../../src/services/storage/database';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeTripRecord(overrides?: Record<string, unknown>) {
  return {
    id: 'trip-1',
    name: 'Tokyo Trip',
    status: 'upcoming',
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    update: jest.fn().mockImplementation((fn: (r: Record<string, unknown>) => void) => {
      const r: Record<string, unknown> = {};
      fn(r);
      return r;
    }),
    markAsDeleted: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeLegRecord(overrides?: Record<string, unknown>) {
  return {
    id: 'leg-1',
    tripId: 'trip-1',
    order: 1,
    countryCode: 'JPN',
    ...overrides,
  };
}

function makeQRRecord(overrides?: Record<string, unknown>) {
  return {
    id: 'qr-1',
    legId: 'leg-1',
    savedAt: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DatabaseService', () => {
  let mockDb: any;

  beforeEach(async () => {
    // Close the database to reset singleton state
    await databaseService.close();
    jest.clearAllMocks();

    // Initialize to get the mock database instance
    mockDb = await databaseService.initialize();
  });

  afterEach(async () => {
    await databaseService.close();
  });

  describe('initialize', () => {
    it('returns a database instance', async () => {
      await databaseService.close();
      const db = await databaseService.initialize();
      expect(db).not.toBeUndefined();
      expect(db).not.toBeNull();
      expect(db.collections).not.toBeUndefined();
    });

    it('returns same instance on subsequent calls', async () => {
      const db1 = await databaseService.initialize();
      const db2 = await databaseService.initialize();
      expect(db1).toBe(db2);
    });
  });

  describe('getDatabase', () => {
    it('returns the initialized database', async () => {
      const db = await databaseService.getDatabase();
      expect(db).not.toBeUndefined();
      expect(db).not.toBeNull();
      expect(db.collections).not.toBeUndefined();
    });
  });

  describe('getTrips', () => {
    it('returns all trips when no options provided', async () => {
      const trips = [makeTripRecord(), makeTripRecord({ id: 'trip-2' })];
      const mockCollection = mockDb.collections.get('trips');
      mockCollection.query().fetch.mockResolvedValue(trips);

      const result = await databaseService.getTrips();
      expect(result).toHaveLength(2);
    });

    it('filters trips by status', async () => {
      const trips = [
        makeTripRecord({ status: 'upcoming' }),
        makeTripRecord({ id: 'trip-2', status: 'completed' }),
      ];
      mockDb.collections.get('trips').query().fetch.mockResolvedValue(trips);

      const result = await databaseService.getTrips({ status: 'upcoming' });
      expect(result).toHaveLength(1);
      expect((result[0] as any).status).toBe('upcoming');
    });

    it('applies pagination', async () => {
      const trips = Array.from({ length: 10 }, (_, i) =>
        makeTripRecord({
          id: `trip-${i}`,
          name: `Trip ${i}`,
          updatedAt: `2025-06-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
        }),
      );
      mockDb.collections.get('trips').query().fetch.mockResolvedValue(trips);

      const result = await databaseService.getTrips({
        pagination: { limit: 3, offset: 2 },
      });
      expect(result).toHaveLength(3);
    });

    it('returns empty array when no trips exist', async () => {
      mockDb.collections.get('trips').query().fetch.mockResolvedValue([]);

      const result = await databaseService.getTrips();
      expect(result).toEqual([]);
    });

    it('sorts by name ascending', async () => {
      const trips = [
        makeTripRecord({ name: 'Zebra Trip', updatedAt: '2025-06-01T00:00:00Z' }),
        makeTripRecord({ id: 'trip-2', name: 'Alpha Trip', updatedAt: '2025-06-02T00:00:00Z' }),
      ];
      mockDb.collections.get('trips').query().fetch.mockResolvedValue(trips);

      const result = await databaseService.getTrips({ sortBy: 'name', sortOrder: 'asc' });
      expect((result[0] as any).name).toBe('Alpha Trip');
      expect((result[1] as any).name).toBe('Zebra Trip');
    });
  });

  describe('getTripCount', () => {
    it('returns total trip count', async () => {
      mockDb.collections.get('trips').query().fetch.mockResolvedValue([
        makeTripRecord(),
        makeTripRecord({ id: 'trip-2' }),
      ]);

      const count = await databaseService.getTripCount();
      expect(count).toBe(2);
    });

    it('returns filtered count by status', async () => {
      mockDb.collections.get('trips').query().fetch.mockResolvedValue([
        makeTripRecord({ status: 'upcoming' }),
        makeTripRecord({ id: 'trip-2', status: 'completed' }),
        makeTripRecord({ id: 'trip-3', status: 'upcoming' }),
      ]);

      const count = await databaseService.getTripCount('upcoming');
      expect(count).toBe(2);
    });

    it('returns 0 when no trips match', async () => {
      mockDb.collections.get('trips').query().fetch.mockResolvedValue([]);
      const count = await databaseService.getTripCount('active');
      expect(count).toBe(0);
    });
  });

  describe('createTrip', () => {
    it('creates a trip via the trips collection', async () => {
      const mockCreate = mockDb.collections.get('trips').create;
      mockCreate.mockImplementation((fn: (r: Record<string, unknown>) => void) => {
        const r: Record<string, unknown> = {};
        fn(r);
        return r;
      });

      await databaseService.createTrip({ name: 'New Trip' } as any);
      expect(mockCreate).toHaveBeenCalled();
    });

    it('defaults status to upcoming', async () => {
      let capturedRecord: Record<string, unknown> = {};
      mockDb.collections.get('trips').create.mockImplementation(
        (fn: (r: Record<string, unknown>) => void) => {
          capturedRecord = {};
          fn(capturedRecord);
          return capturedRecord;
        },
      );

      await databaseService.createTrip({} as any);
      expect(capturedRecord.status).toBe('upcoming');
    });
  });

  describe('updateTrip', () => {
    it('finds and updates trip by id', async () => {
      const tripRecord = makeTripRecord();
      mockDb.collections.get('trips').find.mockResolvedValue(tripRecord);

      await databaseService.updateTrip('trip-1', { name: 'Updated' } as any);
      expect(mockDb.collections.get('trips').find).toHaveBeenCalledWith('trip-1');
      expect(tripRecord.update).toHaveBeenCalled();
    });
  });

  describe('deleteTrip', () => {
    it('marks trip as deleted', async () => {
      const tripRecord = makeTripRecord();
      mockDb.collections.get('trips').find.mockResolvedValue(tripRecord);

      await databaseService.deleteTrip('trip-1');
      expect(tripRecord.markAsDeleted).toHaveBeenCalled();
    });

    it('throws when trip not found', async () => {
      mockDb.collections.get('trips').find.mockRejectedValue(new Error('Record not found'));

      await expect(databaseService.deleteTrip('nonexistent')).rejects.toThrow('Record not found');
    });
  });

  describe('getTripLegs', () => {
    it('returns legs filtered by trip ID and sorted by order', async () => {
      const legs = [
        makeLegRecord({ tripId: 'trip-1', order: 2, id: 'leg-2' }),
        makeLegRecord({ tripId: 'trip-1', order: 1, id: 'leg-1' }),
        makeLegRecord({ tripId: 'trip-2', order: 1, id: 'leg-3' }),
      ];
      mockDb.collections.get('trip_legs').query().fetch.mockResolvedValue(legs);

      const result = await databaseService.getTripLegs('trip-1');
      expect(result).toHaveLength(2);
      expect((result[0] as any).order).toBe(1);
      expect((result[1] as any).order).toBe(2);
    });

    it('returns empty array when no legs exist', async () => {
      mockDb.collections.get('trip_legs').query().fetch.mockResolvedValue([]);

      const result = await databaseService.getTripLegs('trip-1');
      expect(result).toEqual([]);
    });
  });

  describe('getTripsWithLegs', () => {
    it('returns trips with grouped legs', async () => {
      const trips = [makeTripRecord({ id: 'trip-1' }), makeTripRecord({ id: 'trip-2' })];
      const legs = [
        makeLegRecord({ tripId: 'trip-1', order: 1 }),
        makeLegRecord({ tripId: 'trip-2', order: 1, id: 'leg-2' }),
      ];

      // First fetch returns trips, second returns legs
      const mockFetch = mockDb.collections.get().query().fetch;
      mockFetch.mockResolvedValueOnce(trips).mockResolvedValueOnce(legs);

      const result = await databaseService.getTripsWithLegs();
      expect(result).toHaveLength(2);
      expect(result[0].legs).toHaveLength(1);
      expect(result[1].legs).toHaveLength(1);
    });

    it('returns empty array when no trips exist', async () => {
      mockDb.collections.get().query().fetch.mockResolvedValue([]);

      const result = await databaseService.getTripsWithLegs();
      expect(result).toEqual([]);
    });
  });

  describe('QR code operations', () => {
    it('getQRCodes returns all codes sorted by date (newest first)', async () => {
      const qrCodes = [
        makeQRRecord({ savedAt: '2025-06-01T00:00:00Z', id: 'qr-1' }),
        makeQRRecord({ savedAt: '2025-06-05T00:00:00Z', id: 'qr-2' }),
      ];
      mockDb.collections.get('saved_qr_codes').query().fetch.mockResolvedValue(qrCodes);

      const result = await databaseService.getQRCodes();
      expect(result).toHaveLength(2);
      expect((result[0] as any).id).toBe('qr-2');
    });

    it('getQRCodes filters by legId', async () => {
      const qrCodes = [
        makeQRRecord({ legId: 'leg-1', id: 'qr-1' }),
        makeQRRecord({ legId: 'leg-2', id: 'qr-2' }),
      ];
      mockDb.collections.get('saved_qr_codes').query().fetch.mockResolvedValue(qrCodes);

      const result = await databaseService.getQRCodes('leg-1');
      expect(result).toHaveLength(1);
      expect((result[0] as any).legId).toBe('leg-1');
    });

    it('getQRCodesForLegs returns empty for empty legIds', async () => {
      const result = await databaseService.getQRCodesForLegs([]);
      expect(result).toEqual([]);
    });

    it('getQRCodesForLegs filters by multiple legIds', async () => {
      const qrCodes = [
        makeQRRecord({ legId: 'leg-1', id: 'qr-1' }),
        makeQRRecord({ legId: 'leg-2', id: 'qr-2' }),
        makeQRRecord({ legId: 'leg-3', id: 'qr-3' }),
      ];
      mockDb.collections.get('saved_qr_codes').query().fetch.mockResolvedValue(qrCodes);

      const result = await databaseService.getQRCodesForLegs(['leg-1', 'leg-2']);
      expect(result).toHaveLength(2);
    });

    it('saveQRCode creates a QR code record', async () => {
      const mockCreate = mockDb.collections.get('saved_qr_codes').create;
      mockCreate.mockImplementation((fn: (r: Record<string, unknown>) => void) => {
        const r: Record<string, unknown> = {};
        fn(r);
        return r;
      });

      await databaseService.saveQRCode({ legId: 'leg-1' } as any);
      expect(mockCreate).toHaveBeenCalled();
    });

    it('deleteQRCode marks QR as deleted', async () => {
      const qrRecord = { markAsDeleted: jest.fn().mockResolvedValue(undefined) };
      mockDb.collections.get('saved_qr_codes').find.mockResolvedValue(qrRecord);

      await databaseService.deleteQRCode('qr-1');
      expect(qrRecord.markAsDeleted).toHaveBeenCalled();
    });
  });

  describe('performance metrics', () => {
    it('getPerformanceMetrics returns recorded metrics after query', async () => {
      mockDb.collections.get('trips').query().fetch.mockResolvedValue([makeTripRecord()]);

      await databaseService.getTrips();

      const metrics = databaseService.getPerformanceMetrics();
      // Find the most recent getTrips metric
      const tripMetrics = metrics.filter((m: any) => m.operation.includes('getTrips'));
      expect(tripMetrics.length).toBeGreaterThan(0);
      const latest = tripMetrics[tripMetrics.length - 1];
      expect(latest.duration).toBeGreaterThanOrEqual(0);
      expect(latest.recordCount).toBeGreaterThanOrEqual(1);
    });

    it('getAverageQueryTime returns a number', async () => {
      const avg = databaseService.getAverageQueryTime();
      expect(typeof avg).toBe('number');
      expect(avg).toBeGreaterThanOrEqual(0);
    });

    it('getAverageQueryTime filters by operation name', async () => {
      mockDb.collections.get('trips').query().fetch.mockResolvedValue([]);
      await databaseService.getTrips();

      const avg = databaseService.getAverageQueryTime('getTrips');
      expect(avg).toBeGreaterThanOrEqual(0);
    });
  });

  describe('close', () => {
    it('resets database state so next call re-initializes', async () => {
      await databaseService.close();

      // After close, getDatabase should trigger re-initialization
      const db = await databaseService.getDatabase();
      expect(db).not.toBeUndefined();
      expect(db).not.toBeNull();
    });
  });
});
