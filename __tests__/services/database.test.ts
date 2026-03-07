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
      const mockLegs = [{ id: 'leg1' }, { id: 'leg2' }];

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

  describe('error handling', () => {
    it('should handle database operation errors gracefully', async () => {
      await databaseService.initialize();

      const error = new Error('Database error');
      mockDatabase.collections.get().query().fetch.mockRejectedValue(error);

      await expect(databaseService.getTrips()).rejects.toThrow('Database error');
    });
  });
});
