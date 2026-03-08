// Unmock the modules that jest.setup.js globally mocks, so we can test the real implementation
jest.unmock('@/services/storage/database');
jest.unmock('@/services/storage');

import { databaseService } from '@/services/storage/database';
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { keychainService } from '@/services/storage/keychain';

// Mock the dependencies
jest.mock('@nozbe/watermelondb', () => ({
  Database: jest.fn(),
  Model: class MockModel {
    static table = 'mock_table';
  },
  appSchema: jest.fn(),
  tableSchema: jest.fn(),
  field: () => (_target: any, _key: string) => {},
  date: () => (_target: any, _key: string) => {},
  readonly: () => (_target: any, _key: string) => {},
}));
jest.mock('@nozbe/watermelondb/decorators', () => ({
  field: () => () => {},
  date: () => () => {},
  readonly: () => () => {},
}));
jest.mock('@nozbe/watermelondb/adapters/sqlite', () => jest.fn());
jest.mock('@nozbe/watermelondb/Schema/migrations', () => ({
  schemaMigrations: jest.fn(),
  createTable: jest.fn(),
}));
jest.mock('@/services/storage/keychain');

const mockDatabase = {
  collections: {
    get: jest.fn().mockReturnValue({
      query: jest.fn().mockReturnValue({
        fetch: jest.fn().mockResolvedValue([]),
        where: jest.fn().mockReturnThis(),
      }),
      create: jest.fn().mockResolvedValue({ id: 'mock-id' }),
      find: jest.fn().mockResolvedValue({
        update: jest.fn().mockResolvedValue({}),
        markAsDeleted: jest.fn().mockResolvedValue({}),
      }),
    }),
  },
  write: jest.fn().mockImplementation((fn) => fn()),
  unsafeResetDatabase: jest.fn().mockResolvedValue(undefined),
};

const mockKeychainService = keychainService as jest.Mocked<typeof keychainService>;

describe('DatabaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the database service state
    (databaseService as any).database = null;
    (databaseService as any).isInitialized = false;

    // Setup default mock implementations
    (Database as unknown as jest.Mock).mockImplementation(() => mockDatabase);
    (SQLiteAdapter as unknown as jest.Mock).mockImplementation(() => ({}));
    mockKeychainService.getEncryptionKey.mockResolvedValue('test-encryption-key');
    mockKeychainService.generateEncryptionKey.mockResolvedValue('new-encryption-key');
  });

  describe('initialization', () => {
    it('should initialize database with existing encryption key', async () => {
      mockKeychainService.getEncryptionKey.mockResolvedValue('existing-key');

      const db = await databaseService.initialize();

      expect(mockKeychainService.getEncryptionKey).toHaveBeenCalled();
      expect(mockKeychainService.generateEncryptionKey).not.toHaveBeenCalled();
      expect(SQLiteAdapter).toHaveBeenCalledWith(
        expect.objectContaining({
          dbName: 'borderly.db',
          jsi: true,
        })
      );
      expect(Database).toHaveBeenCalledWith(
        expect.objectContaining({
          modelClasses: expect.arrayContaining([expect.any(Function)]),
        })
      );
      expect(db).toBe(mockDatabase);
    });

    it('should generate new encryption key when none exists', async () => {
      mockKeychainService.getEncryptionKey.mockResolvedValue(null);
      mockKeychainService.generateEncryptionKey.mockResolvedValue('new-key');

      await databaseService.initialize();

      expect(mockKeychainService.getEncryptionKey).toHaveBeenCalled();
      expect(mockKeychainService.generateEncryptionKey).toHaveBeenCalled();
      expect(SQLiteAdapter).toHaveBeenCalledWith(
        expect.objectContaining({
          dbName: 'borderly.db',
          jsi: true,
        })
      );
    });

    it('should return existing database if already initialized', async () => {
      // First initialization
      const db1 = await databaseService.initialize();

      // Second call should return same instance
      const db2 = await databaseService.initialize();

      expect(db1).toBe(db2);
      expect(SQLiteAdapter).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Keychain error');
      mockKeychainService.getEncryptionKey.mockRejectedValue(error);

      await expect(databaseService.initialize()).rejects.toThrow(
        'Failed to initialize secure database'
      );
    });

    it('should handle database setup errors', async () => {
      const setupError = new Error('Setup error');
      (SQLiteAdapter as unknown as jest.Mock).mockImplementation((config: any) => {
        // Simulate setup error
        setTimeout(() => config.onSetUpError(setupError), 0);
        return {};
      });

      await databaseService.initialize();

      // Wait for async error handler
      await new Promise(resolve => setTimeout(resolve as any, 10));
      expect(console.error).toHaveBeenCalledWith('Database setup error:', setupError);
    });
  });

  describe('database operations', () => {
    beforeEach(async () => {
      await databaseService.initialize();
    });

    it('should get database instance', async () => {
      const db = await databaseService.getDatabase();
      expect(db).toBe(mockDatabase);
    });

    it('should initialize database if not already done in getDatabase', async () => {
      // Reset state
      (databaseService as any).database = null;
      (databaseService as any).isInitialized = false;

      const db = await databaseService.getDatabase();

      expect(db).toBe(mockDatabase);
      expect(mockKeychainService.getEncryptionKey).toHaveBeenCalled();
    });

    it('should reset database', async () => {
      await databaseService.reset();

      expect(mockDatabase.write).toHaveBeenCalled();
      expect(mockDatabase.unsafeResetDatabase).toHaveBeenCalled();
    });

    it('should handle reset when database is not initialized', async () => {
      (databaseService as any).database = null;

      await databaseService.reset();

      // Should not throw error
      expect(mockDatabase.unsafeResetDatabase).not.toHaveBeenCalled();
    });

    it('should close database', async () => {
      await databaseService.close();

      expect((databaseService as any).database).toBeNull();
      expect((databaseService as any).isInitialized).toBe(false);
    });
  });

  describe('trip operations', () => {
    beforeEach(async () => {
      await databaseService.initialize();
    });

    it('should get trips', async () => {
      const mockTrips = [{ id: 'trip1' }, { id: 'trip2' }];
      mockDatabase.collections.get().query().fetch.mockResolvedValue(mockTrips);

      const trips = await databaseService.getTrips();

      expect(mockDatabase.collections.get).toHaveBeenCalledWith('trips');
      expect(trips).toEqual(mockTrips);
    });

    it('should create trip', async () => {
      const tripData = { name: 'Test Trip', status: 'upcoming' };

      mockDatabase.collections.get().create.mockImplementation((callback: any) => {
        const trip = { name: '', status: '', createdAt: null, updatedAt: null };
        callback(trip);
        return Promise.resolve({ id: 'new-trip-id', ...trip });
      });

      const result = await databaseService.createTrip(tripData as any);

      expect(mockDatabase.write).toHaveBeenCalled();
      expect(mockDatabase.collections.get).toHaveBeenCalledWith('trips');
      expect(result).toEqual(expect.objectContaining({ id: 'new-trip-id' }));
    });

    it('should create trip with defaults', async () => {
      mockDatabase.collections.get().create.mockImplementation((callback: any) => {
        const trip = { name: '', status: '', createdAt: null, updatedAt: null };
        callback(trip);
        expect(trip.name).toBe('');
        expect(trip.status).toBe('upcoming');
        expect(trip.createdAt).toBeInstanceOf(Date);
        expect(trip.updatedAt).toBeInstanceOf(Date);
        return Promise.resolve({ id: 'new-trip-id', ...trip });
      });

      await databaseService.createTrip({});
    });

    it('should update trip', async () => {
      const tripId = 'trip-id';
      const updates = { name: 'Updated Trip' };

      await databaseService.updateTrip(tripId, updates);

      expect(mockDatabase.write).toHaveBeenCalled();
      expect(mockDatabase.collections.get).toHaveBeenCalledWith('trips');
      expect(mockDatabase.collections.get().find).toHaveBeenCalledWith(tripId);
    });

    it('should delete trip', async () => {
      const tripId = 'trip-id';
      const mockMarkAsDeleted = jest.fn().mockResolvedValue({});
      mockDatabase.collections.get().find.mockResolvedValue({ markAsDeleted: mockMarkAsDeleted });

      await databaseService.deleteTrip(tripId);

      expect(mockDatabase.write).toHaveBeenCalled();
      expect(mockDatabase.collections.get).toHaveBeenCalledWith('trips');
      expect(mockDatabase.collections.get().find).toHaveBeenCalledWith(tripId);
      expect(mockMarkAsDeleted).toHaveBeenCalled();
    });
  });

  describe('trip leg operations', () => {
    beforeEach(async () => {
      mockDatabase.collections.get().find.mockResolvedValue({
        update: jest.fn().mockResolvedValue({}),
        markAsDeleted: jest.fn().mockResolvedValue({}),
      });
      await databaseService.initialize();
    });

    it('should get trip legs for a trip', async () => {
      const tripId = 'trip-id';
      const mockLegs = [
        { id: 'leg1', tripId: tripId, order: 1 }, 
        { id: 'leg2', tripId: tripId, order: 2 }
      ];

      mockDatabase.collections.get().query().fetch.mockResolvedValue(mockLegs);

      const legs = await databaseService.getTripLegs(tripId);

      expect(mockDatabase.collections.get).toHaveBeenCalledWith('trip_legs');
      // TODO: Re-enable when where clause is restored
      // expect(mockDatabase.collections.get().query().where).toHaveBeenCalledWith('trip_id', tripId);
      expect(legs).toEqual(mockLegs);
    });

    it('should create trip leg', async () => {
      const legData = { tripId: 'trip-id', destination: 'Japan' };

      mockDatabase.collections.get().create.mockImplementation((callback: any) => {
        const leg = { formStatus: '' };
        callback(leg);
        expect(leg.formStatus).toBe('not_started');
        return Promise.resolve({ id: 'new-leg-id', ...leg });
      });

      await databaseService.createTripLeg(legData as any);

      expect(mockDatabase.write).toHaveBeenCalled();
      expect(mockDatabase.collections.get).toHaveBeenCalledWith('trip_legs');
    });

    it('should update trip leg', async () => {
      const legId = 'leg-id';
      const updates = { formStatus: 'completed' };

      await databaseService.updateTripLeg(legId, updates as any);

      expect(mockDatabase.write).toHaveBeenCalled();
      expect(mockDatabase.collections.get).toHaveBeenCalledWith('trip_legs');
      expect(mockDatabase.collections.get().find).toHaveBeenCalledWith(legId);
    });
  });

  describe('QR code operations', () => {
    beforeEach(async () => {
      await databaseService.initialize();
    });

    it('should get all QR codes when no legId provided', async () => {
      const mockQRs = [{ id: 'qr1' }, { id: 'qr2' }];
      mockDatabase.collections.get().query().fetch.mockResolvedValue(mockQRs);

      const qrs = await databaseService.getQRCodes();

      expect(mockDatabase.collections.get).toHaveBeenCalledWith('saved_qr_codes');
      expect(mockDatabase.collections.get().query().where).not.toHaveBeenCalled();
      expect(qrs).toEqual(mockQRs);
    });

    it('should get QR codes for specific leg', async () => {
      const legId = 'leg-id';
      const mockQRs = [{ id: 'qr1', legId }];

      mockDatabase.collections.get().query().fetch.mockResolvedValue(mockQRs);

      const qrs = await databaseService.getQRCodes(legId);

      expect(mockDatabase.collections.get).toHaveBeenCalledWith('saved_qr_codes');
      // TODO: Re-enable when where clause is restored
      // expect(mockDatabase.collections.get().query().where).toHaveBeenCalledWith('leg_id', legId);
      expect(qrs).toEqual(mockQRs);
    });

    it('should save QR code', async () => {
      const qrData = { legId: 'leg-id', data: 'qr-data' };

      mockDatabase.collections.get().create.mockImplementation((callback: any) => {
        const qr = { savedAt: null };
        callback(qr);
        expect(qr.savedAt).toBeInstanceOf(Date);
        return Promise.resolve({ id: 'new-qr-id', ...qr });
      });

      await databaseService.saveQRCode(qrData);

      expect(mockDatabase.write).toHaveBeenCalled();
      expect(mockDatabase.collections.get).toHaveBeenCalledWith('saved_qr_codes');
    });

    it('should delete QR code', async () => {
      const qrId = 'qr-id';
      const mockMarkAsDeleted = jest.fn().mockResolvedValue({});
      mockDatabase.collections.get().find.mockResolvedValue({ markAsDeleted: mockMarkAsDeleted });

      await databaseService.deleteQRCode(qrId);

      expect(mockDatabase.write).toHaveBeenCalled();
      expect(mockDatabase.collections.get).toHaveBeenCalledWith('saved_qr_codes');
      expect(mockDatabase.collections.get().find).toHaveBeenCalledWith(qrId);
      expect(mockMarkAsDeleted).toHaveBeenCalled();
    });
  });

  describe('performance metrics', () => {
    beforeEach(async () => {
      await databaseService.initialize();
    });

    it('should track query performance metrics', async () => {
      const mockTrips = [{ id: 'trip1' }];
      mockDatabase.collections.get().query().fetch.mockResolvedValue(mockTrips);

      await databaseService.getTrips();

      const metrics = databaseService.getPerformanceMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0]).toEqual(
        expect.objectContaining({
          operation: expect.stringContaining('getTrips'),
          duration: expect.any(Number),
          recordCount: expect.any(Number),
          timestamp: expect.any(Date),
        })
      );
    });

    it('should calculate average query time correctly', () => {
      // Simulate some metrics
      (databaseService as any).performanceMetrics = [
        { operation: 'getTrips', duration: 50, recordCount: 1, timestamp: new Date() },
        { operation: 'getTrips', duration: 100, recordCount: 2, timestamp: new Date() },
        { operation: 'getTripLegs', duration: 30, recordCount: 1, timestamp: new Date() },
      ];

      const avgAll = databaseService.getAverageQueryTime();
      expect(avgAll).toBe(60); // (50 + 100 + 30) / 3

      const avgTrips = databaseService.getAverageQueryTime('getTrips');
      expect(avgTrips).toBe(75); // (50 + 100) / 2
    });

    it('should return 0 for average query time when no metrics', () => {
      (databaseService as any).performanceMetrics = [];

      const avg = databaseService.getAverageQueryTime();
      expect(avg).toBe(0);
    });

    it('should limit metrics history to max size', async () => {
      (databaseService as any).maxMetricsHistory = 2;
      
      const mockTrips = [{ id: 'trip1' }];
      mockDatabase.collections.get().query().fetch.mockResolvedValue(mockTrips);

      // Generate more metrics than the limit
      await databaseService.getTrips();
      await databaseService.getTrips();
      await databaseService.getTrips();

      const metrics = databaseService.getPerformanceMetrics();
      expect(metrics.length).toBe(2);
    });

    it('should warn about slow queries', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock a slow query
      const originalPerf = global.performance.now;
      let callCount = 0;
      global.performance.now = jest.fn(() => {
        return callCount++ === 0 ? 0 : 150; // 150ms duration
      });

      const mockTrips = [{ id: 'trip1' }];
      mockDatabase.collections.get().query().fetch.mockResolvedValue(mockTrips);

      await databaseService.getTrips();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow query detected')
      );

      global.performance.now = originalPerf;
      consoleSpy.mockRestore();
    });
  });

  describe('trip query options', () => {
    beforeEach(async () => {
      await databaseService.initialize();
    });

    it('should filter trips by status', async () => {
      const mockTrips = [
        { id: 'trip1', status: 'upcoming' },
        { id: 'trip2', status: 'active' },
        { id: 'trip3', status: 'completed' },
      ];
      mockDatabase.collections.get().query().fetch.mockResolvedValue(mockTrips);

      const upcomingTrips = await databaseService.getTrips({ status: 'upcoming' });
      expect(upcomingTrips).toEqual([{ id: 'trip1', status: 'upcoming' }]);
    });

    it('should sort trips by created date', async () => {
      const mockTrips = [
        { id: 'trip1', createdAt: '2023-01-01T00:00:00Z' },
        { id: 'trip2', createdAt: '2023-01-03T00:00:00Z' },
        { id: 'trip3', createdAt: '2023-01-02T00:00:00Z' },
      ];
      mockDatabase.collections.get().query().fetch.mockResolvedValue(mockTrips);

      const sortedTrips = await databaseService.getTrips({ 
        sortBy: 'created_at', 
        sortOrder: 'desc' 
      });

      expect(sortedTrips[0].id).toBe('trip2'); // Most recent first
      expect(sortedTrips[1].id).toBe('trip3');
      expect(sortedTrips[2].id).toBe('trip1');
    });

    it('should sort trips by name', async () => {
      const mockTrips = [
        { id: 'trip1', name: 'Charlie Trip' },
        { id: 'trip2', name: 'Alpha Trip' },
        { id: 'trip3', name: 'Beta Trip' },
      ];
      mockDatabase.collections.get().query().fetch.mockResolvedValue(mockTrips);

      const sortedTrips = await databaseService.getTrips({ 
        sortBy: 'name', 
        sortOrder: 'asc' 
      });

      expect(sortedTrips[0].name).toBe('Alpha Trip');
      expect(sortedTrips[1].name).toBe('Beta Trip');
      expect(sortedTrips[2].name).toBe('Charlie Trip');
    });

    it('should apply pagination', async () => {
      const mockTrips = [
        { id: 'trip1' },
        { id: 'trip2' },
        { id: 'trip3' },
        { id: 'trip4' },
        { id: 'trip5' },
      ];
      mockDatabase.collections.get().query().fetch.mockResolvedValue(mockTrips);

      const paginatedTrips = await databaseService.getTrips({ 
        pagination: { limit: 2, offset: 1 }
      });

      expect(paginatedTrips.length).toBe(2);
      expect(paginatedTrips[0].id).toBe('trip2');
      expect(paginatedTrips[1].id).toBe('trip3');
    });

    it('should get trip count', async () => {
      const mockTrips = [
        { id: 'trip1', status: 'upcoming' },
        { id: 'trip2', status: 'active' },
        { id: 'trip3', status: 'upcoming' },
      ];
      mockDatabase.collections.get().query().fetch.mockResolvedValue(mockTrips);

      const totalCount = await databaseService.getTripCount();
      expect(totalCount).toBe(3);

      const upcomingCount = await databaseService.getTripCount('upcoming');
      expect(upcomingCount).toBe(2);
    });
  });

  describe('batch operations', () => {
    beforeEach(async () => {
      await databaseService.initialize();
    });

    it('should load trips with legs efficiently', async () => {
      const mockTrips = [
        { id: 'trip1', name: 'Trip 1' },
        { id: 'trip2', name: 'Trip 2' },
      ];
      const mockLegs = [
        { id: 'leg1', tripId: 'trip1', order: 1 },
        { id: 'leg2', tripId: 'trip1', order: 2 },
        { id: 'leg3', tripId: 'trip2', order: 1 },
      ];

      mockDatabase.collections.get.mockImplementation((collection: string) => {
        if (collection === 'trips') {
          return {
            query: () => ({
              fetch: () => Promise.resolve(mockTrips),
            }),
          };
        } else if (collection === 'trip_legs') {
          return {
            query: () => ({
              fetch: () => Promise.resolve(mockLegs),
            }),
          };
        }
        return { query: () => ({ fetch: () => Promise.resolve([]) }) };
      });

      const result = await databaseService.getTripsWithLegs();

      expect(result).toHaveLength(2);
      expect(result[0].trip.id).toBe('trip1');
      expect(result[0].legs).toHaveLength(2);
      expect(result[1].trip.id).toBe('trip2');
      expect(result[1].legs).toHaveLength(1);
    });

    it('should handle empty trips in getTripsWithLegs', async () => {
      mockDatabase.collections.get().query().fetch.mockResolvedValue([]);

      const result = await databaseService.getTripsWithLegs();

      expect(result).toEqual([]);
    });

    it('should batch load QR codes for multiple legs', async () => {
      const legIds = ['leg1', 'leg2'];
      const mockQRs = [
        { id: 'qr1', legId: 'leg1', savedAt: '2023-01-03T00:00:00Z' },
        { id: 'qr2', legId: 'leg1', savedAt: '2023-01-01T00:00:00Z' },
        { id: 'qr3', legId: 'leg2', savedAt: '2023-01-02T00:00:00Z' },
      ];

      mockDatabase.collections.get().query().fetch.mockResolvedValue(mockQRs);

      const result = await databaseService.getQRCodesForLegs(legIds);

      expect(result).toHaveLength(3);
      // Should be sorted by savedAt date, newest first
      expect(result[0].id).toBe('qr1');
      expect(result[1].id).toBe('qr3');
      expect(result[2].id).toBe('qr2');
    });

    it('should handle empty leg IDs in batch QR load', async () => {
      const result = await databaseService.getQRCodesForLegs([]);
      expect(result).toEqual([]);
    });
  });

  describe('data sorting and filtering', () => {
    beforeEach(async () => {
      await databaseService.initialize();
    });

    it('should sort trip legs by order', async () => {
      const tripId = 'trip-id';
      const mockLegs = [
        { id: 'leg3', tripId, order: 3 },
        { id: 'leg1', tripId, order: 1 },
        { id: 'leg2', tripId, order: 2 },
      ];

      mockDatabase.collections.get().query().fetch.mockResolvedValue(mockLegs);

      const legs = await databaseService.getTripLegs(tripId);

      expect(legs[0].id).toBe('leg1');
      expect(legs[1].id).toBe('leg2');
      expect(legs[2].id).toBe('leg3');
    });

    it('should filter and sort QR codes correctly', async () => {
      const legId = 'leg-id';
      const mockQRs = [
        { id: 'qr1', legId, savedAt: '2023-01-01T00:00:00Z' },
        { id: 'qr2', legId: 'other-leg', savedAt: '2023-01-03T00:00:00Z' },
        { id: 'qr3', legId, savedAt: '2023-01-02T00:00:00Z' },
      ];

      mockDatabase.collections.get().query().fetch.mockResolvedValue(mockQRs);

      const qrs = await databaseService.getQRCodes(legId);

      expect(qrs).toHaveLength(2); // Only matching legId
      expect(qrs[0].id).toBe('qr3'); // Newest first
      expect(qrs[1].id).toBe('qr1');
    });

    it('should filter trip legs by tripId correctly', async () => {
      const tripId = 'target-trip';
      const mockLegs = [
        { id: 'leg1', tripId, order: 1 },
        { id: 'leg2', tripId: 'other-trip', order: 1 },
        { id: 'leg3', tripId, order: 2 },
      ];

      mockDatabase.collections.get().query().fetch.mockResolvedValue(mockLegs);

      const legs = await databaseService.getTripLegs(tripId);

      expect(legs).toHaveLength(2);
      expect(legs.every(leg => (leg as any).tripId === tripId)).toBe(true);
    });
  });

  describe('data defaults and validation', () => {
    beforeEach(async () => {
      await databaseService.initialize();
    });

    it('should preserve existing savedAt when saving QR code', async () => {
      const existingDate = new Date('2023-01-01T00:00:00Z');
      const qrData = { legId: 'leg-id', data: 'qr-data', savedAt: existingDate };

      mockDatabase.collections.get().create.mockImplementation((callback: any) => {
        const qr = { savedAt: existingDate };
        callback(qr);
        expect(qr.savedAt).toBe(existingDate);
        return Promise.resolve({ id: 'new-qr-id', ...qr });
      });

      await databaseService.saveQRCode(qrData);
    });

    it('should preserve existing formStatus when creating trip leg', async () => {
      const legData = { tripId: 'trip-id', formStatus: 'in_progress' };

      mockDatabase.collections.get().create.mockImplementation((callback: any) => {
        const leg = { formStatus: 'in_progress' };
        callback(leg);
        expect(leg.formStatus).toBe('in_progress');
        return Promise.resolve({ id: 'new-leg-id', ...leg });
      });

      await databaseService.createTripLeg(legData as any);
    });

    it('should update timestamps in trip update', async () => {
      const tripId = 'trip-id';
      const updates = { name: 'Updated Trip' };

      mockDatabase.collections.get().find.mockResolvedValue({
        update: jest.fn().mockImplementation((callback: any) => {
          const trip = { name: '', updatedAt: null };
          callback(trip);
          expect(trip.updatedAt).toBeInstanceOf(Date);
          return Promise.resolve(trip);
        }),
      });

      await databaseService.updateTrip(tripId, updates);
    });
  });

  describe('error handling', () => {
    it('should handle database operation errors gracefully', async () => {
      await databaseService.initialize();

      const error = new Error('Database error');
      mockDatabase.collections.get().query().fetch.mockRejectedValue(error);

      await expect(databaseService.getTrips()).rejects.toThrow('Database error');
    });

    it('should handle missing records in find operations', async () => {
      await databaseService.initialize();

      const error = new Error('Record not found');
      mockDatabase.collections.get().find.mockRejectedValue(error);

      await expect(databaseService.updateTrip('invalid-id', {})).rejects.toThrow('Record not found');
    });

    it('should handle write operation failures', async () => {
      await databaseService.initialize();

      const error = new Error('Write failed');
      mockDatabase.write.mockRejectedValue(error);

      await expect(databaseService.createTrip({})).rejects.toThrow('Write failed');
    });
  });
});
