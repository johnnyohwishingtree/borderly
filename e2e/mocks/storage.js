// Mock for @/services/storage — replaces the entire storage layer for web E2E
const keychainService = {
  storeProfile: () => Promise.resolve(),
  getProfile: () => Promise.resolve(null),
  deleteProfile: () => Promise.resolve(),
  generateEncryptionKey: () => Promise.resolve('mock-key'),
  getEncryptionKey: () => Promise.resolve('mock-key'),
  isAvailable: () => Promise.resolve(false),
};

const mmkvService = {
  getPreferences: () => ({}),
  updatePreferences: () => {},
  clearPreferences: () => {},
  getFeatureFlag: () => false,
  setFeatureFlag: () => {},
  getCache: () => null,
  setCache: () => {},
  clearCache: () => {},
  getString: () => undefined,
  setString: () => {},
  getBoolean: () => undefined,
  setBoolean: () => {},
  getNumber: () => undefined,
  setNumber: () => {},
  delete: () => {},
  getAllKeys: () => [],
  clearAll: () => {},
};

const databaseService = {
  initialize: () => Promise.resolve({}),
  getDatabase: () => Promise.resolve({}),
  reset: () => Promise.resolve(),
  close: () => Promise.resolve(),
  getTrips: () => Promise.resolve([]),
  createTrip: () => Promise.resolve({}),
  updateTrip: () => Promise.resolve({}),
  deleteTrip: () => Promise.resolve(),
  getTripLegs: () => Promise.resolve([]),
  createTripLeg: () => Promise.resolve({}),
  updateTripLeg: () => Promise.resolve({}),
  getQRCodes: () => Promise.resolve([]),
  saveQRCode: () => Promise.resolve({}),
  deleteQRCode: () => Promise.resolve(),
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
