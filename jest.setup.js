/* eslint-env jest */
// Basic Jest setup for TypeScript unit tests

// Mock react-native modules
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  NativeModules: {},
}));

// Mock react-native-keychain
const KeychainMock = {
  setInternetCredentials: jest.fn().mockResolvedValue(true),
  getInternetCredentials: jest.fn().mockResolvedValue({ password: '{}' }),
  resetInternetCredentials: jest.fn().mockResolvedValue(true),
  getSupportedBiometryType: jest.fn().mockResolvedValue('TouchID'),
  AUTHENTICATION_TYPE: {
    BIOMETRICS: 'AuthenticationWithBiometricsDevicePasscode',
  },
  ACCESS_CONTROL: {
    BIOMETRY_CURRENT_SET: 'kSecAccessControlBiometryCurrentSet',
  },
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'kSecAttrAccessibleWhenUnlockedThisDeviceOnly',
  },
};

jest.mock('react-native-keychain', () => KeychainMock);

// Mock react-native-mmkv
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    getBoolean: jest.fn(),
    getNumber: jest.fn(),
    delete: jest.fn(),
    getAllKeys: jest.fn().mockReturnValue([]),
    clearAll: jest.fn(),
  })),
}));

// Mock @nozbe/watermelondb
jest.mock('@nozbe/watermelondb', () => ({
  Database: jest.fn().mockImplementation(() => ({
    collections: {
      get: jest.fn().mockReturnValue({
        query: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue([]),
          where: jest.fn().mockReturnThis(),
        }),
        create: jest.fn().mockResolvedValue({}),
        find: jest.fn().mockResolvedValue({
          update: jest.fn().mockResolvedValue({}),
          markAsDeleted: jest.fn().mockResolvedValue({}),
        }),
      }),
    },
    write: jest.fn().mockImplementation((fn) => fn()),
    unsafeResetDatabase: jest.fn().mockResolvedValue(undefined),
  })),
  Model: class MockModel {
    constructor() {
      this.id = 'mock-id';
    }
    static table = 'mock_table';
  },
  appSchema: jest.fn(),
  tableSchema: jest.fn(),
  field: () => () => {},
  date: () => () => {},
  readonly: () => () => {},
}));

jest.mock('@nozbe/watermelondb/adapters/sqlite', () => jest.fn());
jest.mock('@nozbe/watermelondb/Schema/migrations', () => ({
  schemaMigrations: jest.fn(),
  createTable: jest.fn(),
}));

// Mock our storage services to avoid import issues
jest.mock('@/services/storage/database', () => ({
  databaseService: {
    initialize: jest.fn().mockResolvedValue({}),
    getTrips: jest.fn().mockResolvedValue([]),
    createTrip: jest.fn().mockResolvedValue({ id: 'mock-trip-id' }),
    updateTrip: jest.fn().mockResolvedValue({}),
    deleteTrip: jest.fn().mockResolvedValue({}),
    getTripLegs: jest.fn().mockResolvedValue([]),
    createTripLeg: jest.fn().mockResolvedValue({ id: 'mock-leg-id' }),
    updateTripLeg: jest.fn().mockResolvedValue({}),
    getQRCodes: jest.fn().mockResolvedValue([]),
    saveQRCode: jest.fn().mockResolvedValue({ id: 'mock-qr-id' }),
    deleteQRCode: jest.fn().mockResolvedValue({}),
    reset: jest.fn().mockResolvedValue({}),
    close: jest.fn().mockResolvedValue({}),
  },
}));

// Mock the entire storage module to prevent model imports
jest.mock('@/services/storage', () => ({
  keychainService: {
    storeProfile: jest.fn().mockResolvedValue(undefined),
    getProfile: jest.fn().mockResolvedValue(null),
    deleteProfile: jest.fn().mockResolvedValue(undefined),
    generateEncryptionKey: jest.fn().mockResolvedValue('mock-key'),
    getEncryptionKey: jest.fn().mockResolvedValue('mock-key'),
    isAvailable: jest.fn().mockResolvedValue(true),
  },
  mmkvService: {
    getPreferences: jest.fn().mockReturnValue({
      theme: 'auto',
      language: 'en',
      onboardingComplete: false,
      biometricEnabled: false,
      lastSchemaUpdateCheck: '',
      analyticsEnabled: false,
      crashReportingEnabled: false,
    }),
    setPreference: jest.fn(),
    clearPreferences: jest.fn(),
    getFeatureFlag: jest.fn().mockReturnValue(false),
    setFeatureFlag: jest.fn(),
    getCacheItem: jest.fn().mockReturnValue(null),
    setCacheItem: jest.fn(),
    clearCache: jest.fn(),
    getString: jest.fn(),
    setString: jest.fn(),
    getBoolean: jest.fn(),
    setBoolean: jest.fn(),
    getNumber: jest.fn(),
    setNumber: jest.fn(),
    delete: jest.fn(),
    getAllKeys: jest.fn().mockReturnValue([]),
    clearAll: jest.fn(),
  },
  databaseService: {
    initialize: jest.fn().mockResolvedValue({}),
    getTrips: jest.fn().mockResolvedValue([]),
    createTrip: jest.fn().mockResolvedValue({ id: 'mock-trip-id' }),
    updateTrip: jest.fn().mockResolvedValue({}),
    deleteTrip: jest.fn().mockResolvedValue({}),
    getTripLegs: jest.fn().mockResolvedValue([]),
    createTripLeg: jest.fn().mockResolvedValue({ id: 'mock-leg-id' }),
    updateTripLeg: jest.fn().mockResolvedValue({}),
    getQRCodes: jest.fn().mockResolvedValue([]),
    saveQRCode: jest.fn().mockResolvedValue({ id: 'mock-qr-id' }),
    deleteQRCode: jest.fn().mockResolvedValue({}),
    reset: jest.fn().mockResolvedValue({}),
    close: jest.fn().mockResolvedValue({}),
  },
}));
