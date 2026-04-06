/**
 * Web Database Service — IndexedDB-backed storage for trips, legs, and QR codes
 *
 * Replaces WatermelonDB (SQLite) on web platforms. Uses IndexedDB directly
 * for persistent structured data storage. No encryption needed for this tier
 * (trip metadata is not PII — PII lives in the keychain tier).
 */

// Web API types declared in ./web-types.d.ts (avoids full DOM lib conflict with RN)

const DB_NAME = 'borderly-database';
const DB_VERSION = 1;

interface StoredTrip {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredTripLeg {
  id: string;
  tripId: string;
  destinationCountry: string;
  order: number;
  formDataString?: string;
  accommodationData?: string;
  assignedTravelersString?: string;
  travelerFormsDataString?: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredQRCode {
  id: string;
  legId: string;
  data?: string;
  savedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('trips')) {
        db.createObjectStore('trips', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('trip_legs')) {
        const legStore = db.createObjectStore('trip_legs', { keyPath: 'id' });
        legStore.createIndex('tripId', 'tripId', { unique: false });
      }
      if (!db.objectStoreNames.contains('qr_codes')) {
        const qrStore = db.createObjectStore('qr_codes', { keyPath: 'id' });
        qrStore.createIndex('legId', 'legId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut<T>(storeName: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDeleteItem(storeName: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbGetByIndex<T>(
  storeName: string,
  indexName: string,
  key: string,
): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const req = index.getAll(key);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbClearStore(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Pagination/Query Types ──────────────────────────────────────────────────

export interface PaginationOptions {
  limit: number;
  offset: number;
}

export interface TripQueryOptions {
  status?: 'upcoming' | 'active' | 'completed';
  pagination?: PaginationOptions;
  sortBy?: 'created_at' | 'updated_at' | 'name';
  sortOrder?: 'asc' | 'desc';
}

// ─── DatabaseService ─────────────────────────────────────────────────────────

class WebDatabaseService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    await openDB();
    this.isInitialized = true;
  }

  async getDatabase(): Promise<IDBDatabase> {
    if (!this.isInitialized) await this.initialize();
    return openDB();
  }

  async reset(): Promise<void> {
    await idbClearStore('trips');
    await idbClearStore('trip_legs');
    await idbClearStore('qr_codes');
  }

  async close(): Promise<void> {
    this.isInitialized = false;
  }

  // Trip operations

  async getTrips(options: TripQueryOptions = {}): Promise<StoredTrip[]> {
    let trips = await idbGetAll<StoredTrip>('trips');

    if (options.status) {
      trips = trips.filter(t => t.status === options.status);
    }

    const sortBy = options.sortBy || 'updated_at';
    const sortOrder = options.sortOrder || 'desc';
    trips.sort((a, b) => {
      let aVal: string, bVal: string;
      if (sortBy === 'name') {
        aVal = a.name;
        bVal = b.name;
      } else if (sortBy === 'created_at') {
        aVal = a.createdAt;
        bVal = b.createdAt;
      } else {
        aVal = a.updatedAt;
        bVal = b.updatedAt;
      }
      const cmp = sortBy === 'name' ? aVal.localeCompare(bVal) : aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    if (options.pagination) {
      const { offset, limit } = options.pagination;
      trips = trips.slice(offset, offset + limit);
    }

    return trips;
  }

  async getTripCount(status?: string): Promise<number> {
    let trips = await idbGetAll<StoredTrip>('trips');
    if (status) {
      trips = trips.filter(t => t.status === status);
    }
    return trips.length;
  }

  async createTrip(tripData: Partial<StoredTrip>): Promise<StoredTrip> {
    const trip: StoredTrip = {
      id: generateId(),
      name: tripData.name || '',
      status: tripData.status || 'upcoming',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await idbPut('trips', trip);
    return trip;
  }

  async updateTrip(tripId: string, updates: Partial<StoredTrip>): Promise<StoredTrip> {
    const existing = await idbGet<StoredTrip>('trips', tripId);
    if (!existing) throw new Error(`Trip ${tripId} not found`);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await idbPut('trips', updated);
    return updated;
  }

  async deleteTrip(tripId: string): Promise<void> {
    await idbDeleteItem('trips', tripId);
    // Also delete associated legs
    const legs = await idbGetByIndex<StoredTripLeg>('trip_legs', 'tripId', tripId);
    for (const leg of legs) {
      await idbDeleteItem('trip_legs', leg.id);
    }
  }

  // Trip leg operations

  async getTripLegs(tripId: string): Promise<StoredTripLeg[]> {
    const legs = await idbGetByIndex<StoredTripLeg>('trip_legs', 'tripId', tripId);
    return legs.sort((a, b) => a.order - b.order);
  }

  async getTripsWithLegs(options: TripQueryOptions = {}): Promise<Array<{ trip: StoredTrip; legs: StoredTripLeg[] }>> {
    const trips = await this.getTrips(options);
    const result: Array<{ trip: StoredTrip; legs: StoredTripLeg[] }> = [];

    for (const trip of trips) {
      const legs = await this.getTripLegs(trip.id);
      result.push({ trip, legs });
    }

    return result;
  }

  async createTripLeg(tripId: string, legData: Partial<StoredTripLeg>): Promise<StoredTripLeg> {
    const leg: StoredTripLeg = {
      id: generateId(),
      tripId,
      destinationCountry: legData.destinationCountry || '',
      order: legData.order || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (legData.formDataString !== undefined) leg.formDataString = legData.formDataString;
    if (legData.accommodationData !== undefined) leg.accommodationData = legData.accommodationData;
    if (legData.assignedTravelersString !== undefined) leg.assignedTravelersString = legData.assignedTravelersString;
    if (legData.travelerFormsDataString !== undefined) leg.travelerFormsDataString = legData.travelerFormsDataString;
    await idbPut('trip_legs', leg);
    return leg;
  }

  async updateTripLeg(
    _tripId: string,
    legId: string,
    updates: Partial<StoredTripLeg>,
  ): Promise<StoredTripLeg> {
    const existing = await idbGet<StoredTripLeg>('trip_legs', legId);
    if (!existing) throw new Error(`TripLeg ${legId} not found`);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await idbPut('trip_legs', updated);
    return updated;
  }

  // QR code operations

  async getQRCodes(legId?: string): Promise<StoredQRCode[]> {
    if (legId) {
      return idbGetByIndex<StoredQRCode>('qr_codes', 'legId', legId);
    }
    return idbGetAll<StoredQRCode>('qr_codes');
  }

  async saveQRCode(qrData: Partial<StoredQRCode>): Promise<StoredQRCode> {
    const qr: StoredQRCode = {
      id: generateId(),
      legId: qrData.legId || '',
      savedAt: new Date().toISOString(),
    };
    if (qrData.data !== undefined) qr.data = qrData.data;
    await idbPut('qr_codes', qr);
    return qr;
  }

  async deleteQRCode(id: string): Promise<void> {
    await idbDeleteItem('qr_codes', id);
  }
}

export const webDatabaseService = new WebDatabaseService();
