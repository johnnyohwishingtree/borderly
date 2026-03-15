// Mock for @/services/storage — replaces the entire storage layer for web E2E
//
// Tests can inject state via window.__BORDERLY_STATE__ before the app loads:
//   await page.addInitScript(() => {
//     window.__BORDERLY_STATE__ = {
//       preferences: { onboardingComplete: true },
//       profile: { firstName: 'John', ... },
//       trips: [...],
//     };
//   });

function getInjectedState() {
  if (typeof window !== 'undefined' && window.__BORDERLY_STATE__) {
    return window.__BORDERLY_STATE__;
  }
  return {};
}

// In-memory store that persists for the lifetime of the page
const memoryStore = {};

const keychainService = {
  // Legacy single-profile methods (for backward compatibility)
  storeProfile: (profile) => {
    memoryStore.__profile__ = profile;
    return Promise.resolve();
  },
  getProfile: () => {
    const injected = getInjectedState();
    return Promise.resolve(memoryStore.__profile__ || injected.profile || null);
  },
  deleteProfile: () => {
    delete memoryStore.__profile__;
    return Promise.resolve();
  },

  // New multi-profile methods
  storeProfileById: (profileId, profile) => {
    if (!memoryStore.__profiles__) memoryStore.__profiles__ = {};
    memoryStore.__profiles__[profileId] = profile;
    return Promise.resolve();
  },
  getProfileById: (profileId) => {
    const injected = getInjectedState();
    const profiles = memoryStore.__profiles__ || {};
    return Promise.resolve(profiles[profileId] || (injected.profiles && injected.profiles[profileId]) || null);
  },
  deleteProfileById: (profileId) => {
    if (memoryStore.__profiles__) {
      delete memoryStore.__profiles__[profileId];
    }
    if (memoryStore.__profileKeys__) {
      delete memoryStore.__profileKeys__[profileId];
    }
    return Promise.resolve();
  },
  getAllProfileIds: () => {
    const profiles = memoryStore.__profiles__ || {};
    return Promise.resolve(Object.keys(profiles));
  },
  profileExists: (profileId) => {
    const profiles = memoryStore.__profiles__ || {};
    return Promise.resolve(profileId in profiles);
  },

  // Migration support
  migrateLegacyProfile: () => {
    // For E2E tests, we'll simulate no legacy profile to migrate
    return Promise.resolve(null);
  },

  // Encryption key management
  generateEncryptionKey: () => Promise.resolve('mock-key'),
  generateProfileEncryptionKey: (profileId) => {
    if (!memoryStore.__profileKeys__) memoryStore.__profileKeys__ = {};
    memoryStore.__profileKeys__[profileId] = `mock-key-${profileId}`;
    return Promise.resolve(`mock-key-${profileId}`);
  },
  getEncryptionKey: () => Promise.resolve('mock-key'),
  getProfileEncryptionKey: (profileId) => {
    const keys = memoryStore.__profileKeys__ || {};
    return Promise.resolve(keys[profileId] || `mock-key-${profileId}`);
  },
  deleteProfileEncryptionKey: (profileId) => {
    if (memoryStore.__profileKeys__) {
      delete memoryStore.__profileKeys__[profileId];
    }
    return Promise.resolve();
  },

  // System utilities
  isAvailable: () => Promise.resolve(false),
  clearSensitiveMemory: () => {},
  secureCleanup: () => Promise.resolve(),
};

const mmkvService = {
  getPreferences: () => {
    const injected = getInjectedState();
    return {
      ...(injected.preferences || {}),
      ...(memoryStore.__preferences__ || {}),
    };
  },
  updatePreferences: (updates) => {
    memoryStore.__preferences__ = {
      ...(memoryStore.__preferences__ || {}),
      ...updates,
    };
  },
  setPreference: (key, value) => {
    if (!memoryStore.__preferences__) memoryStore.__preferences__ = {};
    memoryStore.__preferences__[key] = value;
  },
  clearPreferences: () => { delete memoryStore.__preferences__; },
  getFeatureFlag: () => false,
  setFeatureFlag: () => {},
  getCache: () => null,
  setCache: () => {},
  clearCache: () => {},
  getString: (key) => memoryStore[key],
  setString: (key, value) => { memoryStore[key] = value; },
  getBoolean: (key) => memoryStore[key],
  setBoolean: (key, value) => { memoryStore[key] = value; },
  getNumber: (key) => memoryStore[key],
  setNumber: (key, value) => { memoryStore[key] = value; },
  delete: (key) => { delete memoryStore[key]; },
  getAllKeys: () => Object.keys(memoryStore),
  clearAll: () => { Object.keys(memoryStore).forEach(k => delete memoryStore[k]); },
};

// In-memory trip/leg/QR storage
const trips = [];
const tripLegs = {};
const qrCodes = [];

const databaseService = {
  initialize: () => Promise.resolve({}),
  getDatabase: () => Promise.resolve({
    collections: {
      get: () => ({
        query: () => ({
          fetch: () => Promise.resolve(qrCodes),
          observe: () => ({ subscribe: (cb) => { cb(qrCodes); return { unsubscribe: () => {} }; } }),
        }),
        find: (id) => Promise.resolve(qrCodes.find(q => q.id === id) || null),
        create: (builder) => {
          const record = { id: `qr-${Date.now()}`, savedAt: new Date() };
          builder(record);
          qrCodes.push(record);
          return Promise.resolve(record);
        },
      }),
    },
    write: (fn) => fn(),
  }),
  reset: () => Promise.resolve(),
  close: () => Promise.resolve(),
  getTrips: () => {
    const injected = getInjectedState();
    return Promise.resolve(injected.trips || trips);
  },
  getTripsWithLegs: (options) => {
    const injected = getInjectedState();
    const allTrips = injected.trips || trips;
    return Promise.resolve(allTrips.map(trip => ({
      trip,
      legs: (injected.tripLegs && injected.tripLegs[trip.id]) || tripLegs[trip.id] || [],
    })));
  },
  getTripCount: (status) => {
    const injected = getInjectedState();
    const allTrips = injected.trips || trips;
    return Promise.resolve(allTrips.length);
  },
  createTrip: (trip) => {
    const newTrip = { id: `trip-${Date.now()}`, ...trip };
    trips.push(newTrip);
    return Promise.resolve(newTrip);
  },
  updateTrip: (id, updates) => {
    const idx = trips.findIndex(t => t.id === id);
    if (idx >= 0) trips[idx] = { ...trips[idx], ...updates };
    return Promise.resolve(trips[idx] || {});
  },
  deleteTrip: (id) => {
    const idx = trips.findIndex(t => t.id === id);
    if (idx >= 0) trips.splice(idx, 1);
    return Promise.resolve();
  },
  getTripLegs: (tripId) => {
    const injected = getInjectedState();
    return Promise.resolve(
      (injected.tripLegs && injected.tripLegs[tripId]) || tripLegs[tripId] || []
    );
  },
  createTripLeg: (tripId, leg) => {
    if (!tripLegs[tripId]) tripLegs[tripId] = [];
    const newLeg = { id: `leg-${Date.now()}`, ...leg };
    tripLegs[tripId].push(newLeg);
    return Promise.resolve(newLeg);
  },
  updateTripLeg: (tripId, legId, updates) => {
    const legs = tripLegs[tripId] || [];
    const idx = legs.findIndex(l => l.id === legId);
    if (idx >= 0) legs[idx] = { ...legs[idx], ...updates };
    return Promise.resolve(legs[idx] || {});
  },
  getQRCodes: () => Promise.resolve(qrCodes),
  saveQRCode: (qr) => {
    const newQR = { id: `qr-${Date.now()}`, ...qr };
    qrCodes.push(newQR);
    return Promise.resolve(newQR);
  },
  deleteQRCode: (id) => {
    const idx = qrCodes.findIndex(q => q.id === id);
    if (idx >= 0) qrCodes.splice(idx, 1);
    return Promise.resolve();
  },
};

class MockModel {
  constructor() { this.id = 'mock-id'; }
}

module.exports = {
  keychainService,
  mmkvService,
  databaseService,
  Trip: MockModel,
  TripLeg: MockModel,
  SavedQRCode: MockModel,
  schema: {},
  migrations: {},
};
