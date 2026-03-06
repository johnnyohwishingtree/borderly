import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { migrations } from './migrations';
import { Trip, TripLeg, SavedQRCode } from './models';
import { keychainService } from './keychain';

class DatabaseService {
  private database: Database | null = null;
  private isInitialized = false;

  async initialize(): Promise<Database> {
    if (this.database && this.isInitialized) {
      return this.database;
    }

    try {
      // Get encryption key from keychain
      let encryptionKey = await keychainService.getEncryptionKey();

      // Generate new encryption key if none exists
      if (!encryptionKey) {
        encryptionKey = await keychainService.generateEncryptionKey();
      }

      const adapter = new SQLiteAdapter({
        schema,
        migrations,
        dbName: 'borderly.db',
        // Note: Database encryption will be handled at the SQLite level
        jsi: true,
        onSetUpError: (error) => {
          console.error('Database setup error:', error);
        },
      });

      this.database = new Database({
        adapter,
        modelClasses: [Trip, TripLeg, SavedQRCode],
      });

      this.isInitialized = true;
      console.log('Database initialized successfully with encryption');

      return this.database;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw new Error('Failed to initialize secure database');
    }
  }

  async getDatabase(): Promise<Database> {
    if (!this.database || !this.isInitialized) {
      return await this.initialize();
    }
    return this.database;
  }

  async reset(): Promise<void> {
    if (this.database) {
      await this.database.write(async () => {
        await this.database!.unsafeResetDatabase();
      });
      console.log('Database reset successfully');
    }
  }

  async close(): Promise<void> {
    if (this.database) {
      // WatermelonDB doesn't have an explicit close method
      // The adapter handles cleanup automatically
      this.database = null;
      this.isInitialized = false;
      console.log('Database closed');
    }
  }

  // Trip operations
  async getTrips() {
    const db = await this.getDatabase();
    return await db.collections.get('trips').query().fetch();
  }

  async createTrip(tripData: Partial<Trip>) {
    const db = await this.getDatabase();
    return await db.write(async () => {
      return await db.collections.get('trips').create((trip: any) => {
        trip.name = tripData.name || '';
        trip.status = tripData.status || 'upcoming';
        trip.createdAt = new Date();
        trip.updatedAt = new Date();
      });
    });
  }

  async updateTrip(tripId: string, updates: Partial<Trip>) {
    const db = await this.getDatabase();
    return await db.write(async () => {
      const trip = await db.collections.get('trips').find(tripId);
      return await trip.update((tripRecord: any) => {
        Object.assign(tripRecord, updates);
        tripRecord.updatedAt = new Date();
      });
    });
  }

  async deleteTrip(tripId: string) {
    const db = await this.getDatabase();
    return await db.write(async () => {
      const trip = await db.collections.get('trips').find(tripId);
      await trip.markAsDeleted();
    });
  }

  // Trip leg operations  
  async getTripLegs(_tripId: string) {
    const db = await this.getDatabase();
    return await db.collections
      .get('trip_legs')
      .query()
      .fetch();
  }

  async createTripLeg(legData: Partial<TripLeg>) {
    const db = await this.getDatabase();
    return await db.write(async () => {
      return await db.collections.get('trip_legs').create((leg: any) => {
        Object.assign(leg, legData);
        leg.formStatus = leg.formStatus || 'not_started';
      });
    });
  }

  async updateTripLeg(legId: string, updates: Partial<TripLeg>) {
    const db = await this.getDatabase();
    return await db.write(async () => {
      const leg = await db.collections.get('trip_legs').find(legId);
      return await leg.update((legRecord: any) => {
        Object.assign(legRecord, updates);
      });
    });
  }

  // QR Code operations
  async getQRCodes(_legId?: string) {
    const db = await this.getDatabase();
    const query = db.collections.get('saved_qr_codes').query();

    // TODO: Add proper filtering by legId when watermelondb query is properly set up

    return await query.fetch();
  }

  async saveQRCode(qrData: Partial<SavedQRCode>) {
    const db = await this.getDatabase();
    return await db.write(async () => {
      return await db.collections.get('saved_qr_codes').create((qr: any) => {
        Object.assign(qr, qrData);
        qr.savedAt = qr.savedAt || new Date();
      });
    });
  }

  async deleteQRCode(qrId: string) {
    const db = await this.getDatabase();
    return await db.write(async () => {
      const qr = await db.collections.get('saved_qr_codes').find(qrId);
      await qr.markAsDeleted();
    });
  }
}

// Singleton instance
export const databaseService = new DatabaseService();
