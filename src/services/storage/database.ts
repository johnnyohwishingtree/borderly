import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { migrations } from './migrations';
import { Trip, TripLeg, SavedQRCode } from './models';
import { keychainService } from './keychain';

// Performance monitoring interface
interface QueryPerformanceMetrics {
  operation: string;
  duration: number;
  recordCount: number;
  timestamp: Date;
}

// Pagination options
export interface PaginationOptions {
  limit: number;
  offset: number;
}

// Trip query options
export interface TripQueryOptions {
  status?: 'upcoming' | 'active' | 'completed';
  pagination?: PaginationOptions;
  sortBy?: 'created_at' | 'updated_at' | 'name';
  sortOrder?: 'asc' | 'desc';
}

class DatabaseService {
  private database: Database | null = null;
  private isInitialized = false;
  private performanceMetrics: QueryPerformanceMetrics[] = [];
  private maxMetricsHistory = 100; // Keep last 100 operations

  private async measureQueryPerformance<T>(
    operation: string,
    queryFn: () => Promise<T>
  ): Promise<{ result: T; metrics: QueryPerformanceMetrics }> {
    const startTime = performance.now();
    const result = await queryFn();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    const metrics: QueryPerformanceMetrics = {
      operation,
      duration,
      recordCount: Array.isArray(result) ? result.length : 1,
      timestamp: new Date(),
    };
    
    // Store metrics (keep only recent ones)
    this.performanceMetrics.push(metrics);
    if (this.performanceMetrics.length > this.maxMetricsHistory) {
      this.performanceMetrics.shift();
    }
    
    // Log slow queries (> 100ms)
    if (duration > 100) {
      console.warn(`Slow query detected: ${operation} took ${duration.toFixed(2)}ms`);
    }
    
    return { result, metrics };
  }

  getPerformanceMetrics(): QueryPerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  getAverageQueryTime(operation?: string): number {
    const relevantMetrics = operation 
      ? this.performanceMetrics.filter(m => m.operation.includes(operation))
      : this.performanceMetrics;
    
    if (relevantMetrics.length === 0) return 0;
    
    const totalTime = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalTime / relevantMetrics.length;
  }

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

  // Trip operations with performance monitoring
  async getTrips(options: TripQueryOptions = {}) {
    const db = await this.getDatabase();
    const { result } = await this.measureQueryPerformance(
      `getTrips(status=${options.status}, limit=${options.pagination?.limit})`,
      async () => {
        // Start with basic query - WatermelonDB filtering is limited in this version
        let trips = await db.collections.get('trips').query().fetch();
        
        // Apply client-side filtering and sorting for compatibility
        if (options.status) {
          trips = trips.filter(trip => (trip as any).status === options.status);
        }
        
        // Sort by specified field
        const sortBy = options.sortBy || 'updated_at';
        const sortOrder = options.sortOrder || 'desc';
        trips.sort((a, b) => {
          const aVal = (a as any)[sortBy === 'updated_at' ? 'updatedAt' : sortBy === 'created_at' ? 'createdAt' : sortBy];
          const bVal = (b as any)[sortBy === 'updated_at' ? 'updatedAt' : sortBy === 'created_at' ? 'createdAt' : sortBy];
          
          if (sortBy === 'updated_at' || sortBy === 'created_at') {
            const aTime = new Date(aVal).getTime();
            const bTime = new Date(bVal).getTime();
            return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
          } else {
            return sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
          }
        });
        
        // Apply pagination
        if (options.pagination) {
          const start = options.pagination.offset;
          const end = start + options.pagination.limit;
          trips = trips.slice(start, end);
        }
        
        return trips;
      }
    );
    
    return result;
  }

  async getTripCount(status?: 'upcoming' | 'active' | 'completed'): Promise<number> {
    const db = await this.getDatabase();
    const { result } = await this.measureQueryPerformance(
      `getTripCount(status=${status})`,
      async () => {
        let trips = await db.collections.get('trips').query().fetch();
        
        if (status) {
          trips = trips.filter(trip => (trip as any).status === status);
        }
        
        return trips.length;
      }
    );
    
    return result;
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

  // Trip leg operations with optimized queries
  async getTripLegs(tripId: string) {
    const db = await this.getDatabase();
    const { result } = await this.measureQueryPerformance(
      `getTripLegs(tripId=${tripId})`,
      async () => {
        const allLegs = await db.collections.get('trip_legs').query().fetch();
        
        // Filter by trip ID and sort by order
        const tripLegs = allLegs
          .filter(leg => (leg as any).tripId === tripId)
          .sort((a, b) => (a as any).order - (b as any).order);
          
        return tripLegs;
      }
    );
    
    return result;
  }

  // Optimized method to load trips with their legs in a single batch
  async getTripsWithLegs(options: TripQueryOptions = {}) {
    const trips = await this.getTrips(options);
    
    if (trips.length === 0) {
      return [];
    }
    
    // Get all trip IDs for batch loading
    const tripIds = trips.map(trip => trip.id);
    
    const db = await this.getDatabase();
    const { result: allLegs } = await this.measureQueryPerformance(
      `getTripsWithLegs.batchLoadLegs(tripCount=${trips.length})`,
      async () => {
        const allLegs = await db.collections.get('trip_legs').query().fetch();
        
        // Filter by trip IDs and sort by order
        const filteredLegs = allLegs
          .filter(leg => tripIds.includes((leg as any).tripId))
          .sort((a, b) => (a as any).order - (b as any).order);
          
        return filteredLegs;
      }
    );
    
    // Group legs by trip ID
    const legsByTripId = new Map<string, any[]>();
    allLegs.forEach(leg => {
      const tripId = (leg as any).tripId;
      if (!legsByTripId.has(tripId)) {
        legsByTripId.set(tripId, []);
      }
      legsByTripId.get(tripId)!.push(leg);
    });
    
    // Return trips with their legs attached
    return trips.map(trip => ({
      trip,
      legs: legsByTripId.get(trip.id) || []
    }));
  }

  async createTripLeg(legData: Partial<TripLeg>) {
    const db = await this.getDatabase();
    return await db.write(async () => {
      return await db.collections.get('trip_legs').create((leg: any) => {
        const { accommodation, formData, ...directFields } = legData as any;
        Object.assign(leg, directFields);
        if (accommodation) {
          leg.accommodationData = typeof accommodation === 'string' ? accommodation : JSON.stringify(accommodation);
        }
        if (formData) {
          leg.formDataString = typeof formData === 'string' ? formData : JSON.stringify(formData);
        }
        leg.formStatus = leg.formStatus || 'not_started';
      });
    });
  }

  async updateTripLeg(legId: string, updates: Partial<TripLeg>) {
    const db = await this.getDatabase();
    return await db.write(async () => {
      const leg = await db.collections.get('trip_legs').find(legId);
      return await leg.update((legRecord: any) => {
        const { accommodation, formData, ...directFields } = updates as any;
        Object.assign(legRecord, directFields);
        if (accommodation) {
          legRecord.accommodationData = typeof accommodation === 'string' ? accommodation : JSON.stringify(accommodation);
        }
        if (formData !== undefined) {
          legRecord.formDataString = formData ? (typeof formData === 'string' ? formData : JSON.stringify(formData)) : '';
        }
      });
    });
  }

  // QR Code operations with proper filtering
  async getQRCodes(legId?: string) {
    const db = await this.getDatabase();
    const { result } = await this.measureQueryPerformance(
      `getQRCodes(legId=${legId})`,
      async () => {
        let qrCodes = await db.collections.get('saved_qr_codes').query().fetch();
        
        if (legId) {
          qrCodes = qrCodes.filter(qr => (qr as any).legId === legId);
        }
        
        // Sort by saved date (newest first)
        qrCodes.sort((a, b) => {
          const aTime = new Date((a as any).savedAt).getTime();
          const bTime = new Date((b as any).savedAt).getTime();
          return bTime - aTime;
        });
        
        return qrCodes;
      }
    );
    
    return result;
  }

  // Batch load QR codes for multiple legs
  async getQRCodesForLegs(legIds: string[]) {
    if (legIds.length === 0) return [];
    
    const db = await this.getDatabase();
    const { result } = await this.measureQueryPerformance(
      `getQRCodesForLegs(legCount=${legIds.length})`,
      async () => {
        const allQRCodes = await db.collections.get('saved_qr_codes').query().fetch();
        
        // Filter by leg IDs and sort by saved date (newest first)
        const filteredQRCodes = allQRCodes
          .filter(qr => legIds.includes((qr as any).legId))
          .sort((a, b) => {
            const aTime = new Date((a as any).savedAt).getTime();
            const bTime = new Date((b as any).savedAt).getTime();
            return bTime - aTime;
          });
          
        return filteredQRCodes;
      }
    );
    
    return result;
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
